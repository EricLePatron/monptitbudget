import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';
import { CategoryBudgetConfig, BudgetType, CategorySpending, PRESET_COLORS } from '@/hooks/useCategoryBudgets';
import { Lock, SlidersHorizontal, Infinity, Trash2, Plus, Check, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyCompact } from '@/lib/budget';
import { toast } from 'sonner';

const EMOJI_OPTIONS = [
  '🏠','🛒','👶','🚗','📺','🍝','🧾','📦','🏦','🛡️','🏡','💧','⚡',
  '🔥','🔔','🧹','🥩','🥖','💊','🎠','👕','👨‍⚕️','🚙','⛽','🛣️','📡',
  '🎬','🍽️','🏖️','🏛️','☕','🎁','💶','🧸','🏋️','✈️','🎮','📱','🌿',
];

interface CategoryMergedSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category: ExpenseCategory;
  subcategories: ExpenseCategory[];
  spending?: CategorySpending;
  config?: CategoryBudgetConfig | null;
  onUpdateCategory: (id: string, name: string, emoji: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onAddSubcategory: (parentId: string, name: string, emoji: string) => Promise<void>;
  onSaveConfig: (
    categoryName: string,
    updates: Partial<Omit<CategoryBudgetConfig, 'id' | 'categoryName'>>
  ) => Promise<void>;
}

export function CategoryMergedSheet({
  open,
  onOpenChange,
  category,
  subcategories,
  spending,
  config,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onSaveConfig,
}: CategoryMergedSheetProps) {
  // Name / emoji edit
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(category.name);
  const [draftEmoji, setDraftEmoji] = useState(category.emoji);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Budget config
  const [budgetType, setBudgetType] = useState<BudgetType>(config?.budgetType ?? 'uncapped');
  const [capAmount, setCapAmount] = useState(config?.capAmount != null ? String(config.capAmount) : '');
  const [warningThreshold, setWarningThreshold] = useState(config?.warningThreshold ?? 75);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);

  // Subcategory add
  const [addingSubName, setAddingSubName] = useState('');
  const [addingSubEmoji, setAddingSubEmoji] = useState('📦');
  const [showSubForm, setShowSubForm] = useState(false);
  const [savingSub, setSavingSub] = useState(false);

  // Edit subcategory
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubEmoji, setEditSubEmoji] = useState('');

  // Reset when category changes or sheet opens
  useEffect(() => {
    if (open) {
      setDraftName(category.name);
      setDraftEmoji(category.emoji);
      setEditingName(false);
      setShowEmojiPicker(false);
      setBudgetType(config?.budgetType ?? 'uncapped');
      setCapAmount(config?.capAmount != null ? String(config.capAmount) : '');
      setWarningThreshold(config?.warningThreshold ?? 75);
      setConfigDirty(false);
      setShowSubForm(false);
      setEditingSubId(null);
    }
  }, [open, category, config]);

  const handleSaveName = async () => {
    if (!draftName.trim()) return;
    setSavingName(true);
    try {
      await onUpdateCategory(category.id, draftName.trim(), draftEmoji);
      setEditingName(false);
      setShowEmojiPicker(false);
      toast.success('Catégorie mise à jour');
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const cap = budgetType !== 'uncapped' && capAmount ? parseFloat(capAmount) : undefined;
      await onSaveConfig(category.name, {
        budgetType,
        capAmount: cap,
        warningThreshold,
      });
      setConfigDirty(false);
      toast.success('Plafond enregistré');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTypeChange = (t: BudgetType) => {
    setBudgetType(t);
    setConfigDirty(true);
  };

  const handleDeleteCategory = async () => {
    const msg = subcategories.length > 0
      ? `Supprimer "${category.name}" et ses ${subcategories.length} sous-catégorie(s) ?`
      : `Supprimer "${category.name}" ?`;
    if (!window.confirm(msg)) return;
    await onDeleteCategory(category.id);
    onOpenChange(false);
  };

  const handleAddSub = async () => {
    if (!addingSubName.trim()) return;
    setSavingSub(true);
    try {
      await onAddSubcategory(category.id, addingSubName.trim(), addingSubEmoji);
      setAddingSubName('');
      setAddingSubEmoji('📦');
      setShowSubForm(false);
    } finally {
      setSavingSub(false);
    }
  };

  const handleSaveSub = async (sub: ExpenseCategory) => {
    await onUpdateCategory(sub.id, editSubName.trim() || sub.name, editSubEmoji || sub.emoji);
    setEditingSubId(null);
  };

  const pct = Math.min(100, spending?.percentage ?? 0);
  const status = spending?.status ?? 'uncapped';
  const isExceeded = status === 'exceeded';
  const isWarning = status === 'warning';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[92vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
      >
        {/* Header — emoji + name */}
        <SheetHeader className="pb-3 shrink-0">
          {editingName ? (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0 hover:bg-muted/80 transition-colors"
                >
                  {draftEmoji}
                </button>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="h-11 text-base font-semibold flex-1"
                  placeholder="Nom de la catégorie"
                  maxLength={30}
                  autoFocus
                />
                <Button
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={handleSaveName}
                  disabled={savingName || !draftName.trim()}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 shrink-0"
                  onClick={() => { setEditingName(false); setDraftName(category.name); setDraftEmoji(category.emoji); setShowEmojiPicker(false); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-xl">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setDraftEmoji(e)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all',
                        draftEmoji === e ? 'bg-primary/20 scale-110 border border-primary/50' : 'hover:bg-muted border border-transparent',
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-3xl shrink-0">{category.emoji}</span>
              <SheetTitle className="font-display text-xl flex-1 text-left">{category.name}</SheetTitle>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-0.5">

          {/* Spending summary */}
          {spending && status !== 'uncapped' && config?.capAmount && (
            <div className={cn(
              'rounded-2xl px-4 py-3 border',
              isExceeded ? 'bg-budget-danger-soft border-budget-danger/30' : isWarning ? 'bg-budget-warning-soft border-budget-warning/30' : 'bg-budget-ok-soft border-budget-ok/20',
            )}>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className={cn(
                  'font-bold tabular-nums font-display',
                  isExceeded ? 'text-budget-danger' : isWarning ? 'text-budget-warning' : 'text-budget-ok',
                )}>
                  {formatCurrencyCompact(spending.spent)}
                </span>
                <span className="text-muted-foreground text-xs">/ {formatCurrencyCompact(config.capAmount)}</span>
                <span className={cn(
                  'font-bold tabular-nums text-xs',
                  isExceeded ? 'text-budget-danger' : isWarning ? 'text-budget-warning' : 'text-budget-ok',
                )}>
                  {Math.round(pct)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', isExceeded ? 'bg-budget-danger' : isWarning ? 'bg-budget-warning' : 'bg-budget-ok')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className={cn('text-[11px] mt-1.5 font-medium', isExceeded ? 'text-budget-danger' : 'text-muted-foreground')}>
                {isExceeded
                  ? `🚨 Dépassé de ${formatCurrencyCompact(Math.abs(spending.remaining ?? 0))}`
                  : spending.remaining !== undefined
                  ? `${formatCurrencyCompact(spending.remaining)} restants ce mois`
                  : ''}
              </p>
            </div>
          )}

          {/* Budget type */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Type de budget</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { type: 'uncapped' as BudgetType, icon: Infinity, label: 'Libre', sublabel: 'Aucune limite', activeCls: 'bg-muted border-border text-foreground' },
                { type: 'variable' as BudgetType, icon: SlidersHorizontal, label: 'Variable', sublabel: 'Objectif souple', activeCls: 'bg-violet-900/60 border-violet-500 text-violet-100' },
                { type: 'fixed' as BudgetType, icon: Lock, label: 'Fixe', sublabel: 'Plafond strict', activeCls: 'bg-blue-900/60 border-blue-500 text-blue-100' },
              ] as const).map(({ type, icon: Icon, label, sublabel, activeCls }) => {
                const isActive = budgetType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border-2 transition-all active:scale-95',
                      isActive ? activeCls : 'bg-muted/40 border-transparent text-muted-foreground hover:border-border',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-bold leading-none">{label}</span>
                    <span className="text-[9px] leading-none opacity-70 text-center">{sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cap amount — only if capped */}
          {budgetType !== 'uncapped' && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Plafond mensuel</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Ex : 300"
                    value={capAmount}
                    onChange={(e) => { setCapAmount(e.target.value); setConfigDirty(true); }}
                    className="h-12 pr-8 text-xl font-display font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
                </div>
              </div>

              {/* Advanced toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {showAdvanced ? '▲' : '▼'} Options avancées
              </button>

              {showAdvanced && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Alerte à</span>
                    <span className="text-xs font-bold text-budget-warning">{warningThreshold}%</span>
                  </div>
                  <Slider
                    value={[warningThreshold]}
                    min={50}
                    max={95}
                    step={5}
                    onValueChange={([v]) => { setWarningThreshold(v); setConfigDirty(true); }}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Alerte visuelle quand le plafond est atteint à {warningThreshold}%.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Save config button */}
          {configDirty && (
            <Button
              className="w-full h-12 font-semibold animate-fade-in-up"
              onClick={handleSaveConfig}
              disabled={savingConfig}
            >
              <Check className="w-4 h-4 mr-2" />
              {savingConfig ? 'Enregistrement...' : 'Enregistrer le budget'}
            </Button>
          )}

          {/* Subcategories */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Sous-catégories</p>

            <div className="flex flex-wrap gap-1.5">
              {subcategories.map((sub) => (
                editingSubId === sub.id ? (
                  <div key={sub.id} className="flex items-center gap-1 w-full">
                    <button
                      type="button"
                      className="text-lg shrink-0"
                      onClick={() => setEditSubEmoji(EMOJI_OPTIONS[(EMOJI_OPTIONS.indexOf(editSubEmoji) + 1) % EMOJI_OPTIONS.length])}
                    >
                      {editSubEmoji}
                    </button>
                    <Input
                      value={editSubName}
                      onChange={(e) => setEditSubName(e.target.value)}
                      className="h-8 flex-1 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveSub(sub)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/25"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSubId(null)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div key={sub.id} className="flex items-center gap-0.5 h-8 pl-2 pr-1 rounded-full bg-muted border border-transparent text-xs font-semibold">
                    <span>{sub.emoji}</span>
                    <span className="ml-1 text-foreground/80">{sub.name}</span>
                    <button
                      type="button"
                      onClick={() => { setEditingSubId(sub.id); setEditSubName(sub.name); setEditSubEmoji(sub.emoji); }}
                      className="ml-1 h-5 w-5 flex items-center justify-center rounded-full hover:bg-background/50 text-muted-foreground"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(sub.id)}
                      className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )
              ))}

              {/* Add subcategory */}
              {showSubForm ? (
                <div className="flex items-center gap-1.5 w-full mt-1">
                  <button
                    type="button"
                    className="text-xl shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-muted"
                    onClick={() => setAddingSubEmoji(EMOJI_OPTIONS[(EMOJI_OPTIONS.indexOf(addingSubEmoji) + 1) % EMOJI_OPTIONS.length])}
                  >
                    {addingSubEmoji}
                  </button>
                  <Input
                    value={addingSubName}
                    onChange={(e) => setAddingSubName(e.target.value)}
                    placeholder="Nom…"
                    className="h-9 flex-1 text-sm"
                    maxLength={30}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSub(); if (e.key === 'Escape') setShowSubForm(false); }}
                  />
                  <Button size="sm" className="h-9 px-3 shrink-0" onClick={handleAddSub} disabled={savingSub || !addingSubName.trim()}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={() => setShowSubForm(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubForm(true)}
                  className="h-8 px-3 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Ajouter
                </button>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="pt-2 pb-4">
            <button
              type="button"
              onClick={handleDeleteCategory}
              className="w-full h-11 rounded-2xl border border-destructive/20 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer cette catégorie
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
