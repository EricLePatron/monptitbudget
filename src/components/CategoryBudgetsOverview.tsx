import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CategoryBudgetCard } from './CategoryBudgetCard';
import { CategoryBudgetSetupSheet } from './CategoryBudgetSetupSheet';
import { CategorySpending, CategoryBudgetConfig } from '@/hooks/useCategoryBudgets';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';
import { Settings2, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrencyCompact } from '@/lib/budget';
import { cn } from '@/lib/utils';

interface CategoryBudgetsOverviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorySpending: CategorySpending[];
  categories: ExpenseCategory[];
  configs: CategoryBudgetConfig[];
  onSaveConfig: (
    categoryName: string,
    updates: Partial<Omit<CategoryBudgetConfig, 'id' | 'categoryName'>>
  ) => Promise<void>;
}

/** Map category name → emoji */
function buildEmojiMap(categories: ExpenseCategory[]): Record<string, string> {
  return Object.fromEntries(categories.map((c) => [c.name, c.emoji]));
}

export function CategoryBudgetsOverview({
  open,
  onOpenChange,
  categorySpending,
  categories,
  configs,
  onSaveConfig,
}: CategoryBudgetsOverviewProps) {
  const [setupOpen, setSetupOpen] = useState(false);

  const emojiMap = buildEmojiMap(categories);

  // Split into capped vs uncapped
  const capped = categorySpending.filter((s) => s.status !== 'uncapped');
  const uncapped = categorySpending.filter((s) => s.status === 'uncapped');

  // Summary stats
  const exceeded = capped.filter((s) => s.status === 'exceeded');
  const warning = capped.filter((s) => s.status === 'warning');
  const ok = capped.filter((s) => s.status === 'ok');

  const totalBudgeted = capped.reduce(
    (sum, s) => sum + (s.config?.capAmount ?? 0),
    0
  );
  const totalSpentCapped = capped.reduce((sum, s) => sum + s.spent, 0);
  const totalSpentAll = categorySpending.reduce((sum, s) => sum + s.spent, 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[92vh] flex flex-col gap-0"
        >
          <SheetHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-display text-xl flex items-center gap-2">
                📊 Suivi des plafonds
              </SheetTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={() => setSetupOpen(true)}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Configurer
              </Button>
            </div>
          </SheetHeader>

          {/* Summary bar */}
          {capped.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
              {/* Total budgeted vs spent */}
              <div className="col-span-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-3">
                <div className="flex items-end justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Dépenses plafonnées
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {formatCurrencyCompact(totalSpentCapped)} / {formatCurrencyCompact(totalBudgeted)}
                  </p>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      totalSpentCapped > totalBudgeted
                        ? 'bg-red-500'
                        : totalSpentCapped / totalBudgeted > 0.8
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    )}
                    style={{
                      width: `${Math.min(100, (totalSpentCapped / totalBudgeted) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Status chips */}
              {exceeded.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-red-400 font-bold uppercase">{exceeded.length} dépassé{exceeded.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
              {warning.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                  <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-amber-400 font-bold uppercase">{warning.length} en alerte</p>
                  </div>
                </div>
              )}
              {ok.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase">{ok.length} dans les limites</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {/* Empty state */}
            {categorySpending.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <p className="text-4xl">🎯</p>
                <p className="text-sm font-semibold text-foreground">Aucune catégorie configurée</p>
                <p className="text-xs text-muted-foreground">
                  Commencez par ajouter des dépenses et configurez les plafonds.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5"
                  onClick={() => setSetupOpen(true)}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Configurer les plafonds
                </Button>
              </div>
            )}

            {/* Capped categories */}
            {capped.length > 0 && (
              <div className="space-y-2">
                {capped.map((s) => (
                  <CategoryBudgetCard
                    key={s.categoryName}
                    spending={s}
                    emoji={emojiMap[s.categoryName] ?? '📦'}
                    onClick={() => setSetupOpen(true)}
                  />
                ))}
              </div>
            )}

            {/* Uncapped categories */}
            {uncapped.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Sans plafond ({formatCurrencyCompact(uncapped.reduce((s, u) => s + u.spent, 0))} dépensé)
                </p>
                {uncapped.map((s) => (
                  <CategoryBudgetCard
                    key={s.categoryName}
                    spending={s}
                    emoji={emojiMap[s.categoryName] ?? '📦'}
                    onClick={() => setSetupOpen(true)}
                  />
                ))}
              </div>
            )}

            {/* No spending yet prompt */}
            {capped.length === 0 && uncapped.length > 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-border/60 px-4 py-4 text-center space-y-2">
                <p className="text-sm font-medium text-foreground">Définissez des plafonds</p>
                <p className="text-xs text-muted-foreground">
                  Cliquez sur <strong>Configurer</strong> pour définir des limites par catégorie.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSetupOpen(true)}
                  className="gap-1.5"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Configurer les plafonds
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CategoryBudgetSetupSheet
        open={setupOpen}
        onOpenChange={setSetupOpen}
        categories={categories}
        configs={configs}
        onSaveConfig={onSaveConfig}
      />
    </>
  );
}
