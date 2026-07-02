import { CategoryAlert } from '@/hooks/useCategoryBudgets';
import { formatCurrencyCompact } from '@/lib/budget';
import { AlertTriangle, TrendingUp, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface AlertsBannerProps {
  alerts: CategoryAlert[];
  onOpenOverview?: () => void;
}

export function AlertsBanner({ alerts, onOpenOverview }: AlertsBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (alerts.length === 0 || dismissed) return null;

  const exceeded = alerts.filter((a) => a.type === 'exceeded');
  const warnings = alerts.filter((a) => a.type === 'warning');

  return (
    <div
      className={cn(
        'w-full max-w-sm mx-auto rounded-2xl border overflow-hidden animate-fade-in-up',
        exceeded.length > 0
          ? 'border-budget-danger/40 bg-budget-danger-soft shadow-glow-danger'
          : 'border-budget-warning/40 bg-budget-warning-soft shadow-glow-warning'
      )}
    >
      {/* Top strip */}
      <div className={cn(
        'h-0.5',
        exceeded.length > 0 ? 'bg-budget-danger' : 'bg-budget-warning'
      )} />

      <div className="px-3.5 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {exceeded.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-budget-danger shrink-0" />
            ) : (
              <TrendingUp className="w-4 h-4 text-budget-warning shrink-0" />
            )}
            <span className={cn(
              'text-xs font-bold uppercase tracking-wide',
              exceeded.length > 0 ? 'text-budget-danger' : 'text-budget-warning'
            )}>
              {exceeded.length > 0
                ? `${exceeded.length} plafond${exceeded.length > 1 ? 's' : ''} dépassé${exceeded.length > 1 ? 's' : ''}`
                : `${warnings.length} alerte${warnings.length > 1 ? 's' : ''} de budget`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alert list */}
        <div className="space-y-1.5">
          {alerts.slice(0, 3).map((alert) => (
            <div
              key={alert.categoryName}
              className={cn(
                'flex items-center gap-2 rounded-xl px-2.5 py-2',
                alert.type === 'exceeded'
                  ? 'bg-budget-danger-soft'
                  : 'bg-budget-warning-soft'
              )}
            >
              {/* Color dot */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: alert.color }}
              />

              {/* Emoji */}
              {alert.emoji && (
                <span className="text-sm shrink-0">{alert.emoji}</span>
              )}

              {/* Category name */}
              <span className="flex-1 text-xs font-semibold text-foreground truncate">
                {alert.categoryName}
              </span>

              {/* Amount info */}
              <div className="text-right shrink-0">
                <span className={cn(
                  'text-xs font-bold tabular-nums',
                  alert.type === 'exceeded' ? 'text-budget-danger' : 'text-budget-warning'
                )}>
                  {alert.type === 'exceeded'
                    ? `+${formatCurrencyCompact(alert.spent - alert.cap)}`
                    : `${Math.round(alert.percentage)}%`}
                </span>
                <p className="text-[9px] text-muted-foreground tabular-nums">
                  {formatCurrencyCompact(alert.spent)} / {formatCurrencyCompact(alert.cap)}
                </p>
              </div>
            </div>
          ))}

          {alerts.length > 3 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{alerts.length - 3} autre{alerts.length - 3 > 1 ? 's' : ''} catégorie{alerts.length - 3 > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* See all button */}
        {onOpenOverview && (
          <button
            type="button"
            onClick={onOpenOverview}
            className={cn(
              'mt-2.5 w-full flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide py-1.5 rounded-lg transition-colors',
              exceeded.length > 0
                ? 'text-budget-danger hover:bg-budget-danger-soft'
                : 'text-budget-warning hover:bg-budget-warning-soft'
            )}
          >
            Voir tous les plafonds
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
