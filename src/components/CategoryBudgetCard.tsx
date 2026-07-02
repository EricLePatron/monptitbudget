import { CategoryGauge } from './CategoryGauge';
import { CategorySpending } from '@/hooks/useCategoryBudgets';
import { formatCurrencyCompact } from '@/lib/budget';
import { cn } from '@/lib/utils';
import { AlertTriangle, Lock, SlidersHorizontal, Infinity } from 'lucide-react';

interface CategoryBudgetCardProps {
  spending: CategorySpending;
  emoji?: string;
  onClick?: () => void;
}

const TYPE_META = {
  fixed: { label: 'Fixe', icon: Lock, cls: 'bg-blue-500/10 text-blue-400' },
  variable: { label: 'Variable', icon: SlidersHorizontal, cls: 'bg-violet-500/10 text-violet-400' },
  uncapped: { label: 'Libre', icon: Infinity, cls: 'bg-muted text-muted-foreground' },
};

export function CategoryBudgetCard({ spending, emoji = '📦', onClick }: CategoryBudgetCardProps) {
  const { categoryName, spent, config, percentage = 0, status, remaining } = spending;

  const isExceeded = status === 'exceeded';
  const isWarning = status === 'warning';
  const isUncapped = status === 'uncapped';
  const typeKey = config?.budgetType ?? 'uncapped';
  const typeMeta = TYPE_META[typeKey];
  const TypeIcon = typeMeta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full text-left rounded-2xl p-3.5 border transition-all active:scale-[0.98]',
        isExceeded
          ? 'border-budget-danger/50 bg-budget-danger-soft shadow-glow-danger'
          : isWarning
          ? 'border-budget-warning/40 bg-budget-warning-soft shadow-glow-warning'
          : 'border-border/50 bg-card hover:border-primary/30 hover:bg-card/80'
      )}
    >
      {/* Exceeded badge */}
      {isExceeded && (
        <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-budget-danger shadow-glow-danger">
          <AlertTriangle className="w-3 h-3 text-budget-danger-foreground" />
        </span>
      )}

      <div className="flex items-center gap-3">
        {/* Circular gauge with emoji inside */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: 68, height: 68 }}>
          <CategoryGauge
            percentage={isUncapped ? 0 : percentage}
            color={config?.color ?? '#6366f1'}
            size={68}
            strokeWidth={5.5}
            status={status}
          />
          <span
            className="absolute text-2xl select-none pointer-events-none"
            style={{ fontSize: 22 }}
          >
            {emoji}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Name */}
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {categoryName}
          </p>

          {/* Amounts */}
          <p className="text-xs text-muted-foreground tabular-nums">
            <span className={cn(
              'font-medium',
              isExceeded ? 'text-budget-danger' : isWarning ? 'text-budget-warning' : 'text-foreground'
            )}>
              {formatCurrencyCompact(spent)}
            </span>
            {config?.capAmount && (
              <span className="text-muted-foreground/50">
                {' '}/ {formatCurrencyCompact(config.capAmount)}
              </span>
            )}
          </p>

          {/* Progress bar (only for capped) */}
          {!isUncapped && config?.capAmount && (
            <>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden mt-1">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isExceeded
                      ? 'bg-budget-danger'
                      : isWarning
                      ? 'bg-budget-warning'
                      : 'bg-budget-ok'
                  )}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
              <p className={cn(
                'text-[10px] font-medium tabular-nums',
                isExceeded
                  ? 'text-budget-danger'
                  : isWarning
                  ? 'text-budget-warning'
                  : 'text-muted-foreground'
              )}>
                {isExceeded
                  ? `🚨 +${formatCurrencyCompact(Math.abs(remaining ?? 0))} dépassé`
                  : remaining !== undefined
                  ? `${formatCurrencyCompact(remaining)} restant (${Math.round(percentage)}%)`
                  : ''}
              </p>
            </>
          )}

          {isUncapped && (
            <p className="text-[10px] text-muted-foreground/50 italic">Sans plafond</p>
          )}
        </div>

        {/* Budget type badge */}
        <div className={cn(
          'shrink-0 self-start flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide mt-0.5',
          typeMeta.cls
        )}>
          <TypeIcon className="w-2.5 h-2.5" />
          <span>{typeMeta.label}</span>
        </div>
      </div>
    </button>
  );
}
