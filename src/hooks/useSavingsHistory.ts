import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getMonthName } from '@/lib/budget';

export interface SavingsEntry {
  id: string;
  month: number;
  year: number;
  savings: number;
  monthLabel: string;
}

export interface SavingsStats {
  entries: SavingsEntry[];
  totalSavings: number;
  loading: boolean;
}

export function useSavingsHistory(accountId: string | null): SavingsStats {
  const { user } = useAuth();
  const [entries, setEntries] = useState<SavingsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavings = useCallback(async () => {
    if (!user || !accountId) {
      setLoading(false);
      setEntries([]);
      return;
    }

    try {
      setLoading(true);

      // Get all budgets with savings for this account
      const { data, error } = await supabase
        .from('budgets')
        .select('id, month, year, savings')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .not('savings', 'is', null)
        .gt('savings', 0)
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (error) throw error;

      const savingsEntries: SavingsEntry[] = (data || []).map((b) => ({
        id: b.id,
        month: b.month,
        year: b.year,
        savings: Number(b.savings),
        monthLabel: `${getMonthName(b.month)} ${b.year}`,
      }));

      setEntries(savingsEntries);
    } catch {
      console.error('Error loading savings history');
    } finally {
      setLoading(false);
    }
  }, [user, accountId]);

  useEffect(() => {
    loadSavings();
  }, [loadSavings]);

  const totalSavings = entries.reduce((sum, entry) => sum + entry.savings, 0);

  return {
    entries,
    totalSavings,
    loading,
  };
}
