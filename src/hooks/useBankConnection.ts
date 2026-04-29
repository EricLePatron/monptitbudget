import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BankConnection {
  id: string;
  bank_name: string;
  bank_country: string | null;
  bank_account_iban: string | null;
  bank_account_name: string | null;
  valid_until: string;
  last_synced_at: string | null;
  status: string;
}

const SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1h

export function useBankConnection(accountId: string | null) {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadConnections = useCallback(async () => {
    if (!accountId) {
      setConnections([]);
      return;
    }
    const { data, error } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Load connections error', error);
      return;
    }
    setConnections((data || []) as BankConnection[]);
  }, [accountId]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Sync auto à l'ouverture (max 1x/heure)
  useEffect(() => {
    if (!accountId || connections.length === 0) return;
    const lastSyncKey = `bank_last_sync_${accountId}`;
    const lastSync = localStorage.getItem(lastSyncKey);
    const now = Date.now();
    if (lastSync && now - parseInt(lastSync) < SYNC_COOLDOWN_MS) return;

    const hasActive = connections.some(c => c.status === 'active' && new Date(c.valid_until) > new Date());
    if (!hasActive) return;

    localStorage.setItem(lastSyncKey, String(now));
    syncTransactions(true).catch(e => console.error('Auto-sync failed', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, connections.length]);

  const connectBank = async (bankName?: string) => {
    if (!accountId) {
      toast.error('Aucun compte sélectionné');
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/bank-callback`;
      const { data, error } = await supabase.functions.invoke('bank-connect', {
        body: { account_id: accountId, redirect_url: redirectUrl, bank_name: bankName, country: 'FR' },
      });

      if (error) throw error;

      if (data.needs_bank_selection) {
        toast.info('Plusieurs banques trouvées, choisis le nom exact dans la liste');
        return data;
      }

      if (data.auth_url) {
        // Stocker l'account_id pour le callback
        sessionStorage.setItem('bank_connecting_account', accountId);
        window.location.href = data.auth_url;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      toast.error(`Connexion impossible: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const syncTransactions = async (silent = false) => {
    if (!accountId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('bank-sync', {
        body: { account_id: accountId },
      });
      if (error) throw error;
      if (!silent && data?.imported > 0) {
        toast.success(`✅ ${data.imported} dépense${data.imported > 1 ? 's' : ''} importée${data.imported > 1 ? 's' : ''} de votre banque`);
      } else if (!silent) {
        toast.info('Aucune nouvelle transaction');
      } else if (silent && data?.imported > 0) {
        toast.success(`🏦 ${data.imported} nouvelle${data.imported > 1 ? 's' : ''} dépense${data.imported > 1 ? 's' : ''} synchronisée${data.imported > 1 ? 's' : ''}`);
      }
      await loadConnections();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (!silent) toast.error(`Synchro échouée: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  const disconnectBank = async (connectionId: string) => {
    const { error } = await supabase.from('bank_connections').delete().eq('id', connectionId);
    if (error) {
      toast.error('Impossible de déconnecter');
      return;
    }
    toast.success('Banque déconnectée');
    await loadConnections();
  };

  return { connections, loading, syncing, connectBank, syncTransactions, disconnectBank, refresh: loadConnections };
}
