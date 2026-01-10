import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Check, CalendarIcon } from 'lucide-react';
import { CategorySelector } from './CategorySelector';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BudgetConfig, Expense } from '@/lib/budget';

interface EditExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onUpdateExpense: (
    expenseId: string,
    updates: { amount?: number; name?: string; category?: string; date?: string }
  ) => Promise<void>;
  categories: ExpenseCategory[];
  onAddCategory: (name: string, emoji: string) => Promise<ExpenseCategory | null>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
  budgetConfig?: BudgetConfig | null;
}

export function EditExpenseSheet({
  open,
  onOpenChange,
  expense,
  onUpdateExpense,
  categories,
  onAddCategory,
  onDeleteCategory,
  budgetConfig,
}: EditExpenseSheetProps) {
  const [amount, setAmount] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Initialize form when expense changes
  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setName(expense.name || '');
      setSelectedCategory(expense.category);
      // Parse the date string to Date object
      const [year, month, day] = expense.date.split('-').map(Number);
      setSelectedDate(new Date(year, month - 1, day));
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;
    
    const value = parseFloat(amount);
    if (value > 0) {
      const dateStr = selectedDate 
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : expense.date;
      
      await onUpdateExpense(expense.id, {
        amount: value,
        name: name.trim() || undefined,
        category: selectedCategory,
        date: dateStr,
      });
      onOpenChange(false);
    }
  };

  // Calculate date range for the budget month
  const getDateRange = () => {
    if (!budgetConfig) return { from: undefined, to: undefined };
    const firstDay = new Date(budgetConfig.year, budgetConfig.month, 1);
    const lastDay = new Date(budgetConfig.year, budgetConfig.month + 1, 0);
    return { from: firstDay, to: lastDay };
  };

  const dateRange = getDateRange();

  const quickAmounts = [5, 10, 15, 20, 25, 50];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl">
            Modifier la dépense
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Catégorie</Label>
            <CategorySelector
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onAddCategory={onAddCategory}
              onDeleteCategory={onDeleteCategory}
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
                  ) : (
                    <span>Sélectionner une date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    if (!dateRange.from || !dateRange.to) return false;
                    return date < dateRange.from || date > dateRange.to;
                  }}
                  defaultMonth={budgetConfig ? new Date(budgetConfig.year, budgetConfig.month) : undefined}
                  locale={fr}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="edit-expense-name" className="text-sm font-medium">
              Nom (optionnel)
            </Label>
            <Input
              id="edit-expense-name"
              type="text"
              placeholder="Ex: Café, Courses, Transport..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
              maxLength={50}
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="edit-expense-amount" className="text-sm font-medium">
              Montant
            </Label>
            <div className="relative">
              <Input
                id="edit-expense-amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-4xl font-display font-bold h-20 pr-12"
                min="0.01"
                step="0.01"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-medium">
                €
              </span>
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map((qa) => (
              <Button
                key={qa}
                type="button"
                variant="secondary"
                className="h-12 text-lg font-medium"
                onClick={() => setAmount(qa.toString())}
              >
                {qa} €
              </Button>
            ))}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg font-medium"
            disabled={!amount || parseFloat(amount) <= 0}
          >
            <Check className="mr-2 w-5 h-5" />
            Enregistrer
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
