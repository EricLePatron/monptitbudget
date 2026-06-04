import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { CalendarClock, TrendingDown, Loader2, Clock, Check } from 'lucide-react';
import { useRecurringDebits } from '@/hooks/useRecurringDebits';
import { formatCurrencyCompact, getDaysInMonth, getMonthName } from '@/lib/budget';
import { cn } from '@/lib/utils';

interface RecurringDebitsCalendarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string | null;
  accountName?: string;
  /** Month displayed in the dashboard (0-11) — used as the projection target. */
  targetMonth: number;
  targetYear: number;
  /** Monthly budget for the projection — used to compute remaining impact. */
  monthlyBudget: number;
}

/**
 * Recurring direct-debits calendar.
 *
 * Source of truth: direct-debit expenses logged in a reference month
 * (defaults to May of the displayed year, with fallback to the most recent
 * month that has direct debits). They are projected onto the displayed
 * month, grouped by day, with a running impact on the available budget.
 */
export function RecurringDebitsCalendarSheet({
  open,
  onOpenChange,
  accountId,
  accountName,
  targetMonth,
  targetYear,
  monthlyBudget,
}: RecurringDebitsCalendarSheetProps) {
  // Reference: May of the displayed year (month index 4)
  const { debits, loading, resolvedYear, resolvedMonth } = useRecurringDebits(
    open ? accountId : null,
    targetYear,
    4,
  );

  const daysInTarget = getDaysInMonth(targetMonth, targetYear);

  // Today, relative to the displayed month
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === targetYear && now.getMonth() === targetMonth;
  const isFutureMonth =
    targetYear > now.getFullYear() ||
    (targetYear === now.getFullYear() && targetMonth > now.getMonth());
  const todayDay = isCurrentMonth ? now.getDate() : 0;

  const byDay = useMemo(() => {
    const map = new Map<number, typeof debits>();
    for (const d of debits) {
      const day = Math.min(d.day, daysInTarget); // clamp e.g. 31 → 30
      const arr = map.get(day) ?? [];
      arr.push(d);
      map.set(day, arr);
    }
    return map;
  }, [debits, daysInTarget]);

  const total = useMemo(() => debits.reduce((s, d) => s + d.amount, 0), [debits]);
  const sortedDays = useMemo(
    () => Array.from(byDay.keys()).sort((a, b) => a - b),
    [byDay],
  );

  // Upcoming total = debits whose day is strictly after today (current month)
  // or every debit (future month). Past month → 0.
  const upcomingTotal = useMemo(() => {
    if (isFutureMonth) return total;
    if (!isCurrentMonth) return 0;
    return debits.reduce(
      (s, d) => (Math.min(d.day, daysInTarget) > todayDay ? s + d.amount : s),
      0,
    );
  }, [debits, daysInTarget, isCurrentMonth, isFutureMonth, todayDay, total]);
  const pastTotal = total - upcomingTotal;

  const usingFallback =
    debits.length > 0 && (resolvedYear !== targetYear || resolvedMonth !== 4);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pb-[max(env(safe-area-inset-bottom),20px)] max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="text-center font-display text-xl flex items-center justify-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Calendrier des prélèvements
          </SheetTitle>
          <SheetDescription className="text-center text-xs">
            {accountName ? `${accountName} • ` : ''}
            {getMonthName(targetMonth)} {targetYear}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : debits.length === 0 ? (
          <div className="text-center py-10 px-6">
            <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">
              Aucun prélèvement récurrent
            </p>
            <p className="text-xs text-muted-foreground">
              Marque tes dépenses fixes comme « prélèvement » pour les voir apparaître ici.
            </p>
          </div>
        ) : (
          <>
            {/* Summary card */}
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 mb-3">
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Total mensuel
                  </p>
                  <p className="text-2xl font-display font-bold tabular-nums text-foreground">
                    {formatCurrencyCompact(total)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Budget après prélèv.
                  </p>
                  <p
                    className={cn(
                      'text-base font-display font-bold tabular-nums',
                      monthlyBudget - total < 0 ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {formatCurrencyCompact(monthlyBudget - total)}
                  </p>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500/70 to-amber-500"
                  style={{
                    width: `${Math.min(100, (total / Math.max(monthlyBudget, 1)) * 100)}%`,
                  }}
                />
              </div>

              {/* Past vs upcoming split */}
              {(isCurrentMonth || isFutureMonth) && upcomingTotal > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/40 border border-border/40 px-2.5 py-2">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Déjà prélevé
                    </p>
                    <p className="text-sm font-display font-bold tabular-nums text-foreground mt-0.5">
                      −{formatCurrencyCompact(pastTotal)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-2.5 py-2">
                    <p className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      À venir
                    </p>
                    <p className="text-sm font-display font-bold tabular-nums text-amber-700 dark:text-amber-300 mt-0.5">
                      −{formatCurrencyCompact(upcomingTotal)}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground mt-2">
                Basé sur les prélèvements de{' '}
                <span className="font-semibold text-foreground">
                  {getMonthName(resolvedMonth)} {resolvedYear}
                </span>
                {usingFallback ? ' (mois de référence le plus récent)' : ''}.
              </p>
            </div>

            {/* Day-by-day list */}
            <div className="space-y-2">
              {(() => {
                let running = 0;
                return sortedDays.map((day) => {
                  const items = byDay.get(day)!;
                  const dayTotal = items.reduce((s, d) => s + d.amount, 0);
                  running += dayTotal;
                  const remaining = monthlyBudget - running;
                  const isPast = isCurrentMonth ? day < todayDay : !isFutureMonth && !isCurrentMonth;
                  const isToday = isCurrentMonth && day === todayDay;
                  const isUpcoming = isFutureMonth || (isCurrentMonth && day > todayDay);
                  return (
                    <div
                      key={day}
                      className={cn(
                        'rounded-2xl border p-3 transition-colors',
                        isToday
                          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                          : isUpcoming
                            ? 'border-amber-500/30 bg-amber-500/[0.04]'
                            : 'border-border/60 bg-card/40 opacity-70',
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl border flex flex-col items-center justify-center leading-none',
                              isToday
                                ? 'bg-primary text-primary-foreground border-primary'
                                : isUpcoming
                                  ? 'bg-amber-500/15 border-amber-500/40'
                                  : 'bg-muted/60 border-border/60',
                            )}
                          >
                            <span
                              className={cn(
                                'text-[8px] uppercase tracking-wider font-bold',
                                isToday
                                  ? 'text-primary-foreground/80'
                                  : isUpcoming
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-muted-foreground',
                              )}
                            >
                              {getMonthName(targetMonth).slice(0, 3)}
                            </span>
                            <span
                              className={cn(
                                'text-sm font-display font-bold tabular-nums',
                                isToday ? 'text-primary-foreground' : 'text-foreground',
                              )}
                            >
                              {day}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-foreground">
                                {items.length} prélèvement{items.length > 1 ? 's' : ''}
                              </p>
                              {isToday && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                                  Aujourd'hui
                                </span>
                              )}
                              {isUpcoming && !isToday && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  À venir
                                </span>
                              )}
                              {isPast && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  Prélevé
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground tabular-nums">
                              −{formatCurrencyCompact(dayTotal)} ce jour
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1 justify-end">
                            <TrendingDown className="w-3 h-3" />
                            Restant
                          </p>
                          <p
                            className={cn(
                              'text-sm font-display font-bold tabular-nums',
                              remaining < 0 ? 'text-destructive' : 'text-foreground',
                            )}
                          >
                            {formatCurrencyCompact(remaining)}
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-1 pl-1">
                        {items.map((d) => (
                          <li
                            key={d.id}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-background/50"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground truncate">
                                {d.name}
                              </p>
                              {(d.subcategory || d.category) && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {d.subcategory || d.category}
                                </p>
                              )}
                            </div>
                            <span className="font-bold tabular-nums text-foreground shrink-0 ml-2">
                              −{formatCurrencyCompact(d.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
