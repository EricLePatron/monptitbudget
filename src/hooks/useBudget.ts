import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { BudgetConfig, Expense, getTodayKey, getLocalDateComponents } from '@/lib/budget';

interface SelectedMonth {
  month: number;
  year: number;
}

export function useBudget(accountId: string | null, selectedMonth?: SelectedMonth) {
  const { user } = useAuth();
  const [config, setConfig] = useState<BudgetConfig | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousBudgetSuggestion, setPreviousBudgetSuggestion] = useState<{
    salary?: number;
    deductions?: BudgetConfig['deductions'];
    savings?: number;
  } | null>(null);

  // Default to current month if not specified
  const { year: currentYear, month: currentMonth } = getLocalDateComponents();
  const targetMonth = selectedMonth?.month ?? currentMonth;
  const targetYear = selectedMonth?.year ?? currentYear;

  // Load budget for selected month/year and account
  const loadBudget = useCallback(async () => {
    if (!user || !accountId) {
      setLoading(false);
      setConfig(null);
      setBudgetId(null);
      setExpenses([]);
      setPreviousBudgetSuggestion(null);
      return;
    }

    try {
      setLoading(true);

      // Get budget for target month/year for this account
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('month', targetMonth)
        .eq('year', targetYear)
        .maybeSingle();

      if (budgetError) throw budgetError;

      // Always fetch the most recent budget with salary/deductions for suggestions
      const { data: latestBudget } = await supabase
        .from('budgets')
        .select('salary, deductions, savings')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .not('salary', 'is', null)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestBudget) {
        setPreviousBudgetSuggestion({
          salary: latestBudget.salary ? Number(latestBudget.salary) : undefined,
          deductions: latestBudget.deductions as unknown as BudgetConfig['deductions'] ?? undefined,
          savings: latestBudget.savings ? Number(latestBudget.savings) : undefined,
        });
      } else {
        setPreviousBudgetSuggestion(null);
      }

      if (budgetData) {
        setConfig({
          monthlyBudget: Number(budgetData.monthly_budget),
          month: budgetData.month,
          year: budgetData.year,
          salary: budgetData.salary ? Number(budgetData.salary) : undefined,
          deductions: budgetData.deductions as unknown as BudgetConfig['deductions'] ?? undefined,
          savings: budgetData.savings ? Number(budgetData.savings) : undefined,
        });
        setBudgetId(budgetData.id);

        // Load expenses for this budget
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .eq('budget_id', budgetData.id)
          .order('created_at', { ascending: false });

        if (expensesError) throw expensesError;

        setExpenses(
          (expensesData || []).map((e) => ({
            id: e.id,
            amount: Number(e.amount),
            name: e.name ?? undefined,
            date: e.date,
            createdAt: new Date(e.created_at).getTime(),
          }))
        );
      } else {
        // No budget for this month - create a placeholder config to show the setup
        setConfig(null);
        setBudgetId(null);
        setExpenses([]);
      }
    } catch (error) {
      console.error('Error loading budget:', error);
      toast.error('Erreur lors du chargement du budget');
    } finally {
      setLoading(false);
    }
  }, [user, accountId, targetMonth, targetYear]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  // Create or update budget
  const saveBudget = async (newConfig: BudgetConfig) => {
    console.log('saveBudget called', { userId: user?.id, accountId, config: newConfig });
    
    if (!user) {
      console.error('saveBudget: No user');
      toast.error('Vous devez être connecté');
      return;
    }
    
    if (!accountId) {
      console.error('saveBudget: No accountId');
      toast.error('Aucun compte sélectionné');
      return;
    }

    try {
      // Check if budget exists for this month/year/account
      const { data: existing } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('month', newConfig.month)
        .eq('year', newConfig.year)
        .maybeSingle();

      console.log('Existing budget check:', existing);

      if (existing) {
        // Update existing budget
        const updatePayload: Record<string, unknown> = { 
          monthly_budget: newConfig.monthlyBudget,
          salary: newConfig.salary ?? null,
          deductions: newConfig.deductions ?? null,
          savings: newConfig.savings ?? null,
        };
        
        const { error } = await supabase
          .from('budgets')
          .update(updatePayload)
          .eq('id', existing.id);

        if (error) throw error;
        setBudgetId(existing.id);
      } else {
        // Create new budget
        const insertPayload: Record<string, unknown> = {
          user_id: user.id,
          account_id: accountId,
          monthly_budget: newConfig.monthlyBudget,
          month: newConfig.month,
          year: newConfig.year,
          salary: newConfig.salary ?? null,
          deductions: newConfig.deductions ?? null,
          savings: newConfig.savings ?? null,
        };
        
        const { data, error } = await supabase
          .from('budgets')
          .insert(insertPayload as never)
          .select()
          .single();

        console.log('Budget created:', data, error);
        if (error) throw error;
        setBudgetId(data.id);
        setExpenses([]);
      }

      setConfig(newConfig);
      toast.success('Budget mis à jour');
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Erreur lors de la sauvegarde du budget');
    }
  };

  // Update monthly budget amount only
  const updateMonthlyBudget = async (newAmount: number) => {
    if (!user || !budgetId || !config) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .update({ monthly_budget: newAmount })
        .eq('id', budgetId);

      if (error) throw error;

      setConfig({ ...config, monthlyBudget: newAmount });
      toast.success('Budget mis à jour');
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Add expense
  const addExpense = async (amount: number, name?: string) => {
    if (!user || !budgetId) return;

    try {
      const todayKey = getTodayKey();
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          budget_id: budgetId,
          amount,
          name: name || null,
          date: todayKey,
        })
        .select()
        .single();

      if (error) throw error;

      const newExpense: Expense = {
        id: data.id,
        amount: Number(data.amount),
        name: data.name ?? undefined,
        date: data.date,
        createdAt: new Date(data.created_at).getTime(),
      };

      setExpenses((prev) => [newExpense, ...prev]);
      toast.success('Dépense ajoutée');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error("Erreur lors de l'ajout de la dépense");
    }
  };

  // Delete expense
  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      toast.success('Dépense supprimée');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Reset budget (for new month)
  const resetBudget = () => {
    setConfig(null);
    setBudgetId(null);
    setExpenses([]);
  };

  return {
    config,
    expenses,
    loading,
    previousBudgetSuggestion,
    targetMonth,
    targetYear,
    saveBudget,
    updateMonthlyBudget,
    addExpense,
    deleteExpense,
    resetBudget,
  };
}
