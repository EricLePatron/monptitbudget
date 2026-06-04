import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecurringDebit {
  id: string;
  name: string;
  amount: number;
  day: number; // day of month 1-31
  date: string; // original YYYY-MM-DD
  category?: string;
  subcategory?: string;
}

/**
 * Fetches all `is_direct_debit = true` expenses for a given account
 * in a reference (year, month) — used to project the recurring debits
 * calendar of subsequent months.
 *
 * Default reference = May of the budget's year, with a fallback to the
 * most recent month that actually has direct debits.
 */
export function useRecurringDebits(
  accountId: string | null,
  refYear: number,
  refMonth: number, // 0-11
) {
  const [debits, setDebits] = useState<RecurringDebit[]>([]);
  const [resolvedYear, setResolvedYear] = useState<number>(refYear);
  const [resolvedMonth, setResolvedMonth] = useState<number>(refMonth);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) {
      setDebits([]);
      return;
    }
    setLoading(true);
    try {
      // 1) Try the requested reference month first
      const tryMonth = async (y: number, m: number) => {
        const { data: budget } = await supabase
          .from('budgets')
          .select('id')
          .eq('account_id', accountId)
          .eq('year', y)
          .eq('month', m)
          .maybeSingle();
        if (!budget) return [];
        const { data: rows } = await supabase
          .from('expenses')
          .select('id, name, amount, date, category, subcategory, is_direct_debit')
          .eq('budget_id', budget.id)
          .eq('is_direct_debit', true);
        return rows ?? [];
      };

      let rows = await tryMonth(refYear, refMonth);
      let y = refYear;
      let m = refMonth;

      // 2) Fallback: find the most recent budget on this account with direct debits
      if (rows.length === 0) {
        const { data: budgets } = await supabase
          .from('budgets')
          .select('id, year, month')
          .eq('account_id', accountId)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(24);
        for (const b of budgets ?? []) {
          const { data: r } = await supabase
            .from('expenses')
            .select('id, name, amount, date, category, subcategory, is_direct_debit')
            .eq('budget_id', b.id)
            .eq('is_direct_debit', true);
          if (r && r.length > 0) {
            rows = r;
            y = b.year;
            m = b.month;
            break;
          }
        }
      }

      setResolvedYear(y);
      setResolvedMonth(m);
      setDebits(
        (rows ?? []).map((e) => {
          const day = Number((e.date as string).split('-')[2]);
          return {
            id: e.id as string,
            name: (e.name as string) || 'Prélèvement',
            amount: Number(e.amount),
            day,
            date: e.date as string,
            category: (e.category as string) ?? undefined,
            subcategory: (e.subcategory as string) ?? undefined,
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accountId, refYear, refMonth]);

  useEffect(() => {
    load();
  }, [load]);

  return { debits, loading, resolvedYear, resolvedMonth, refetch: load };
}
