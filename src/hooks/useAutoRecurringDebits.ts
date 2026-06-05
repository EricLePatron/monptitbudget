import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDaysInMonth } from '@/lib/budget';

/**
 * Automatically projects recurring direct debits onto the displayed
 * month. For any (account, year, month) being viewed, if the month has
 * a budget but no direct-debit expenses yet, copies them from the most
 * recent prior month that has direct debits (preferring May of the
 * displayed year as the canonical template).
 *
 * Idempotent: runs at most once per (account, year, month) per session,
 * and the existing-debits guard prevents duplicate inserts across
 * sessions or devices.
 */
export function useAutoRecurringDebits(
  accountId: string | null,
  year: number,
  month: number, // 0-11
) {
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!accountId) return;
    const key = `${accountId}:${year}:${month}`;
    if (handled.current.has(key)) return;
    handled.current.add(key);

    let cancelled = false;

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) return;

        // 1) Target budget for the displayed month
        const { data: targetBudget } = await supabase
          .from('budgets')
          .select('id')
          .eq('account_id', accountId)
          .eq('year', year)
          .eq('month', month)
          .maybeSingle();
        if (cancelled || !targetBudget) return;

        // 2) Already has direct debits? do nothing
        const { data: existing } = await supabase
          .from('expenses')
          .select('id')
          .eq('budget_id', targetBudget.id)
          .eq('is_direct_debit', true)
          .limit(1);
        if (cancelled || (existing && existing.length > 0)) return;

        // 3) Find the reference month: most recent budget strictly
        //    before the target that has direct debits.
        const { data: candidates } = await supabase
          .from('budgets')
          .select('id, year, month')
          .eq('account_id', accountId)
          .or(
            `year.lt.${year},and(year.eq.${year},month.lt.${month})`,
          )
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(24);
        if (cancelled) return;

        let refDebits:
          | Array<{
              name: string | null;
              amount: number;
              date: string;
              category: string | null;
              subcategory: string | null;
            }>
          | null = null;

        for (const b of candidates ?? []) {
          const { data: rows } = await supabase
            .from('expenses')
            .select('name, amount, date, category, subcategory')
            .eq('budget_id', b.id)
            .eq('is_direct_debit', true);
          if (rows && rows.length > 0) {
            refDebits = rows as typeof refDebits;
            break;
          }
        }
        if (cancelled || !refDebits || refDebits.length === 0) return;

        // 4) Project onto target month, clamping day to month length
        const daysInTarget = getDaysInMonth(month, year);
        const rowsToInsert = refDebits.map((d) => {
          const srcDay = Number(d.date.split('-')[2]);
          const day = Math.min(Math.max(1, srcDay), daysInTarget);
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return {
            user_id: user.id,
            budget_id: targetBudget.id,
            amount: Number(d.amount),
            name: d.name,
            category: d.category,
            subcategory: d.subcategory,
            date: dateKey,
            user_email: user.email ?? null,
            is_direct_debit: true,
            // 'projected' = prélèvement prévu (pas encore confirmé par la banque)
            // → exclu du solde et de l'historique tant qu'il n'a pas été matché.
            validation_status: 'projected',
            suggested_category: d.category,
            suggested_subcategory: d.subcategory,
          };
        });

        const { error } = await supabase
          .from('expenses')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(rowsToInsert as any);
        if (error) {
          // rollback in-memory guard so a future render can retry
          handled.current.delete(key);
          return;
        }

        // Tell useBudget to reload so the new debits appear immediately
        window.dispatchEvent(
          new CustomEvent('expense-validated', { detail: { accountId } }),
        );
      } catch {
        handled.current.delete(key);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId, year, month]);
}
