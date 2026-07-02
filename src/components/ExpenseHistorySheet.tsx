import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Expense, formatCurrencyCompact, BudgetConfig } from '@/lib/budget';
import { Trash2, Pencil, X, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';

interface ExpenseHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onEditExpense: (expense: Expense) => void;
  categories: ExpenseCategory[];
  budgetConfig?: BudgetConfig | null;
  initialCategory?: string | null;
  initialSubcategory?: string | null;
}

export function ExpenseHistorySheet({
  open,
  onOpenChange,
  expenses,
  onDeleteExpense,
  onEditExpense,
  categories,
  initialCategory,
  initialSubcategory,
}: ExpenseHistorySheetProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(initialSubcategory ?? null);
  const [directDebitFilter, setDirectDebitFilter] = useState<'all' | 'only' | 'none'>('all');

  useEffect(() => {
    if (open) {
      setSelectedCategory(initialCategory ?? null);
      setSelectedSubcategory(initialSubcategory ?? null);
      setDirectDebitFilter('all');
    }
  }, [open, initialCategory, initialSubcategory]);

  const filteredExpenses = expenses.filter(e => {
    if (selectedCategory && (e.category || 'Sans catégorie') !== selectedCategory) return false;
    if (selectedSubcategory && (e.subcategory || '') !== selectedSubcategory) return false;
    if (directDebitFilter === 'only' && !e.isDirectDebit) return false;
    if (directDebitFilter === 'none' && e.isDirectDebit) return false;
    return true;
  });

  const directDebitCount = expenses.filter(e => e.isDirectDebit).length;
  const directDebitTotal = expenses.filter(e => e.isDirectDebit).reduce((s, e) => s + e.amount, 0);

  const todayStrEarly = new Date().toISOString().slice(0, 10);
  const UPCOMING_KEY = '__upcoming__';
  const groupedExpenses = filteredExpenses.reduce((acc, expense) => {
    const key = expense.isDirectDebit && expense.date > todayStrEarly ? UPCOMING_KEY : expense.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => {
    if (a === UPCOMING_KEY) return -1;
    if (b === UPCOMING_KEY) return 1;
    return b.localeCompare(a);
  });

  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Sans catégorie';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Ensure every configured parent category appears, even with 0 spend
  categories
    .filter((c) => !c.parentId)
    .forEach((c) => {
      if (categoryTotals[c.name] === undefined) categoryTotals[c.name] = 0;
    });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const maxCategoryTotal = Math.max(...Object.values(categoryTotals), 1);


  const getCategoryEmoji = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.emoji || '📦';
  };

  const getSubcategoryEmoji = (subcategoryName: string) => {
    const cat = categories.find(c => c.name === subcategoryName && c.parentId);
    return cat?.emoji || '🏷️';
  };

  // Compute subcategory totals grouped per parent category (all categories, not just selected)
  const subcategoryTotalsByCategory = expenses.reduce((acc, expense) => {
    if (!expense.subcategory) return acc;
    const cat = expense.category || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = {};
    acc[cat][expense.subcategory] = (acc[cat][expense.subcategory] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Add subcategories that have a configured cap but no expenses (so they remain visible/clickable)
  categories
    .filter((c) => !!c.parentId)
    .forEach((sub) => {
      const parent = categories.find((p) => p.id === sub.parentId);
      const parentName = parent?.name || 'Sans catégorie';
      if (!subcategoryTotalsByCategory[parentName]) subcategoryTotalsByCategory[parentName] = {};
      if (subcategoryTotalsByCategory[parentName][sub.name] === undefined) {
        subcategoryTotalsByCategory[parentName][sub.name] = 0;
      }
    });


  const todayStr = new Date().toISOString().slice(0, 10);
  const isUpcoming = (e: Expense) => e.isDirectDebit && e.date > todayStr;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(prev => {
      const next = prev === category ? null : category;
      setSelectedSubcategory(null);
      return next;
    });
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-6 pb-4 pt-[env(safe-area-inset-top,24px)] border-b border-border">
          <SheetTitle className="font-display text-xl">Historique des dépenses</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="px-4 py-5 space-y-5">
          {directDebitCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'only', 'none'] as const).map((mode) => {
                const isActive = directDebitFilter === mode;
                const label =
                  mode === 'all'
                    ? 'Tout'
                    : mode === 'only'
                    ? `🔁 Prélèvements · ${formatCurrencyCompact(directDebitTotal)}`
                    : 'Hors prélèvements';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDirectDebitFilter(mode)}
                    className={`h-7 px-3 rounded-full text-[11px] font-semibold border transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/60 text-muted-foreground border-transparent hover:border-border hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {sortedCategories.length > 0 && (
            <div className="space-y-3 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Par catégorie</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Total: {formatCurrencyCompact(totalExpenses)}
                  </span>
                  {(selectedCategory || selectedSubcategory) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10"
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedSubcategory(null);
                      }}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Effacer filtre
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {sortedCategories.map(([category, total]) => {
                  const percentage = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
                  const barWidth = (total / maxCategoryTotal) * 100;
                  const isSelected = selectedCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className={`w-full text-left space-y-1.5 p-2.5 rounded-xl transition-all duration-200 ${
                        isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-secondary/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{getCategoryEmoji(category)}</span>
                          <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground tabular-nums">{percentage}%</span>
                          <span className={`font-display font-semibold tabular-nums text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {formatCurrencyCompact(total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${isSelected ? 'bg-primary' : 'bg-primary/70'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedCategory && subcategoryTotalsByCategory[selectedCategory] && Object.keys(subcategoryTotalsByCategory[selectedCategory]).length > 0 && (
                <div className="pt-3 mt-1 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Sous-catégories · {selectedCategory}
                    </h4>
                    {selectedSubcategory && (
                      <button
                        type="button"
                        onClick={() => setSelectedSubcategory(null)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Tout afficher
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(subcategoryTotalsByCategory[selectedCategory])
                      .sort((a, b) => b[1] - a[1])
                      .map(([sub, subTotal]) => {
                        const isSubSel = selectedSubcategory === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSelectedSubcategory(isSubSel ? null : sub)}
                            className={`h-7 pl-1.5 pr-2.5 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                              isSubSel
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background/70 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                            }`}
                          >
                            <span>{getSubcategoryEmoji(sub)}</span>
                            <span>{sub}</span>
                            <span className="opacity-70 tabular-nums">· {formatCurrencyCompact(subTotal)}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}


          {sortedDates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune dépense enregistrée
            </p>
          ) : (
            sortedDates.map((date) => {
              const dayItems = groupedExpenses[date];
              const isUpcomingGroup = date === UPCOMING_KEY;
              const allUpcoming = isUpcomingGroup || dayItems.every(isUpcoming);
              const someUpcoming = isUpcomingGroup || dayItems.some(isUpcoming);
              return (
              <div key={date} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize flex items-center gap-2">
                  {!isUpcomingGroup && <span>{formatDate(date)}</span>}
                  {(isUpcomingGroup || allUpcoming || (someUpcoming && date > todayStr)) && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-budget-warning-soft text-budget-warning border border-budget-warning/30 text-[9px] font-bold normal-case tracking-normal">
                      <Clock className="w-2.5 h-2.5" />
                      À venir
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {dayItems
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((expense) => {
                      const emoji = getCategoryEmoji(expense.category || '');
                      const upcoming = isUpcoming(expense);
                      return (
                        <div
                          key={expense.id}
                          className={`group relative p-3 rounded-2xl border transition-all ${
                            upcoming
                              ? 'bg-budget-warning-soft/40 border-budget-warning/30 hover:border-budget-warning/50'
                              : 'bg-gradient-to-br from-secondary/60 to-secondary/30 border-border/50 hover:border-primary/30 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm ${
                              upcoming ? 'bg-budget-warning-soft border border-budget-warning/30' : 'bg-background/80'
                            }`}>
                              {emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground text-sm leading-snug break-words pr-1">
                                  {expense.name || 'Dépense'}
                                </p>
                                <span className={`font-display font-bold text-base tabular-nums shrink-0 ${
                                  upcoming ? 'text-budget-warning' : 'text-foreground'
                                }`}>
                                  -{formatCurrencyCompact(expense.amount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                  {expense.category && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedCategory(expense.category!);
                                        setSelectedSubcategory(null);
                                      }}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                                    >
                                      {expense.category}
                                    </button>
                                  )}
                                  {expense.subcategory && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (expense.category) setSelectedCategory(expense.category);
                                        setSelectedSubcategory(expense.subcategory!);
                                      }}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-accent/40 text-foreground/80 font-medium border border-border/60 hover:bg-accent/60 transition-colors flex items-center gap-1"
                                    >
                                      <span>{getSubcategoryEmoji(expense.subcategory)}</span>
                                      <span>{expense.subcategory}</span>
                                    </button>
                                  )}
                                  {expense.isDirectDebit && (
                                    <button
                                      type="button"
                                      onClick={() => setDirectDebitFilter(prev => prev === 'only' ? 'all' : 'only')}
                                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-colors flex items-center gap-1 ${
                                        upcoming
                                          ? 'bg-budget-warning-soft text-budget-warning border-budget-warning/40 hover:bg-budget-warning-soft/80'
                                          : 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25'
                                      }`}
                                    >
                                      <span>🔁</span>
                                      <span>{upcoming ? 'Prélèvement à venir' : 'Prélèvement'}</span>
                                    </button>
                                  )}
                                  <span className="text-[11px] text-muted-foreground">
                                    {new Date(expense.createdAt).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  {expense.userEmail && (
                                    <span className="text-[11px] text-muted-foreground truncate">
                                      · {expense.userEmail.split('@')[0]}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => onEditExpense(expense)}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-budget-danger"
                                    onClick={() => onDeleteExpense(expense.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              );
            })
          )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
