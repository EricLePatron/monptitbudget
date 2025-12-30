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

export function useAccountMembers(accountId: string | null, accountName?: string) {
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

  const sendInvitationEmail = async (invitedEmail: string) => {
    if (!user?.email || !accountName) return;

    try {
      const appUrl = window.location.origin;
      
      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          invitedEmail,
          accountName,
          inviterEmail: user.email,
          appUrl,
        },
      });

      if (error) {
        console.error('Error sending invitation email:', error);
        // Don't throw - email is optional, invitation still works
        return;
      }

      if (data?.success) {
        console.log('Invitation email sent successfully');
      }
    } catch (err) {
      console.error('Failed to send invitation email:', err);
      // Don't throw - email is optional
    }
  };

  const inviteMember = async (email: string) => {
    if (!user || !accountId) return false;

    try {
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
      const { error } = await supabase
        .from('account_members')
        .insert({
          account_id: accountId,
          user_id: crypto.randomUUID(), // Placeholder - in real app, use edge function
          invited_email: email,
          role: 'member',
        });

      if (error) throw error;

      // Send invitation email
      await sendInvitationEmail(email);

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
