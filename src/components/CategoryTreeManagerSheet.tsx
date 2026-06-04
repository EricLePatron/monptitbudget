import { useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X,
} from 'lucide-react';

import { ExpenseCategory, useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useCategoryBudgets } from '@/hooks/useCategoryBudgets';

import { formatCurrencyCompact } from '@/lib/budget';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EMOJI_OPTIONS = [
  '🏠','🛒','👶','🚗','📺','🍝','🧾','📦','🏦','🛡️','🏡','💧','⚡',
  '🔥','🔔','🧹','🥩','🥖','💊','🎠','👕','👨‍⚕️','🚙','⛽','🛣️','📡',
  '🎬','🍽️','🏖️','🏛️','☕','🎁','💶','🧸','🏋️','✈️','🎮','📱','🌿',
];

interface InlineEditProps {
  initialName: string;
  initialEmoji: string;
  initialCap?: number;
  /** Show plafond toggle for subcategories (and root cats if desired) */
  showCap?: boolean;
  onSave: (name: string, emoji: string, cap?: number) => void;
  onCancel: () => void;
}

function InlineEdit({
  initialName, initialEmoji, initialCap,
  showCap = false, onSave, onCancel,
}: InlineEditProps) {
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [capEnabled, setCapEnabled] = useState(initialCap != null);
  const [capValue, setCapValue] = useState<string>(initialCap != null ? String(initialCap) : '');

  const handleSave = () => {
    if (!name.trim()) return;
    let cap: number | undefined = undefined;
    if (showCap && capEnabled) {
      const v = parseFloat(capValue);
      if (!isNaN(v) && v > 0) cap = v;
    }
    onSave(name.trim(), emoji, cap);
  };

  return (
    <div className="mt-2 space-y-3 bg-muted/30 rounded-xl p-3 border border-border/60">
      <div className="flex gap-2">
        <span className="w-10 h-10 flex items-center justify-center text-xl bg-card rounded-lg border">
          {emoji}
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 flex-1"
          placeholder="Nom…"
          maxLength={40}
          autoFocus
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EMOJI_OPTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={cn(
              'w-8 h-8 rounded-lg text-lg flex items-center justify-center border transition-all',
              emoji === e ? 'border-primary bg-primary/10 scale-110' : 'border-transparent hover:border-border hover:bg-muted',
            )}
          >
            {e}
          </button>
        ))}
      </div>

      {showCap && (
        <div className="rounded-xl bg-card/60 border border-border/40 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="cap-toggle" className="text-xs font-semibold text-foreground cursor-pointer flex-1">
              💰 Plafond mensuel
              <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                Active une alerte quand tu dépasses le montant
              </span>
            </Label>
            <Switch id="cap-toggle" checked={capEnabled} onCheckedChange={setCapEnabled} />
          </div>
          {capEnabled && (
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                value={capValue}
                onChange={(e) => setCapValue(e.target.value)}
                placeholder="0"
                className="h-10 pr-8 text-base font-semibold"
                min="0"
                step="1"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1 h-9" onClick={handleSave} disabled={!name.trim()}>
          <Check className="w-3.5 h-3.5 mr-1" /> Enregistrer
        </Button>
        <Button size="sm" variant="ghost" className="h-9" onClick={onCancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface CategoryTreeManagerSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accountId: string | null;
}

export function CategoryTreeManagerSheet({ open, onOpenChange, accountId }: CategoryTreeManagerSheetProps) {
  const {
    parentCategories,
    subcategoriesOf,
    addCategory,
    addSubcategory,
    updateCategory,
    deleteCategory,
  } = useExpenseCategories(accountId);

  const {
    configs,
    saveConfig,
  } = useCategoryBudgets(accountId, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [addingParent, setAddingParent] = useState(false);
  

  const capFor = (name: string): number | undefined => {
    const cfg = configs.find((c) =>
      c.categoryName === name &&
      c.month === undefined &&
      c.year === undefined &&
      c.budgetType === 'fixed' &&
      c.capAmount,
    );
    return cfg?.capAmount;
  };

  const toggleExpand = (id: string) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const persistCap = async (name: string, cap?: number) => {
    if (cap != null && cap > 0) {
      await saveConfig(name, { budgetType: 'fixed', capAmount: cap });
    } else {
      await saveConfig(name, { budgetType: 'uncapped', capAmount: undefined });
    }
  };

  const handleDelete = async (cat: ExpenseCategory) => {
    const subs = subcategoriesOf(cat.id);
    const msg = subs.length > 0
      ? `Supprimer "${cat.name}" et ses ${subs.length} sous-catégorie(s) ?`
      : `Supprimer "${cat.name}" ?`;
    if (!window.confirm(msg)) return;
    await deleteCategory(cat.id);
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pb-3 shrink-0">
          <SheetTitle className="font-display text-xl flex items-center gap-2">
            🗂️ Catégories & Sous-catégories
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Organise tes dépenses. Active un plafond mensuel pour suivre une enveloppe.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">



          {parentCategories.map((parent) => {
            const subs = subcategoriesOf(parent.id);
            const isExpanded = expanded[parent.id];
            const isEditing = editing === parent.id;
            const isAddingSub = addingSubTo === parent.id;

            return (
              <div key={parent.id} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                {/* Parent row */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button type="button" onClick={() => toggleExpand(parent.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <span className="text-xl shrink-0">{parent.emoji}</span>
                  <span className="flex-1 text-sm font-semibold">{parent.name}</span>
                  {subs.length > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {subs.length}
                    </span>
                  )}
                  <button type="button" onClick={() => setEditing(isEditing ? null : parent.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(parent)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isEditing && (
                  <div className="px-3 pb-3">
                    <InlineEdit
                      initialName={parent.name}
                      initialEmoji={parent.emoji}
                      initialCap={capFor(parent.name)}
                      showCap
                      onSave={async (n, e, cap) => {
                        await updateCategory(parent.id, n, e);
                        await persistCap(n, cap);
                        setEditing(null);
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                )}

                {/* Subcategories */}
                {isExpanded && (
                  <div className="border-t border-border/40 bg-muted/20">
                    {subs.map((sub) => {
                      const cap = capFor(sub.name);
                      return (
                        <div key={sub.id}>
                          <div className="flex items-center gap-2 px-4 py-2 pl-10">
                            <span className="text-base shrink-0">{sub.emoji}</span>
                            <span className="flex-1 text-xs font-medium text-foreground/80 truncate">{sub.name}</span>
                            {cap != null && (
                              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                {formatCurrencyCompact(cap)}
                              </span>
                            )}
                            <button type="button" onClick={() => setEditing(editing === sub.id ? null : sub.id)}
                              className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => deleteCategory(sub.id)}
                              className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {editing === sub.id && (
                            <div className="px-4 pb-2 pl-10">
                              <InlineEdit
                                initialName={sub.name}
                                initialEmoji={sub.emoji}
                                initialCap={cap}
                                showCap
                                onSave={async (n, e, c) => {
                                  await updateCategory(sub.id, n, e);
                                  await persistCap(n, c);
                                  setEditing(null);
                                }}
                                onCancel={() => setEditing(null)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add subcategory */}
                    {isAddingSub ? (
                      <div className="px-4 pb-3 pl-10">
                        <InlineEdit
                          initialName=""
                          initialEmoji="📦"
                          showCap
                          onSave={async (n, e, c) => {
                            const created = await addSubcategory(parent.id, n, e);
                            if (created) await persistCap(n, c);
                            setAddingSubTo(null);
                          }}
                          onCancel={() => setAddingSubTo(null)}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setAddingSubTo(parent.id); setExpanded((p) => ({ ...p, [parent.id]: true })); }}
                        className="w-full flex items-center gap-2 px-4 pl-10 py-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ajouter une sous-catégorie
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add parent category */}
          {addingParent ? (
            <div className="rounded-2xl border border-primary/40 bg-card p-3">
              <InlineEdit
                initialName=""
                initialEmoji="📦"
                showCap
                onSave={async (n, e, c) => {
                  const created = await addCategory(n, e);
                  if (created) await persistCap(n, c);
                  setAddingParent(false);
                }}
                onCancel={() => setAddingParent(false)}
              />
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-11 border-dashed border-2 gap-2 text-sm font-medium"
              onClick={() => setAddingParent(true)}
            >
              <Plus className="w-4 h-4" />
              Nouvelle catégorie
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
