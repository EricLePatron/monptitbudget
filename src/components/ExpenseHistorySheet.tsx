import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Expense, formatCurrencyCompact } from '@/lib/budget';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExpenseHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
}

export function ExpenseHistorySheet({
  open,
  onOpenChange,
  expenses,
  onDeleteExpense,
}: ExpenseHistorySheetProps) {
  // Group expenses by date
  const groupedExpenses = expenses.reduce((acc, expense) => {
    if (!acc[expense.date]) {
      acc[expense.date] = [];
    }
    acc[expense.date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a));

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
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="font-display text-xl">Historique des dépenses</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-6 space-y-6">
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
                            <p className="font-medium text-foreground truncate">
                              {expense.name || 'Dépense'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(expense.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-display font-semibold text-foreground">
                              -{formatCurrencyCompact(expense.amount)}
                            </span>
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
      </SheetContent>
    </Sheet>
  );
}
