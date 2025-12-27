import { useState, useEffect } from 'react';
import { BudgetSetup } from '@/components/BudgetSetup';
import { BudgetDashboard } from '@/components/BudgetDashboard';
import {
  BudgetConfig,
  Expense,
  BudgetState,
  loadBudgetState,
  saveBudgetState,
} from '@/lib/budget';

const Index = () => {
  const [state, setState] = useState<BudgetState>({ config: null, expenses: [] });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = loadBudgetState();
    setState(savedState);
    setIsLoaded(true);
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      saveBudgetState(state);
    }
  }, [state, isLoaded]);

  const handleSetupComplete = (config: BudgetConfig) => {
    setState({ config, expenses: [] });
  };

  const handleAddExpense = (expense: Expense) => {
    setState((prev) => ({
      ...prev,
      expenses: [...prev.expenses, expense],
    }));
  };

  const handleReset = () => {
    setState({ config: null, expenses: [] });
  };

  // Show nothing until state is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <>
      {!state.config ? (
        <BudgetSetup onComplete={handleSetupComplete} />
      ) : (
        <BudgetDashboard
          config={state.config}
          expenses={state.expenses}
          onAddExpense={handleAddExpense}
          onReset={handleReset}
        />
      )}
    </>
  );
};

export default Index;
