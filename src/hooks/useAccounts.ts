import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Account {
  id: string;
  name: string;
  emoji: string;
}

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const accountsList = (data || []).map((a) => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji || '💰',
      }));

      setAccounts(accountsList);

      // Set current account from localStorage or first account
      const savedAccountId = localStorage.getItem(`current_account_${user.id}`);
      if (savedAccountId && accountsList.some(a => a.id === savedAccountId)) {
        setCurrentAccountId(savedAccountId);
      } else if (accountsList.length > 0) {
        setCurrentAccountId(accountsList[0].id);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erreur lors du chargement des comptes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Save current account to localStorage
  useEffect(() => {
    if (user && currentAccountId) {
      localStorage.setItem(`current_account_${user.id}`, currentAccountId);
    }
  }, [user, currentAccountId]);

  const createAccount = async (name: string, emoji: string = '💰') => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name,
          emoji,
        })
        .select()
        .single();

      if (error) throw error;

      const newAccount: Account = {
        id: data.id,
        name: data.name,
        emoji: data.emoji || '💰',
      };

      setAccounts((prev) => [...prev, newAccount]);
      
      // If this is the first account, set it as current
      if (accounts.length === 0) {
        setCurrentAccountId(newAccount.id);
      }

      toast.success('Compte créé');
      return newAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Erreur lors de la création du compte');
      return null;
    }
  };

  const updateAccount = async (accountId: string, name: string, emoji: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ name, emoji })
        .eq('id', accountId);

      if (error) throw error;

      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, name, emoji } : a))
      );
      toast.success('Compte mis à jour');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      
      // If we deleted the current account, switch to first available
      if (currentAccountId === accountId) {
        const remaining = accounts.filter((a) => a.id !== accountId);
        setCurrentAccountId(remaining.length > 0 ? remaining[0].id : null);
      }

      toast.success('Compte supprimé');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const switchAccount = (accountId: string) => {
    setCurrentAccountId(accountId);
  };

  const currentAccount = accounts.find((a) => a.id === currentAccountId) || null;

  return {
    accounts,
    currentAccount,
    currentAccountId,
    loading,
    createAccount,
    updateAccount,
    deleteAccount,
    switchAccount,
    refetch: loadAccounts,
  };
}
