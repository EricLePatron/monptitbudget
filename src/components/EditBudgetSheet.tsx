import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

interface EditBudgetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBudget: number;
  onSave: (newBudget: number) => void;
}

export function EditBudgetSheet({
  open,
  onOpenChange,
  currentBudget,
  onSave,
}: EditBudgetSheetProps) {
  const [budget, setBudget] = useState<string>(currentBudget.toString());

  // Sync budget state when sheet opens or currentBudget changes
  useEffect(() => {
    if (open) {
      setBudget(currentBudget.toString());
    }
  }, [open, currentBudget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(budget);
    if (value > 0) {
      onSave(value);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl">
            Modifier le budget mensuel
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="budget" className="text-sm font-medium">
              Budget mensuel
            </Label>
            <div className="relative">
              <Input
                id="budget"
                type="number"
                placeholder="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="text-center text-3xl font-display font-bold h-16 pr-12"
                min="0.01"
                step="0.01"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground font-medium">
                €
              </span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg font-medium"
            disabled={!budget || parseFloat(budget) <= 0}
          >
            <Check className="mr-2 w-5 h-5" />
            Enregistrer
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
