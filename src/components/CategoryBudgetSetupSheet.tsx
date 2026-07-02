import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CategoryBudgetConfig,
  BudgetType,
  PRESET_COLORS,
  CATEGORY_GROUPS,
  useCategoryBudgets,
} from '@/hooks/useCategoryBudgets';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';
import { Lock, SlidersHorizontal, Infinity, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CategoryBudgetSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  configs: CategoryBudgetConfig[];
  onSaveConfig: (
    categoryName: string,
    updates: Partial<Omit<CategoryBudgetConfig, 'id' | 'categoryName'>>
  ) => Promise<void>;
}

interface RowState {
  budgetType: BudgetType;
  capAmount: string;
  warningThreshold: number;
  color: string;
  groupName: string;
  expanded: boolean;
  dirty: boolean;
}

const TYPE_META = {
  uncapped: {
    label: 'Sans plafond',
    sublabel: 'Dépense libre, pas de limite',
    icon: Infinity,
    cls: 'bg-muted border-transparent text-muted-foreground',
    activeCls: 'bg-slate-700 border-slate-500 text-white',
  },
  variable: {
    label: 'Variable',
    sublabel: 'Objectif flexible à ne pas dépasser',
    icon: SlidersHorizontal,
    cls: 'bg-muted border-transparent text-muted-foreground',
    activeCls: 'bg-violet-900 border-violet-500 text-violet-100',
  },
  fixed: {
    label: 'Fixe',
    sublabel: 'Plafond strict (dépense récurrente)',
    icon: Lock,
    cls: 'bg-muted border-transparent text-muted-foreground',
    activeCls: 'bg-blue-900 border-blue-500 text-blue-100',
  },
};

export function CategoryBudgetSetupSheet({
  open,
  onOpenChange,
  categories,
  configs,
  onSaveConfig,
}: CategoryBudgetSetupSheetProps) {
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Initialise local state from configs
  useEffect(() => {
    const initial: Record<string, RowState> = {};
    for (const cat of categories) {
      const cfg = configs.find((c) => c.categoryName === cat.name);
      initial[cat.name] = {
        budgetType: cfg?.budgetType ?? 'uncapped',
        capAmount: cfg?.capAmount != null ? String(cfg.capAmount) : '',
        warningThreshold: cfg?.warningThreshold ?? 80,
        color: cfg?.color ?? PRESET_COLORS[0],
        groupName: cfg?.groupName ?? '',
        expanded: false,
        dirty: false,
      };
    }
    setRows(initial);
  }, [categories, configs, open]);

  const update = (catName: string, patch: Partial<RowState>) => {
    setRows((prev) => ({
      ...prev,
      [catName]: { ...prev[catName], ...patch, dirty: true },
    }));
  };

  const handleSave = async (cat: ExpenseCategory) => {
    const row = rows[cat.name];
    if (!row) return;
    setSaving(cat.name);
    try {
      const capVal =
        row.budgetType !== 'uncapped' && row.capAmount
          ? parseFloat(row.capAmount)
          : undefined;

      await onSaveConfig(cat.name, {
        budgetType: row.budgetType,
        capAmount: capVal,
        warningThreshold: row.warningThreshold,
        color: row.color,
        groupName: row.groupName || undefined,
      });

      setRows((prev) => ({
        ...prev,
        [cat.name]: { ...prev[cat.name], dirty: false },
      }));
      toast.success(`Plafond "${cat.name}" enregistré`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[92vh] flex flex-col"
      >
        <SheetHeader className="pb-2 shrink-0">
          <SheetTitle className="font-display text-xl flex items-center gap-2">
            🎯 Configurer les plafonds
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Définissez un type et un montant limite pour chaque catégorie.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {categories.map((cat) => {
            const row = rows[cat.name];
            if (!row) return null;
            const isSaving = saving === cat.name;

            return (
              <div
                key={cat.name}
                className={cn(
                  'rounded-2xl border transition-all',
                  row.expanded
                    ? 'border-primary/40 bg-card shadow-md'
                    : 'border-border/50 bg-card/60'
                )}
              >
                {/* Header row */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() =>
                    setRows((prev) => ({
                      ...prev,
                      [cat.name]: { ...prev[cat.name], expanded: !prev[cat.name].expanded },
                    }))
                  }
                >
                  {/* Color dot */}
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border-2 border-white/20"
                    style={{ background: row.color }}
                  />
                  <span className="text-xl shrink-0">{cat.emoji}</span>
                  <span className="flex-1 text-sm font-semibold truncate">{cat.name}</span>

                  {/* Type badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] font-bold uppercase shrink-0 border',
                      row.budgetType === 'fixed'
                        ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                        : row.budgetType === 'variable'
                        ? 'border-violet-500/50 text-violet-400 bg-violet-500/10'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {row.budgetType === 'uncapped'
                      ? 'Libre'
                      : row.budgetType === 'fixed'
                      ? 'Fixe'
                      : 'Variable'}
                    {row.capAmount && row.budgetType !== 'uncapped'
                      ? ` · ${row.capAmount} €`
                      : ''}
                  </Badge>

                  {row.dirty && (
                    <span className="w-2 h-2 rounded-full bg-budget-warning shrink-0 animate-pulse" />
                  )}
                  {row.expanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Expanded settings */}
                {row.expanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">
                    {/* Budget type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Type de budget
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(Object.keys(TYPE_META) as BudgetType[]).map((type) => {
                          const meta = TYPE_META[type];
                          const Icon = meta.icon;
                          const isActive = row.budgetType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => update(cat.name, { budgetType: type })}
                              className={cn(
                                'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all',
                                isActive ? meta.activeCls : meta.cls
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase leading-none">
                                {meta.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cap amount */}
                    {row.budgetType !== 'uncapped' && (
                      <div className="space-y-1.5">
                        <Label htmlFor={`cap-${cat.name}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Plafond mensuel (€)
                        </Label>
                        <div className="relative">
                          <Input
                            id={`cap-${cat.name}`}
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Ex : 300"
                            value={row.capAmount}
                            onChange={(e) =>
                              update(cat.name, { capAmount: e.target.value })
                            }
                            className="h-11 pr-8 text-base font-semibold"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                            €
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Warning threshold */}
                    {row.budgetType !== 'uncapped' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Alerte à
                          </Label>
                          <span className="text-sm font-bold text-budget-warning">
                            {row.warningThreshold}%
                          </span>
                        </div>
                        <Slider
                          value={[row.warningThreshold]}
                          min={50}
                          max={95}
                          step={5}
                          onValueChange={([v]) =>
                            update(cat.name, { warningThreshold: v })
                          }
                          className="w-full"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Une alerte s'affichera quand le plafond est atteint à{' '}
                          {row.warningThreshold}%.
                        </p>
                      </div>
                    )}

                    {/* Color picker */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Couleur
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => update(cat.name, { color: c })}
                            className={cn(
                              'w-7 h-7 rounded-full border-2 transition-transform',
                              row.color === c
                                ? 'border-white scale-125'
                                : 'border-transparent hover:scale-110'
                            )}
                            style={{ background: c }}
                          >
                            {row.color === c && (
                              <Check className="w-3 h-3 text-white mx-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Group */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Groupe (optionnel)
                      </Label>
                      <Select
                        value={row.groupName || '_none'}
                        onValueChange={(v) =>
                          update(cat.name, { groupName: v === '_none' ? '' : v })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Aucun groupe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Aucun groupe</SelectItem>
                          {CATEGORY_GROUPS.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Save button */}
                    <Button
                      size="sm"
                      className="w-full h-10 font-semibold"
                      onClick={() => handleSave(cat)}
                      disabled={isSaving || !row.dirty}
                    >
                      {isSaving ? (
                        'Enregistrement...'
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1.5" />
                          Enregistrer
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
