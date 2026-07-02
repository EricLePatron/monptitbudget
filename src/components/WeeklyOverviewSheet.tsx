import { useMemo } from 'react';
import {
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  BudgetConfig,
  Expense,
  calculateBudgetMetrics,
  getBudgetStatus,
  formatCurrencyCompact,
} from '@/lib/budget';
import { useWeeklyOverview } from '@/hooks/useWeeklyOverview';
import { cn } from '@/lib/utils';
import { LineChart as LineChartIcon, Calendar } from 'lucide-react';

interface WeeklyOverviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BudgetConfig;
  expenses: Expense[];
  accountId: string | null;
  isCurrentMonth: boolean;
  onGoToCurrentMonth: () => void;
}

const STATUS_TEXT_CLASS = {
  ok: 'text-budget-ok',
  warning: 'text-budget-warning',
  danger: 'text-budget-danger',
} as const;

const STATUS_BAR_CLASS = {
  ok: 'bg-budget-ok',
  warning: 'bg-budget-warning',
  danger: 'bg-budget-danger',
} as const;

const STATUS_HSL_VAR = {
  ok: 'hsl(var(--budget-ok))',
  warning: 'hsl(var(--budget-warning))',
  danger: 'hsl(var(--budget-danger))',
} as const;

export function WeeklyOverviewSheet({
  open,
  onOpenChange,
  config,
  expenses,
  accountId,
  isCurrentMonth,
  onGoToCurrentMonth,
}: WeeklyOverviewSheetProps) {
  const metrics = calculateBudgetMetrics(config, expenses);
  const status = getBudgetStatus(metrics.remainingToday, metrics.dailyBudget);

  const { overview } = useWeeklyOverview(
    isCurrentMonth ? accountId : null,
    isCurrentMonth ? config : null,
    expenses
  );

  const chartData = useMemo(() => {
    if (!overview) return [];
    return overview.days.map((d) => ({
      label: d.label,
      isToday: d.isToday,
      actual: d.isFuture ? null : (d.spent ?? 0),
      projected: d.isToday ? d.spent : d.isFuture ? d.projectedBudget : null,
      reference: overview.theoreticalDailyBudget,
    }));
  }, [overview]);

  const weekPct = overview && overview.weekProjected > 0
    ? Math.min(100, (overview.weekSpent / overview.weekProjected) * 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl flex items-center justify-center gap-2">
            <LineChartIcon className="w-5 h-5" />
            Ta semaine
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6 pb-6">
          {!isCurrentMonth ? (
            <div className="rounded-3xl glass-card shadow-lg p-8 text-center">
              <p className="text-4xl mb-2">📅</p>
              <p className="text-sm font-semibold text-foreground">
                Disponible sur le mois en cours
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Reviens sur le mois en cours pour voir ta semaine
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onGoToCurrentMonth}
                className="rounded-full"
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                Aller au mois en cours
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. Hero */}
              <div
                className={cn(
                  'rounded-3xl glass-card shadow-lg p-5 text-center',
                  status === 'danger' && 'shadow-glow-danger'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Il te reste aujourd'hui
                </p>
                <p
                  className={cn(
                    'font-display font-bold text-4xl tabular-nums',
                    STATUS_TEXT_CLASS[status],
                    status === 'danger' && 'animate-pulse'
                  )}
                >
                  {formatCurrencyCompact(metrics.remainingToday)}
                </p>
              </div>

              {/* 2. Mini courbe de la semaine */}
              <div className="rounded-3xl glass-card shadow-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 px-1">
                  Cette semaine
                </p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                      <ReferenceLine
                        y={overview?.theoreticalDailyBudget ?? 0}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="2 3"
                        strokeOpacity={0.5}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke={STATUS_HSL_VAR[status]}
                        strokeWidth={2.5}
                        dot={(props: { cx?: number; cy?: number; index?: number; payload?: { isToday: boolean } }) => {
                          const { cx, cy, payload, index } = props;
                          if (!payload?.isToday) return <g key={`dot-${index}`} />;
                          return (
                            <circle
                              key={`dot-${index}`}
                              cx={cx}
                              cy={cy}
                              r={5}
                              fill={STATUS_HSL_VAR[status]}
                              stroke="hsl(var(--background))"
                              strokeWidth={2}
                              style={{ filter: `drop-shadow(0 0 5px ${STATUS_HSL_VAR[status]})` }}
                            />
                          );
                        }}
                        activeDot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="projected"
                        stroke={STATUS_HSL_VAR[status]}
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        strokeOpacity={0.6}
                        dot={false}
                        activeDot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 rounded-full" style={{ background: STATUS_HSL_VAR[status] }} />
                    <span>Dépensé</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-3 h-0.5 rounded-full opacity-60"
                      style={{
                        background: `repeating-linear-gradient(to right, ${STATUS_HSL_VAR[status]} 0 3px, transparent 3px 6px)`,
                      }}
                    />
                    <span>Projeté</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 rounded-full bg-muted-foreground/50" />
                    <span>Budget/jour</span>
                  </div>
                </div>
              </div>

              {/* 3. Total semaine */}
              <div className="rounded-3xl glass-card shadow-lg p-4">
                <div className="flex items-baseline justify-between mb-1.5 px-1">
                  <span className="font-display font-bold text-lg tabular-nums text-foreground">
                    {formatCurrencyCompact(overview?.weekSpent ?? 0)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    dépensés / {formatCurrencyCompact(overview?.weekProjected ?? 0)} prévus
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', STATUS_BAR_CLASS[status])}
                    style={{ width: `${weekPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
