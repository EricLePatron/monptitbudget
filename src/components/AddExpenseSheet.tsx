import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check } from 'lucide-react';

interface AddExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExpense: (amount: number) => void;
}

export function AddExpenseSheet({ open, onOpenChange, onAddExpense }: AddExpenseSheetProps) {
  const [amount, setAmount] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (value > 0) {
      onAddExpense(value);
      setAmount('');
      onOpenChange(false);
    }
  };

  const quickAmounts = [5, 10, 15, 20, 25, 50];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl">
            Ajouter une dépense
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Input */}
          <div className="relative">
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-center text-4xl font-display font-bold h-20 pr-12"
              min="0.01"
              step="0.01"
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-medium">
              €
            </span>
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
            Ajouter
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
