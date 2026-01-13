import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Expense, formatCurrencyCompact, BudgetConfig } from '@/lib/budget';
import { Trash2, Pencil } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditExpenseSheet } from './EditExpenseSheet';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';

interface ExpenseHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onUpdateExpense: (
    expenseId: string,
    updates: { amount?: number; name?: string; category?: string; date?: string }
  ) => Promise<void>;
  categories: ExpenseCategory[];
  onAddCategory: (name: string, emoji: string) => Promise<ExpenseCategory | null>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
  budgetConfig?: BudgetConfig | null;
}

export function ExpenseHistorySheet({
  open,
  onOpenChange,
  expenses,
  onDeleteExpense,
  onUpdateExpense,
  categories,
  onAddCategory,
  onDeleteCategory,
  budgetConfig,
}: ExpenseHistorySheetProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  // Group expenses by date
  const groupedExpenses = expenses.reduce((acc, expense) => {
    if (!acc[expense.date]) {
      acc[expense.date] = [];
    }
    acc[expense.date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));

  // Calculate totals by category
  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Sans catégorie';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const maxCategoryTotal = Math.max(...Object.values(categoryTotals), 1);

  // Helper to find emoji for a category
  const getCategoryEmoji = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.emoji || '📦';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-6 pb-4 pt-[env(safe-area-inset-top,24px)] border-b border-border">
          <SheetTitle className="font-display text-xl">Historique des dépenses</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-6 space-y-6">
          {/* Category summary */}
          {sortedCategories.length > 0 && (
            <div className="space-y-3 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Par catégorie</h3>
                <span className="text-xs text-muted-foreground">
                  Total: {formatCurrencyCompact(totalExpenses)}
                </span>
              </div>
              <div className="space-y-3">
                {sortedCategories.map(([category, total]) => {
                  const percentage = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
                  const barWidth = (total / maxCategoryTotal) * 100;
                  
                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getCategoryEmoji(category)}</span>
                          <span className="text-sm font-medium text-foreground">{category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{percentage}%</span>
                          <span className="font-display font-semibold text-foreground tabular-nums">
                            {formatCurrencyCompact(total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary/80 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
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
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground capitalize">
                    {formatDate(date)}
                  </h3>
                  <div className="space-y-2">
                    {groupedExpenses[date]
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground truncate">
                                {expense.name || 'Dépense'}
                              </p>
                              {expense.category && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                  {expense.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {new Date(expense.createdAt).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {expense.userEmail && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{expense.userEmail}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-display font-semibold text-foreground">
                              -{formatCurrencyCompact(expense.amount)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => setEditingExpense(expense)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-budget-danger"
                              onClick={() => onDeleteExpense(expense.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Edit Expense Sheet */}
        <EditExpenseSheet
          open={editingExpense !== null}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          expense={editingExpense}
          onUpdateExpense={onUpdateExpense}
          categories={categories}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
          budgetConfig={budgetConfig}
        />
      </SheetContent>
    </Sheet>
  );
}
