import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface AccountMember {
  id: string;
  userId: string;
  email: string;
  role: 'owner' | 'member';
  createdAt: string;
}

export function useAccountMembers(accountId: string | null) {
  const { user } = useAuth();
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!user || !accountId) {
      setMembers([]);
      setIsOwner(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('account_members')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const membersList = (data || []).map((m) => ({
        id: m.id,
        userId: m.user_id,
        email: m.invited_email || 'Utilisateur',
        role: m.role as 'owner' | 'member',
        createdAt: m.created_at,
      }));

      setMembers(membersList);
      setIsOwner(membersList.some(m => m.userId === user.id && m.role === 'owner'));
    } catch {
      toast.error('Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  }, [user, accountId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const inviteMember = async (email: string) => {
    if (!user || !accountId) return false;

    try {
      // First, find the user by email using auth admin or a workaround
      // Since we can't query auth.users directly, we'll store the email and 
      // the user will be linked when they accept/login
      
      // For now, we'll try to find if there's already a profile or use the email directly
      // This is a simplified approach - in production you might want to use an edge function
      
      const { data: existingMember } = await supabase
        .from('account_members')
        .select('id')
        .eq('account_id', accountId)
        .eq('invited_email', email)
        .maybeSingle();

      if (existingMember) {
        toast.error('Cet utilisateur est déjà membre du compte');
        return false;
      }

      // Insert with invited_email - the user_id will be set when they accept
      // For demo purposes, we'll generate a placeholder UUID
      const { error } = await supabase
        .from('account_members')
        .insert({
          account_id: accountId,
          user_id: crypto.randomUUID(), // Placeholder - in real app, use edge function
          invited_email: email,
          role: 'member',
        });

      if (error) throw error;

      toast.success(`Invitation envoyée à ${email}`);
      await loadMembers();
      return true;
    } catch {
      toast.error("Erreur lors de l'invitation");
      return false;
    }
  };

  const removeMember = async (memberId: string) => {
    if (!user || !accountId) return;

    try {
      const { error } = await supabase
        .from('account_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Membre retiré');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return {
    members,
    loading,
    isOwner,
    inviteMember,
    removeMember,
    refetch: loadMembers,
  };
}
