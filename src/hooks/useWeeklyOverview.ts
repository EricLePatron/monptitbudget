import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import {
  BudgetConfig,
  Expense,
  WeeklyOverview,
  calculateWeeklyOverview,
  getCurrentWeekDates,
  isPureSpendingExpense,
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
 *
 * `primaryExpenses` is expected to already be scoped to "pure spending" by
 * the caller (see `isPureSpendingExpense`) — the adjacent month fetched
 * internally here is filtered the same way, so both stay consistent.
 */
export function useWeeklyOverview(
  accountId: string | null,
  primaryConfig: BudgetConfig | null,
  primaryExpenses: Expense[],
  open: boolean
) {
  const { user } = useAuth();

  // WeeklyOverviewSheet stays mounted permanently (like the other Sheets),
  // so this can't be computed once at mount time (empty deps) — a session
  // left open across a Sunday → Monday midnight would otherwise keep
  // pointing at last week forever. Recomputing whenever the sheet opens is
  // enough in practice and keeps `weekDates` referentially stable while the
  // sheet stays open/closed (important: `adjacentMonthKey` below and the
  // fetch effect depend on it, so a fresh array on every render would
  // re-trigger the adjacent-month fetch on every render too).
  // `open` isn't read inside the callback — it's used purely as a trigger to
  // force a fresh computation each time the sheet is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weekDates = useMemo(() => getCurrentWeekDates(), [open]);

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

      if (budgetError) {
        toast.error('Erreur lors du chargement du mois voisin — le total de la semaine peut être incomplet');
        setAdjacent(null);
        setLoadingAdjacent(false);
        return;
      }

      if (!budgetData) {
        // No budget configured for the adjacent month — legitimate case, not
        // an error (and since expenses require a budget_id, it also means
        // there is genuinely nothing to fetch for those days).
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
        toast.error('Erreur lors du chargement du mois voisin — le total de la semaine peut être incomplet');
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
        expenses: (expensesData || [])
          .map((e) => ({
            id: e.id,
            amount: Number(e.amount),
            name: e.name ?? undefined,
            category: (e as { category?: string }).category ?? undefined,
            subcategory: (e as { subcategory?: string }).subcategory ?? undefined,
            date: e.date,
            createdAt: new Date(e.created_at).getTime(),
            userEmail: (e as { user_email?: string }).user_email ?? undefined,
            isDirectDebit: (e as { is_direct_debit?: boolean }).is_direct_debit ?? false,
          }))
          // Same "pure spending" scoping as the primary month's expenses
          // (already filtered by the caller) — keeps both months consistent
          // for calculateWeeklyOverview.
          .filter(isPureSpendingExpense),
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
