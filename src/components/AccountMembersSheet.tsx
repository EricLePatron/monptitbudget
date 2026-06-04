import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AccountMember } from '@/hooks/useAccountMembers';
import { UserPlus, Trash2, Crown, User, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AccountMembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  members: AccountMember[];
  isOwner: boolean;
  loading: boolean;
  onInvite: (email: string) => Promise<boolean>;
  onRemove: (memberId: string) => Promise<void>;
  onResend: (email: string) => Promise<boolean>;
}

export function AccountMembersSheet({
  open,
  onOpenChange,
  accountName,
  members,
  isOwner,
  loading,
  onInvite,
  onRemove,
  onResend,
}: AccountMembersSheetProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsInviting(true);
    const success = await onInvite(email.trim());
    if (success) {
      setEmail('');
    }
    setIsInviting(false);
  };

  const handleResend = async (member: AccountMember) => {
    if (!member.email || member.email === 'Utilisateur') return;
    setResendingId(member.id);
    await onResend(member.email);
    setResendingId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[80vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl">
            Partager "{accountName}"
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Members list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Membres</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      {member.role === 'owner' ? (
                        <Crown className="w-5 h-5 text-primary" />
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {member.email}
                        {member.userId === user?.id && ' (vous)'}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role === 'owner' ? 'Propriétaire' : 'Membre'}
                      </p>
                    </div>
                    {isOwner && member.role !== 'owner' && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResend(member)}
                          disabled={resendingId === member.id}
                          className="h-10 w-10 text-muted-foreground hover:text-primary"
                          title="Renvoyer l'invitation"
                          aria-label="Renvoyer l'invitation"
                        >
                          {resendingId === member.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(member.id)}
                          className="h-10 w-10 text-muted-foreground hover:text-budget-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invite form */}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Inviter un membre</h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  disabled={isInviting}
                />
                <Button type="submit" disabled={!email.trim() || isInviting}>
                  {isInviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                L'utilisateur pourra voir et modifier le budget et les dépenses de ce compte.
              </p>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
