import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BudgetSetup } from '@/components/BudgetSetup';
import { BudgetDashboard } from '@/components/BudgetDashboard';
import { AccountSetup } from '@/components/AccountSetup';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useBudget } from '@/hooks/useBudget';
import { getLocalDateComponents } from '@/lib/budget';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    accounts,
    currentAccount,
    currentAccountId,
    loading: accountsLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    switchAccount,
  } = useAccounts();

  // Selected month state - defaults to current month
  const { year: currentYear, month: currentMonth } = getLocalDateComponents();
  const [selectedMonth, setSelectedMonth] = useState({ month: currentMonth, year: currentYear });

  const {
    config,
    expenses,
    loading: budgetLoading,
    previousBudgetSuggestion,
    targetMonth,
    targetYear,
    saveBudget,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useBudget(currentAccountId, selectedMonth);

  // Reset to current month when account changes
  useEffect(() => {
    setSelectedMonth({ month: currentMonth, year: currentYear });
  }, [currentAccountId, currentMonth, currentYear]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => {
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setSelectedMonth(prev => {
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  };

  // Go to current month
  const goToCurrentMonth = () => {
    setSelectedMonth({ month: currentMonth, year: currentYear });
  };

  // Check if we're viewing the current month
  const isCurrentMonth = selectedMonth.month === currentMonth && selectedMonth.year === currentYear;

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth or accounts
  if (authLoading || accountsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!user) {
    return null;
  }

  // If no accounts, show account setup
  if (accounts.length === 0) {
    return <AccountSetup onCreateAccount={createAccount} />;
  }

  // Show loading while loading budget for selected account
  if (budgetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // For past months without a saved budget, render a read-only dashboard
  // with a zero-budget placeholder so users can still browse and navigate.
  const effectiveConfig = config ?? (!isCurrentMonth
    ? { monthlyBudget: 0, month: selectedMonth.month, year: selectedMonth.year }
    : null);

  return (
    <>
      {!effectiveConfig ? (
        <BudgetSetup 
          onComplete={saveBudget} 
          previousBudgetSuggestion={previousBudgetSuggestion}
          targetMonth={targetMonth}
          targetYear={targetYear}
          onGoBack={!isCurrentMonth ? goToCurrentMonth : undefined}
          onViewPastMonths={isCurrentMonth ? goToPreviousMonth : undefined}
        />
      ) : (
        <BudgetDashboard
          config={effectiveConfig}
          expenses={expenses}
          onAddExpense={addExpense}
          onDeleteExpense={deleteExpense}
          onUpdateExpense={updateExpense}
          onUpdateConfig={saveBudget}
          accounts={accounts}
          currentAccount={currentAccount}
          onSwitchAccount={switchAccount}
          onCreateAccount={createAccount}
          onUpdateAccount={updateAccount}
          onDeleteAccount={deleteAccount}
          previousBudgetSuggestion={previousBudgetSuggestion}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onGoToCurrentMonth={goToCurrentMonth}
          isCurrentMonth={isCurrentMonth}
        />
      )}
    </>
  );
};

export default Index;
