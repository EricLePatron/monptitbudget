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
}

export function ExpenseHistorySheet({
  open,
  onOpenChange,
  expenses,
  onDeleteExpense,
  onEditExpense,
  categories,
  initialCategory,
}: ExpenseHistorySheetProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [directDebitFilter, setDirectDebitFilter] = useState<'all' | 'only' | 'none'>('all');

  useEffect(() => {
    if (open) {
      setSelectedCategory(initialCategory ?? null);
      setSelectedSubcategory(null);
      setDirectDebitFilter('all');
    }
  }, [open, initialCategory]);

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory(null);
  }, [selectedCategory]);

  const filteredExpenses = expenses.filter(e => {
    if (selectedCategory && (e.category || 'Sans catégorie') !== selectedCategory) return false;
    if (selectedSubcategory && (e.subcategory || '') !== selectedSubcategory) return false;
    if (directDebitFilter === 'only' && !e.isDirectDebit) return false;
    if (directDebitFilter === 'none' && e.isDirectDebit) return false;
    return true;
  });

  const directDebitCount = expenses.filter(e => e.isDirectDebit).length;
  const directDebitTotal = expenses.filter(e => e.isDirectDebit).reduce((s, e) => s + e.amount, 0);

  const groupedExpenses = filteredExpenses.reduce((acc, expense) => {
    if (!acc[expense.date]) acc[expense.date] = [];
    acc[expense.date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));

  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Sans catégorie';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

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

  // Compute subcategory totals for the currently selected category
  const subcategoryTotals = selectedCategory
    ? expenses
        .filter(e => (e.category || 'Sans catégorie') === selectedCategory && e.subcategory)
        .reduce((acc, expense) => {
          const sub = expense.subcategory as string;
          acc[sub] = (acc[sub] || 0) + expense.amount;
          return acc;
        }, {} as Record<string, number>)
    : {};
  const sortedSubcategories = Object.entries(subcategoryTotals).sort((a, b) => b[1] - a[1]);

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
    setSelectedCategory(prev => prev === category ? null : category);
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
                <span className="text-xs text-muted-foreground">
                  Total: {formatCurrencyCompact(totalExpenses)}
                </span>
              </div>

              {selectedCategory && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-sm text-primary flex-1">
                      Filtre: {getCategoryEmoji(selectedCategory)} {selectedCategory}
                      {selectedSubcategory && (
                        <> · {getSubcategoryEmoji(selectedSubcategory)} {selectedSubcategory}</>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-primary hover:text-primary hover:bg-primary/20"
                      onClick={() => setSelectedCategory(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {sortedSubcategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {sortedSubcategories.map(([sub, total]) => {
                        const isSubSel = selectedSubcategory === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSelectedSubcategory(prev => prev === sub ? null : sub)}
                            className={`h-7 pl-1.5 pr-2.5 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                              isSubSel
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted/60 text-muted-foreground border-transparent hover:border-border hover:text-foreground'
                            }`}
                          >
                            <span>{getSubcategoryEmoji(sub)}</span>
                            <span>{sub}</span>
                            <span className="opacity-70 tabular-nums">· {formatCurrencyCompact(total)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}


              <div className="space-y-3">
                {sortedCategories.map(([category, total]) => {
                  const percentage = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
                  const barWidth = (total / maxCategoryTotal) * 100;
                  const isSelected = selectedCategory === category;

                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      className={`w-full text-left space-y-1.5 p-2 -mx-2 rounded-lg transition-all duration-200
                        ${isSelected
                          ? 'bg-primary/15 ring-1 ring-primary/30'
                          : 'hover:bg-secondary/80 cursor-pointer'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getCategoryEmoji(category)}</span>
                          <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{percentage}%</span>
                          <span className={`font-display font-semibold tabular-nums ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {formatCurrencyCompact(total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${isSelected ? 'bg-primary' : 'bg-primary/80'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sortedDates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune dépense enregistrée
            </p>
          ) : (
            sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                  {formatDate(date)}
                </h3>
                <div className="space-y-2">
                  {groupedExpenses[date]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((expense) => {
                      const emoji = getCategoryEmoji(expense.category || '');
                      return (
                        <div
                          key={expense.id}
                          className="group relative p-3 rounded-2xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-border/50 hover:border-primary/30 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center text-xl shadow-sm">
                              {emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground text-sm leading-snug break-words pr-1">
                                  {expense.name || 'Dépense'}
                                </p>
                                <span className="font-display font-bold text-base text-foreground tabular-nums shrink-0">
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
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold border border-primary/30 hover:bg-primary/25 transition-colors flex items-center gap-1"
                                    >
                                      <span>🔁</span>
                                      <span>Prélèvement</span>
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
            ))
          )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
