import { Home, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavTab = 'home' | 'history' | 'settings';

interface NavItem {
  key: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Accueil', icon: Home },
  { key: 'history', label: 'Historique', icon: History },
  { key: 'settings', label: 'Réglages', icon: Settings },
];

interface BottomNavBarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  /** Alert count shown as a badge on the "Réglages" tab (category cap warnings). */
  alertsCount?: number;
}

/**
 * Full-width PWA-style bottom tab bar.
 *
 * Since the app has no real router (every secondary destination is a Sheet
 * driven by local state), this component is purely presentational: it
 * reports the tapped tab via `onNavigate` and the parent decides which
 * Sheet to open and keeps `activeTab` in sync (including resetting to
 * "home" once a Sheet is dismissed).
 */
export function BottomNavBar({ activeTab, onNavigate, alertsCount = 0 }: BottomNavBarProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-lg border-t border-border/60 pb-[max(env(safe-area-inset-bottom),8px)]"
      role="navigation"
      aria-label="Navigation principale"
    >
      <div className="grid grid-cols-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          const showBadge = item.key === 'settings' && alertsCount > 0;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-label={
                showBadge
                  ? `${item.label}, ${alertsCount} alerte${alertsCount > 1 ? 's' : ''}`
                  : item.label
              }
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] pt-1.5 transition-colors active:scale-95',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'relative flex items-center justify-center h-7 w-9 rounded-full transition-colors',
                  isActive && 'bg-primary/15',
                )}
              >
                <Icon className="w-5 h-5" />
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(245,158,11,0.8)]">
                    {alertsCount > 9 ? '9+' : alertsCount}
                  </span>
                )}
              </span>
              <span className={cn('text-[10px] leading-none', isActive ? 'font-bold' : 'font-medium')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
