import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddExpenseSheet } from './AddExpenseSheet';
import {
  BudgetConfig,
  Expense,
  calculateBudgetMetrics,
  getBudgetStatus,
  formatCurrencyCompact,
  getMonthName,
  getTodayKey,
  generateExpenseId,
  getExpensesForDay,
} from '@/lib/budget';
import { Plus, RotateCcw, TrendingUp, TrendingDown, Minus, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface BudgetDashboardProps {
  config: BudgetConfig;
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onReset: () => void;
}

export function BudgetDashboard({ config, expenses, onAddExpense, onReset }: BudgetDashboardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [animateAmount, setAnimateAmount] = useState(false);

  const metrics = calculateBudgetMetrics(config, expenses);
  const status = getBudgetStatus(metrics.remainingToday, metrics.dailyBudget);
  const todayExpenses = getExpensesForDay(expenses, getTodayKey());

  const handleAddExpense = (amount: number) => {
    const expense: Expense = {
      id: generateExpenseId(),
      amount,
      date: getTodayKey(),
      createdAt: Date.now(),
    };
    onAddExpense(expense);
    
    // Trigger animation
    setAnimateAmount(true);
    setTimeout(() => setAnimateAmount(false), 300);
  };

  const statusConfig = {
    ok: {
      bgClass: 'bg-budget-ok-soft',
      textClass: 'text-budget-ok',
      glowClass: 'shadow-glow-ok',
      label: 'Tout va bien',
      icon: TrendingUp,
    },
    warning: {
      bgClass: 'bg-budget-warning-soft',
      textClass: 'text-budget-warning',
      glowClass: 'shadow-glow-warning',
      label: 'Attention',
      icon: Minus,
    },
    danger: {
      bgClass: 'bg-budget-danger-soft',
      textClass: 'text-budget-danger',
      glowClass: 'shadow-glow-danger',
      label: 'Dépassé',
      icon: TrendingDown,
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">
            {getMonthName(config.month)} {config.year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 -mt-16">
        {/* Status Badge */}
        <div className={cn('status-badge mb-6 animate-fade-in-up', `status-${status}`)}>
          <StatusIcon className="w-4 h-4" />
          {currentStatus.label}
        </div>

        {/* Hero Amount */}
        <div className="text-center space-y-2 mb-8">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            Reste aujourd'hui
          </p>
          <div
            className={cn(
              'hero-amount transition-all duration-200',
              currentStatus.textClass,
              animateAmount && 'animate-number-pop'
            )}
          >
            {formatCurrencyCompact(metrics.remainingToday)}
          </div>
        </div>

        {/* Today's Expenses */}
        {todayExpenses.length > 0 && (
          <div className="w-full max-w-sm mb-8 animate-fade-in-up">
            <div className="budget-card space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Dépenses du jour
              </p>
              <div className="space-y-2">
                {todayExpenses.slice(-3).map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {new Date(exp.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-display font-semibold text-foreground">
                      -{formatCurrencyCompact(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="font-display font-bold text-foreground">
                  {formatCurrencyCompact(metrics.spentToday)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tomorrow Preview */}
        <div className="w-full max-w-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="budget-card bg-secondary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Prévu demain
                </p>
                <p className="text-2xl font-display font-bold text-foreground mt-1">
                  {formatCurrencyCompact(metrics.tomorrowBudget)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {metrics.daysRemaining} jours restants
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatCurrencyCompact(metrics.budgetRemaining)} au total
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Expense FAB */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <Button
          size="lg"
          onClick={() => setSheetOpen(true)}
          className="h-16 px-8 rounded-full shadow-lg text-lg font-medium"
        >
          <Plus className="mr-2 w-6 h-6" />
          Ajouter une dépense
        </Button>
      </div>

      {/* Add Expense Sheet */}
      <AddExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAddExpense={handleAddExpense}
      />
    </div>
  );
}
