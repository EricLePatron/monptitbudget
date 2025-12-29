import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Account } from '@/hooks/useAccounts';
import { Plus, Trash2, Check, X, Users } from 'lucide-react';

interface ManageAccountsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onCreate: (name: string, emoji: string) => Promise<Account | null>;
  onUpdate: (id: string, name: string, emoji: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onShare?: (accountId: string) => void;
}

const EMOJI_OPTIONS = ['💰', '👤', '💑', '🏠', '🚗', '✈️', '🎮', '📱', '💼', '🛒'];

export function ManageAccountsSheet({
  open,
  onOpenChange,
  accounts,
  onCreate,
  onUpdate,
  onDelete,
  onShare,
}: ManageAccountsSheetProps) {
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountEmoji, setNewAccountEmoji] = useState('💰');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  const handleCreate = async () => {
    if (!newAccountName.trim()) return;
    await onCreate(newAccountName.trim(), newAccountEmoji);
    setNewAccountName('');
    setNewAccountEmoji('💰');
    setIsCreating(false);
  };

  const handleStartEdit = (account: Account) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditEmoji(account.emoji);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await onUpdate(editingId, editName.trim(), editEmoji);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[80vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl">
            Gérer les comptes
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Existing accounts */}
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30"
              >
                {editingId === account.id ? (
                  <>
                    <select
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                      className="text-2xl bg-transparent border-none outline-none cursor-pointer"
                    >
                      {EMOJI_OPTIONS.map((emoji) => (
                        <option key={emoji} value={emoji}>
                          {emoji}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 h-10"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleSaveEdit}
                      className="h-10 w-10 text-budget-ok"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelEdit}
                      className="h-10 w-10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">{account.emoji}</span>
                    <button
                      onClick={() => handleStartEdit(account)}
                      className="flex-1 text-left font-medium text-foreground hover:underline"
                    >
                      {account.name}
                    </button>
                    {onShare && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onShare(account.id)}
                        className="h-10 w-10 text-muted-foreground hover:text-primary"
                        title="Partager ce compte"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(account.id)}
                      disabled={accounts.length <= 1}
                      className="h-10 w-10 text-muted-foreground hover:text-budget-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Create new account */}
          {isCreating ? (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border">
              <select
                value={newAccountEmoji}
                onChange={(e) => setNewAccountEmoji(e.target.value)}
                className="text-2xl bg-transparent border-none outline-none cursor-pointer"
              >
                {EMOJI_OPTIONS.map((emoji) => (
                  <option key={emoji} value={emoji}>
                    {emoji}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Nom du compte..."
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="flex-1 h-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCreate}
                disabled={!newAccountName.trim()}
                className="h-10 w-10 text-budget-ok"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsCreating(false)}
                className="h-10 w-10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreating(true)}
              className="w-full h-12"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un compte
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
