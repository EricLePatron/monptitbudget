import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Account } from '@/hooks/useAccounts';
import { ChevronDown, Plus, Settings } from 'lucide-react';

interface AccountSelectorProps {
  accounts: Account[];
  currentAccount: Account | null;
  onSwitch: (accountId: string) => void;
  onManage: () => void;
}

export function AccountSelector({
  accounts,
  currentAccount,
  onSwitch,
  onManage,
}: AccountSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-foreground font-medium px-3 py-2 h-auto"
        >
          <span className="text-lg">{currentAccount?.emoji || '💰'}</span>
          <span className="text-sm">{currentAccount?.name || 'Compte'}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => onSwitch(account.id)}
            className={`flex items-center gap-2 cursor-pointer ${
              account.id === currentAccount?.id ? 'bg-secondary' : ''
            }`}
          >
            <span className="text-lg">{account.emoji}</span>
            <span className="flex-1">{account.name}</span>
            {account.id === currentAccount?.id && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onManage} className="flex items-center gap-2 cursor-pointer">
          <Settings className="w-4 h-4" />
          Gérer les comptes
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
