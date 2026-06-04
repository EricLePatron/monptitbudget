import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Settings, Users, Landmark, LogOut, ChevronRight, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pendingCount: number;
  onOpenPending: () => void;
  onOpenBudgetConfig: () => void;
  onOpenAccounts: () => void;
  onOpenBank: () => void;
  onSignOut: () => void;
}

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: number;
  danger?: boolean;
  onClick: () => void;
}

function MenuRow({ icon, label, sublabel, badge, danger, onClick }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]',
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-foreground hover:bg-muted/60',
      )}
    >
      <span className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        danger ? 'bg-red-500/10' : 'bg-muted',
      )}>
        {icon}
      </span>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>}
      </div>
      {badge != null && badge > 0 && (
        <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(245,158,11,0.5)] shrink-0">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {!danger && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    </button>
  );
}

export function SettingsSheet({
  open,
  onOpenChange,
  pendingCount,
  onOpenPending,
  onOpenBudgetConfig,
  onOpenAccounts,
  onOpenBank,
  onSignOut,
}: SettingsSheetProps) {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-xl">Paramètres</SheetTitle>
        </SheetHeader>

        <div className="space-y-1 pb-4">
          {pendingCount > 0 && (
            <MenuRow
              icon={<ListTodo className="w-5 h-5 text-amber-400" />}
              label="Transactions à catégoriser"
              sublabel="Valider les dépenses importées"
              badge={pendingCount}
              onClick={() => { close(); onOpenPending(); }}
            />
          )}
          <MenuRow
            icon={<Settings className="w-5 h-5 text-muted-foreground" />}
            label="Configuration du mois"
            sublabel="Salaire, budget, déductions"
            onClick={() => { close(); onOpenBudgetConfig(); }}
          />
          <MenuRow
            icon={<Users className="w-5 h-5 text-muted-foreground" />}
            label="Gérer les comptes"
            sublabel="Comptes partagés et membres"
            onClick={() => { close(); onOpenAccounts(); }}
          />
          <MenuRow
            icon={<Landmark className="w-5 h-5 text-muted-foreground" />}
            label="Connexion bancaire"
            sublabel="Synchroniser mes relevés"
            onClick={() => { close(); onOpenBank(); }}
          />

          <div className="h-px bg-border/50 mx-4 my-2" />

          <MenuRow
            icon={<LogOut className="w-5 h-5 text-red-400" />}
            label="Déconnexion"
            danger
            onClick={() => { close(); onSignOut(); }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
