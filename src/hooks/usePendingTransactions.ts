import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface PendingTransaction {
  id: string;                // bank_synced_transactions.id
  transactionId: string;
  amount: number;
  description: string | null;
  transactionDate: string;   // YYYY-MM-DD
  expenseId: string | null;  // already-created expense, if any
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
      // Fetch bank_synced_transactions with validation_status = 'pending'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('bank_synced_transactions')
        .select('id, transaction_id, amount, description, transaction_date, expense_id, suggested_category, suggested_subcategory')
        .eq('account_id', accountId)
        .eq('validation_status', 'pending')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPending((data || []).map((t: any) => ({
        id: t.id,
        transactionId: t.transaction_id,
        amount: Math.abs(Number(t.amount)),
        description: t.description,
        transactionDate: t.transaction_date,
        expenseId: t.expense_id,
        suggestedCategory: t.suggested_category ?? undefined,
        suggestedSubcategory: t.suggested_subcategory ?? undefined,
      })));
    } catch {
      // Table columns may not exist yet (before migration)
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  /** Validate: assign category (+ optional subcategory) to the transaction's expense */
  const validate = async (
    txId: string,
    category: string,
    subcategory?: string
  ) => {
    if (!user) return;
    const tx = pending.find((t) => t.id === txId);
    if (!tx) return;

    try {
      // 1. Update the expense's category/subcategory
      if (tx.expenseId) {
        const { error: expErr } = await supabase
          .from('expenses')
          .update({
            category: category || null,
            subcategory: subcategory || null,
          } as never)
          .eq('id', tx.expenseId);
        if (expErr) throw expErr;
      }

      // 2. Mark transaction as validated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: txErr } = await (supabase as any)
        .from('bank_synced_transactions')
        .update({ validation_status: 'validated' })
        .eq('id', txId);
      if (txErr) throw txErr;

      setPending((prev) => prev.filter((t) => t.id !== txId));
    } catch {
      toast.error('Erreur lors de la validation');
    }
  };

  /** Ignore: skip this transaction (won't appear again) */
  const ignore = async (txId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('bank_synced_transactions')
        .update({ validation_status: 'ignored' })
        .eq('id', txId);
      if (error) throw error;
      setPending((prev) => prev.filter((t) => t.id !== txId));
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  /** Validate all at once with the same category */
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
