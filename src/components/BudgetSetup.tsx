import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BudgetConfig, getMonthName, getDaysInMonth, formatCurrency } from '@/lib/budget';
import { ArrowRight, Wallet } from 'lucide-react';

interface BudgetSetupProps {
  onComplete: (config: BudgetConfig) => void;
}

export function BudgetSetup({ onComplete }: BudgetSetupProps) {
  const currentDate = new Date();
  const [monthlyBudget, setMonthlyBudget] = useState<string>('');
  const [month, setMonth] = useState<number>(currentDate.getMonth());
  const [year] = useState<number>(currentDate.getFullYear());

  const daysInMonth = getDaysInMonth(month, year);
  const budgetNumber = parseFloat(monthlyBudget) || 0;
  const dailyBudget = budgetNumber / daysInMonth;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (budgetNumber > 0) {
      onComplete({
        monthlyBudget: budgetNumber,
        month,
        year,
      });
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: getMonthName(i),
  }));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in-up">
      <div className="w-full max-w-md space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Budget Quotidien
          </h1>
          <p className="text-muted-foreground">
            Configurez votre budget pour savoir combien dépenser chaque jour
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Monthly Budget */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Budget mensuel
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="300"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  className="text-lg h-14 pr-10"
                  min="1"
                  step="1"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  €
                </span>
              </div>
            </div>

            {/* Month Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mois
              </label>
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label} {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview Card */}
          {budgetNumber > 0 && (
            <div className="budget-card bg-secondary/50 animate-fade-in-up">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Budget quotidien estimé</p>
                <p className="text-3xl font-display font-bold text-foreground">
                  {formatCurrency(dailyBudget)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {daysInMonth} jours en {getMonthName(month)}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg font-medium"
            disabled={budgetNumber <= 0}
          >
            Commencer
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
