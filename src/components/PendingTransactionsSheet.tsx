import { useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CategorySelector } from './CategorySelector';
import { PendingTransaction } from '@/hooks/usePendingTransactions';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';
import { formatCurrencyCompact } from '@/lib/budget';
import { Check, EyeOff, ChevronsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingTransactionsSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pending: PendingTransaction[];
  categories: ExpenseCategory[];
  parentCategories: ExpenseCategory[];
  subcategoriesOf: (parentId: string) => ExpenseCategory[];
  onValidate: (txId: string, category: string, subcategory?: string) => Promise<void>;
  onIgnore: (txId: string) => Promise<void>;
}

interface TxRowState {
  category?: string;
  subcategory?: string;
  saving: boolean;
}

export function PendingTransactionsSheet({
  open,
  onOpenChange,
  pending,
  categories,
  parentCategories,
  subcategoriesOf,
  onValidate,
  onIgnore,
}: PendingTransactionsSheetProps) {
  const [rows, setRows] = useState<Record<string, TxRowState>>({});

  const getRow = (id: string): TxRowState =>
    rows[id] ?? { saving: false };

  const setRow = (id: string, patch: Partial<TxRowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...getRow(id), ...patch } }));

  const handleValidate = async (tx: PendingTransaction) => {
    const row = getRow(tx.id);
    const cat = row.category || tx.suggestedCategory || '';
    if (!cat) return;
    setRow(tx.id, { saving: true });
    await onValidate(tx.id, cat, row.subcategory || tx.suggestedSubcategory);
    setRow(tx.id, { saving: false });
  };

  const handleIgnore = async (tx: PendingTransaction) => {
    setRow(tx.id, { saving: true });
    await onIgnore(tx.id);
    setRow(tx.id, { saving: false });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[92vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="pb-3 shrink-0">
          <SheetTitle className="font-display text-xl flex items-center gap-2">
            🏦 Transactions à catégoriser
            {pending.length > 0 && (
              <span className="ml-1 h-6 min-w-6 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                {pending.length}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Assignez chaque transaction bancaire à une catégorie.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          {pending.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <span className="text-5xl">✅</span>
              <p className="text-sm font-semibold text-foreground">Tout est à jour !</p>
              <p className="text-xs text-muted-foreground">
                Aucune transaction en attente de catégorisation.
              </p>
            </div>
          ) : (
            pending.map((tx) => {
              const row = getRow(tx.id);
              const effectiveCat = row.category ?? tx.suggestedCategory;
              const effectiveSub = row.subcategory ?? tx.suggestedSubcategory;
              const canValidate = !!effectiveCat;
              const dateLabel = (() => {
                try {
                  return format(parseISO(tx.transactionDate), 'd MMM yyyy', { locale: fr });
                } catch {
                  return tx.transactionDate;
                }
              })();

              return (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-border/50 bg-card overflow-hidden"
                >
                  {/* Transaction header */}
                  <div className="flex items-start gap-3 px-4 pt-3 pb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">
                        {tx.description || 'Transaction'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{dateLabel}</p>
                    </div>
                    <span className="text-base font-display font-bold text-budget-danger tabular-nums shrink-0">
                      -{formatCurrencyCompact(tx.amount)}
                    </span>
                  </div>

                  {/* Category selector */}
                  <div className="px-4 pb-2">
                    {tx.suggestedCategory && !row.category && (
                      <div className="flex items-center gap-1.5 mb-2 text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1.5">
                        <span>💡</span>
                        <span>Suggestion : <strong>{tx.suggestedCategory}</strong>
                          {tx.suggestedSubcategory && ` › ${tx.suggestedSubcategory}`}
                        </span>
                      </div>
                    )}
                    <CategorySelector
                      categories={categories}
                      parentCategories={parentCategories}
                      subcategoriesOf={subcategoriesOf}
                      selectedCategory={effectiveCat}
                      selectedSubcategory={effectiveSub}
                      onSelectCategory={(cat, sub) => setRow(tx.id, { category: cat, subcategory: sub })}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 px-4 pb-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-none h-9 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => handleIgnore(tx)}
                      disabled={row.saving}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Ignorer
                    </Button>
                    <Button
                      size="sm"
                      className={cn(
                        'flex-1 h-9 gap-1.5 font-semibold transition-all',
                        !canValidate && 'opacity-40',
                      )}
                      onClick={() => handleValidate(tx)}
                      disabled={!canValidate || row.saving}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {row.saving ? 'Enregistrement…' : 'Valider'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {/* Validate all with same category — quick bulk action */}
          {pending.length > 2 && (
            <div className="rounded-2xl border border-dashed border-border/50 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">
                <ChevronsDown className="w-3.5 h-3.5 inline mr-1" />
                Validez chaque transaction une par une pour un suivi précis.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
