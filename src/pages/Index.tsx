import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BudgetSetup } from '@/components/BudgetSetup';
import { BudgetDashboard } from '@/components/BudgetDashboard';
import { AccountSetup } from '@/components/AccountSetup';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useBudget } from '@/hooks/useBudget';
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
  const {
    config,
    expenses,
    loading: budgetLoading,
    previousBudgetSuggestion,
    saveBudget,
    addExpense,
    deleteExpense,
  } = useBudget(currentAccountId);

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

  return (
    <>
      {!config ? (
        <BudgetSetup onComplete={saveBudget} previousBudgetSuggestion={previousBudgetSuggestion} />
      ) : (
        <BudgetDashboard
          config={config}
          expenses={expenses}
          onAddExpense={addExpense}
          onDeleteExpense={deleteExpense}
          onUpdateConfig={saveBudget}
          accounts={accounts}
          currentAccount={currentAccount}
          onSwitchAccount={switchAccount}
          onCreateAccount={createAccount}
          onUpdateAccount={updateAccount}
          onDeleteAccount={deleteAccount}
          previousBudgetSuggestion={previousBudgetSuggestion}
        />
      )}
    </>
  );
};

export default Index;
