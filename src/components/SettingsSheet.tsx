import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Settings as SettingsIcon,
  Users,
  Landmark,
  LogOut,
  FolderTree,
  ChevronRight,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingCount: number;
  alertsCount: number;
  onOpenBudgetSetup: () => void;
  onOpenManageAccounts: () => void;
  onOpenBank: () => void;
  onOpenSavings?: () => void;
  onOpenOverview?: () => void;
  onOpenCategoryTree: () => void;
  onOpenPending: () => void;
  onSignOut: () => void;
}

interface Row {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
  badge?: number;
  destructive?: boolean;
}

export function SettingsSheet({
  open,
  onOpenChange,
  pendingCount: _pendingCount,
  alertsCount,
  onOpenBudgetSetup,
  onOpenManageAccounts,
  onOpenBank,
  onOpenSavings: _onOpenSavings,
  onOpenOverview: _onOpenOverview,
  onOpenCategoryTree,
  onOpenPending: _onOpenPending,
  onSignOut,
}: SettingsSheetProps) {
  const handle = (fn: () => void) => () => {
    onOpenChange(false);
    setTimeout(fn, 150);
  };

  const main: Row[] = [
    {
      icon: SettingsIcon,
      title: 'Configuration du mois',
      subtitle: 'Salaire, budget, déductions',
      onClick: handle(onOpenBudgetSetup),
    },
    {
      icon: FolderTree,
      title: 'Catégories & plafonds',
      subtitle: 'Arborescence et limites mensuelles',
      onClick: handle(onOpenCategoryTree),
      badge: alertsCount,
    },
    {
      icon: Users,
      title: 'Gérer les comptes',
      subtitle: 'Comptes partagés et membres',
      onClick: handle(onOpenManageAccounts),
    },
    {
      icon: Landmark,
      title: 'Connexion bancaire',
      subtitle: 'Synchroniser mes relevés',
      onClick: handle(onOpenBank),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),20px)] max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl">Paramètres</SheetTitle>
        </SheetHeader>

        <div className="space-y-2">
          {main.map((row) => {
            const Icon = row.icon;
            return (
              <button
                key={row.title}
                type="button"
                onClick={row.onClick}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card/60 border border-border/60 hover:bg-card hover:border-primary/30 active:scale-[0.99] transition-all text-left"
              >
                <div className="relative w-11 h-11 shrink-0 rounded-xl bg-secondary/60 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-foreground" />
                  {row.badge && row.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(245,158,11,0.7)]">
                      {row.badge > 9 ? '9+' : row.badge}
                    </span>
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{row.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{row.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}

          <div className="pt-2 border-t border-border/40 mt-3">
            <button
              type="button"
              onClick={handle(onSignOut)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-2xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/15 active:scale-[0.99] transition-all text-left'
              )}
            >
              <div className="w-11 h-11 shrink-0 rounded-xl bg-destructive/15 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-destructive">Déconnexion</p>
              </div>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
