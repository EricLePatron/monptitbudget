import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowRight } from 'lucide-react';
import { Account } from '@/hooks/useAccounts';

interface AccountSetupProps {
  onCreateAccount: (name: string, emoji: string) => Promise<Account | null>;
}

const EMOJI_OPTIONS = ['💰', '👤', '💑', '🏠', '🚗', '✈️', '🎮', '📱', '💼', '🛒'];

export function AccountSetup({ onCreateAccount }: AccountSetupProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💰');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    await onCreateAccount(name.trim(), emoji);
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in-up">
      <div className="w-full max-w-md space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Créer un compte
          </h1>
          <p className="text-muted-foreground">
            Commencez par créer un compte pour suivre votre budget (personnel, couple, etc.)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Emoji Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Icône</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                    emoji === e
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nom du compte</label>
            <Input
              type="text"
              placeholder="Personnel, Couple, Vacances..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg h-14"
              autoFocus
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg font-medium"
            disabled={!name.trim() || isCreating}
          >
            Continuer
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
