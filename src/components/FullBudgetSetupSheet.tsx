import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BudgetConfig, Deduction, getMonthName, getDaysInMonth, formatCurrency } from '@/lib/budget';
import { Check, Plus, Trash2, Calculator } from 'lucide-react';

interface FullBudgetSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: BudgetConfig;
  onSave: (config: BudgetConfig) => void;
}


export function FullBudgetSetupSheet({
  open,
  onOpenChange,
  currentConfig,
  onSave,
}: FullBudgetSetupSheetProps) {
  const [monthlyBudget, setMonthlyBudget] = useState<string>('');
  const [month, setMonth] = useState<number>(currentConfig.month);
  const [year, setYear] = useState<number>(currentConfig.year);
  
  // Calculator mode
  const [useCalculator, setUseCalculator] = useState(false);
  const [salary, setSalary] = useState<string>('');
  const [deductions, setDeductions] = useState<Deduction[]>([
    { id: '1', label: '', amount: '' }
  ]);

  // Sync state when sheet opens
  useEffect(() => {
    if (open) {
      setMonthlyBudget(currentConfig.monthlyBudget.toString());
      setMonth(currentConfig.month);
      setYear(currentConfig.year);
      
      // Restore calculator data if available
      if (currentConfig.salary !== undefined && currentConfig.salary > 0) {
        setUseCalculator(true);
        setSalary(currentConfig.salary.toString());
        if (currentConfig.deductions && currentConfig.deductions.length > 0) {
          setDeductions(currentConfig.deductions);
        } else {
          setDeductions([{ id: '1', label: '', amount: '' }]);
        }
      } else {
        setUseCalculator(false);
        setSalary('');
        setDeductions([{ id: '1', label: '', amount: '' }]);
      }
    }
  }, [open, currentConfig]);

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
      onSave({
        monthlyBudget: budgetNumber,
        month,
        year,
        salary: useCalculator ? salaryNumber : undefined,
        deductions: useCalculator ? deductions : undefined,
      });
      onOpenChange(false);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl">
            Modifier le budget
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Toggle Calculator Mode */}
          <button
            type="button"
            onClick={() => setUseCalculator(!useCalculator)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors text-sm font-medium text-foreground"
          >
            <Calculator className="w-4 h-4" />
            {useCalculator ? 'Saisir directement le budget' : 'Calculer à partir du salaire'}
          </button>

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
                    className="text-lg h-12 pr-10"
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
                  {deductions.map((deduction) => (
                    <div key={deduction.id} className="flex gap-2 animate-fade-in">
                      <Input
                        type="text"
                        placeholder="Loyer, abonnement..."
                        value={deduction.label}
                        onChange={(e) => updateDeduction(deduction.id, 'label', e.target.value)}
                        className="flex-1 h-11"
                      />
                      <div className="relative w-24">
                        <Input
                          type="number"
                          placeholder="0"
                          value={deduction.amount}
                          onChange={(e) => updateDeduction(deduction.id, 'amount', e.target.value)}
                          className="h-11 pr-7"
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
                        className="h-11 w-11 shrink-0"
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
                  className="w-full h-11"
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
                  className="text-lg h-12 pr-10"
                  min="1"
                  step="1"
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
                <SelectTrigger className="h-12">
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
                <SelectTrigger className="h-12">
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

          {/* Preview Card */}
          {budgetNumber > 0 && (
            <div className="p-4 rounded-xl bg-secondary/50 animate-fade-in">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Budget quotidien estimé</p>
                <p className="text-2xl font-display font-bold text-foreground">
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
            <Check className="mr-2 w-5 h-5" />
            Enregistrer
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
