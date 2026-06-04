import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface PendingTransaction {
  id: string;                // expense id
  transactionId: string;     // same as id (kept for compat)
  amount: number;
  description: string | null;
  transactionDate: string;   // YYYY-MM-DD
  expenseId: string | null;  // same as id
  suggestedCategory?: string;
  suggestedSubcategory?: string;
}

export function usePendingTransactions(accountId: string | null) {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) { setPending([]); return; }
    setLoading(true);
    try {
      // Pending = expenses awaiting category confirmation, scoped by account via budgets
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('expenses')
        .select('id, amount, name, date, category, subcategory, suggested_category, suggested_subcategory, budgets!inner(account_id)')
        .eq('budgets.account_id', accountId)
        .eq('validation_status', 'pending')
        .order('date', { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPending((data || []).map((e: any) => ({
        id: e.id,
        transactionId: e.id,
        amount: Math.abs(Number(e.amount)),
        description: e.name,
        transactionDate: e.date,
        expenseId: e.id,
        suggestedCategory: e.suggested_category ?? e.category ?? undefined,
        suggestedSubcategory: e.suggested_subcategory ?? e.subcategory ?? undefined,
      })));
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  // Refresh when a new expense is added elsewhere
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ accountId?: string }>).detail;
      if (!detail || detail.accountId === accountId) load();
    };
    window.addEventListener('expense-added', onChange);
    window.addEventListener('bank-sync-completed', onChange);
    return () => {
      window.removeEventListener('expense-added', onChange);
      window.removeEventListener('bank-sync-completed', onChange);
    };
  }, [accountId, load]);

  /** Validate: confirm the expense category (or override it) and mark as validated */
  const validate = async (
    expenseId: string,
    category: string,
    subcategory?: string
  ) => {
    if (!user) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('expenses')
        .update({
          category: category || null,
          subcategory: subcategory || null,
          validation_status: 'validated',
        })
        .eq('id', expenseId);
      if (error) throw error;

      setPending((prev) => prev.filter((t) => t.id !== expenseId));
      window.dispatchEvent(new CustomEvent('expense-validated', { detail: { accountId } }));
    } catch {
      toast.error('Erreur lors de la validation');
    }
  };

  /** Ignore: hide from pending (keep expense, just mark ignored) */
  const ignore = async (expenseId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('expenses')
        .update({ validation_status: 'ignored' })
        .eq('id', expenseId);
      if (error) throw error;
      setPending((prev) => prev.filter((t) => t.id !== expenseId));
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const validateAll = async (category: string, subcategory?: string) => {
    for (const tx of [...pending]) {
      await validate(tx.id, category, subcategory);
    }
  };

  return {
    pending,
    pendingCount: pending.length,
    loading,
    validate,
    ignore,
    validateAll,
    refetch: load,
  };
}
