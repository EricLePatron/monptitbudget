import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { BudgetSetup } from '@/components/BudgetSetup';
import { BudgetDashboard } from '@/components/BudgetDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useBudget } from '@/hooks/useBudget';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    config,
    expenses,
    loading: budgetLoading,
    saveBudget,
    updateMonthlyBudget,
    addExpense,
    deleteExpense,
    resetBudget,
  } = useBudget();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth or budget
  if (authLoading || budgetLoading) {
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

  return (
    <>
      {!config ? (
        <BudgetSetup onComplete={saveBudget} />
      ) : (
        <BudgetDashboard
          config={config}
          expenses={expenses}
          onAddExpense={addExpense}
          onDeleteExpense={deleteExpense}
          onUpdateConfig={saveBudget}
        />
      )}
    </>
  );
};

export default Index;
