import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import {
  BudgetConfig,
  Expense,
  WeeklyOverview,
  calculateWeeklyOverview,
  getCurrentWeekDates,
  parseDateKey,
} from '@/lib/budget';

/**
 * Builds the "this week" overview (Monday → Sunday) for the "Courbe" tab.
 *
 * Reuses the already-loaded primary month's config/expenses whenever the
 * calendar week fits entirely within it (the common case — no network call).
 * When the week straddles a month boundary, it fetches the adjacent month's
 * budget + expenses (same query shape as useBudget) so the rollover
 * projection stays correct. If that adjacent month has no budget configured,
 * there is nothing to fetch: since expenses always require a budget_id, its
 * days simply have 0€ actually spent (handled by calculateWeeklyOverview).
 */
export function useWeeklyOverview(
  accountId: string | null,
  primaryConfig: BudgetConfig | null,
  primaryExpenses: Expense[]
) {
  const { user } = useAuth();

  const weekDates = useMemo(() => getCurrentWeekDates(), []);

  // Distinct {month, year} pairs touched by the current week that are NOT
  // the primary month.
  const adjacentMonthKey = useMemo(() => {
    if (!primaryConfig) return null;
    for (const date of weekDates) {
      const { year, month } = parseDateKey(date);
      if (year !== primaryConfig.year || month !== primaryConfig.month) {
        return { year, month };
      }
    }
    return null;
  }, [weekDates, primaryConfig]);

  const [adjacent, setAdjacent] = useState<{ config: BudgetConfig; expenses: Expense[] } | null>(null);
  const [loadingAdjacent, setLoadingAdjacent] = useState(false);

  useEffect(() => {
    if (!user || !accountId || !adjacentMonthKey) {
      setAdjacent(null);
      return;
    }

    let cancelled = false;
    setLoadingAdjacent(true);

    (async () => {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('month', adjacentMonthKey.month)
        .eq('year', adjacentMonthKey.year)
        .maybeSingle();

      if (cancelled) return;

      if (budgetError || !budgetData) {
        setAdjacent(null);
        setLoadingAdjacent(false);
        return;
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('budget_id', budgetData.id)
        .or('validation_status.is.null,validation_status.eq.validated,validation_status.eq.projected');

      if (cancelled) return;

      if (expensesError) {
        setAdjacent(null);
        setLoadingAdjacent(false);
        return;
      }

      setAdjacent({
        config: {
          monthlyBudget: Number(budgetData.monthly_budget),
          month: budgetData.month,
          year: budgetData.year,
          salary: budgetData.salary ? Number(budgetData.salary) : undefined,
          deductions: budgetData.deductions as unknown as BudgetConfig['deductions'] ?? undefined,
          savings: budgetData.savings ? Number(budgetData.savings) : undefined,
        },
        expenses: (expensesData || []).map((e) => ({
          id: e.id,
          amount: Number(e.amount),
          name: e.name ?? undefined,
          category: (e as { category?: string }).category ?? undefined,
          subcategory: (e as { subcategory?: string }).subcategory ?? undefined,
          date: e.date,
          createdAt: new Date(e.created_at).getTime(),
          userEmail: (e as { user_email?: string }).user_email ?? undefined,
          isDirectDebit: (e as { is_direct_debit?: boolean }).is_direct_debit ?? false,
        })),
      });
      setLoadingAdjacent(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, accountId, adjacentMonthKey]);

  const overview: WeeklyOverview | null = useMemo(() => {
    if (!primaryConfig) return null;
    const monthsData = [{ config: primaryConfig, expenses: primaryExpenses }];
    if (adjacent) monthsData.push(adjacent);
    return calculateWeeklyOverview(monthsData);
  }, [primaryConfig, primaryExpenses, adjacent]);

  return {
    overview,
    loading: !!adjacentMonthKey && loadingAdjacent,
  };
}
