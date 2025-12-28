import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BudgetConfig, Deduction, getMonthName, getDaysInMonth, formatCurrency } from '@/lib/budget';
import { ArrowRight, Wallet, Plus, Trash2, Calculator } from 'lucide-react';

interface BudgetSetupProps {
  onComplete: (config: BudgetConfig) => void;
}


export function BudgetSetup({ onComplete }: BudgetSetupProps) {
  const currentDate = new Date();
  const [monthlyBudget, setMonthlyBudget] = useState<string>('');
  const [month, setMonth] = useState<number>(currentDate.getMonth());
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  
  // Calculator mode
  const [useCalculator, setUseCalculator] = useState(false);
  const [salary, setSalary] = useState<string>('');
  const [deductions, setDeductions] = useState<Deduction[]>([
    { id: '1', label: '', amount: '' }
  ]);

  const daysInMonth = getDaysInMonth(month, year);
  
  // Calculate budget from salary and deductions
  const salaryNumber = parseFloat(salary) || 0;
  const totalDeductions = deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const calculatedBudget = salaryNumber - totalDeductions;
  
  const budgetNumber = useCalculator ? calculatedBudget : (parseFloat(monthlyBudget) || 0);
  const dailyBudget = budgetNumber > 0 ? budgetNumber / daysInMonth : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (budgetNumber > 0) {
      // Save calculator data if using calculator mode
      onComplete({
        monthlyBudget: budgetNumber,
        month,
        year,
        salary: useCalculator && salaryNumber > 0 ? salaryNumber : undefined,
        deductions: useCalculator && deductions.some(d => d.amount || d.label) ? deductions : undefined,
      });
    }
  };

  const addDeduction = () => {
    setDeductions([...deductions, { id: Date.now().toString(), label: '', amount: '' }]);
  };

  const removeDeduction = (id: string) => {
    if (deductions.length > 1) {
      setDeductions(deductions.filter(d => d.id !== id));
    }
  };

  const updateDeduction = (id: string, field: 'label' | 'amount', value: string) => {
    setDeductions(deductions.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: getMonthName(i),
  }));

  const years = [2025, 2026];

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
          {/* Toggle Calculator Mode */}
          <button
            type="button"
            onClick={() => setUseCalculator(!useCalculator)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors text-sm font-medium text-foreground"
          >
            <Calculator className="w-4 h-4" />
            {useCalculator ? 'Saisir directement le budget' : 'Calculer à partir du salaire'}
          </button>

          <div className="space-y-4">
            {useCalculator ? (
              <>
                {/* Salary Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Salaire mensuel
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="2000"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      className="text-lg h-14 pr-10"
                      min="0"
                      step="1"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      €
                    </span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Prélèvements mensuels
                  </label>
                  
                  <div className="space-y-2">
                    {deductions.map((deduction, index) => (
                      <div key={deduction.id} className="flex gap-2 animate-fade-in">
                        <Input
                          type="text"
                          placeholder="Loyer, abonnement..."
                          value={deduction.label}
                          onChange={(e) => updateDeduction(deduction.id, 'label', e.target.value)}
                          className="flex-1 h-12"
                        />
                        <div className="relative w-28">
                          <Input
                            type="number"
                            placeholder="0"
                            value={deduction.amount}
                            onChange={(e) => updateDeduction(deduction.id, 'amount', e.target.value)}
                            className="h-12 pr-8"
                            min="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            €
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDeduction(deduction.id)}
                          disabled={deductions.length === 1}
                          className="h-12 w-12 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addDeduction}
                    className="w-full h-12"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un prélèvement
                  </Button>
                </div>

                {/* Calculation Summary */}
                {salaryNumber > 0 && (
                  <div className="p-4 rounded-xl bg-secondary/50 space-y-2 text-sm animate-fade-in">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salaire</span>
                      <span className="font-medium text-foreground">{formatCurrency(salaryNumber)}</span>
                    </div>
                    {totalDeductions > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prélèvements</span>
                        <span className="font-medium text-budget-danger">-{formatCurrency(totalDeductions)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="font-medium text-foreground">Budget disponible</span>
                      <span className={`font-bold ${calculatedBudget >= 0 ? 'text-budget-ok' : 'text-budget-danger'}`}>
                        {formatCurrency(calculatedBudget)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Direct Monthly Budget Input */
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
                    required={!useCalculator}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    €
                  </span>
                </div>
              </div>
            )}

            {/* Month & Year Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Mois
                </label>
                <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                  <SelectTrigger className="h-14 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Année
                </label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger className="h-14 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  {daysInMonth} jours en {getMonthName(month)} {year}
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
