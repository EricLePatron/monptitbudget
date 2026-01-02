import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BudgetConfig, Expense, calculateDailyForecasts, formatCurrencyCompact, getMonthName } from '@/lib/budget';
import { cn } from '@/lib/utils';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface DailyForecastSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BudgetConfig;
  expenses: Expense[];
}

export function DailyForecastSheet({
  open,
  onOpenChange,
  config,
  expenses,
}: DailyForecastSheetProps) {
  const forecasts = calculateDailyForecasts(config, expenses);
  const theoreticalDaily = config.monthlyBudget / forecasts.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5" />
            Prévisions {getMonthName(config.month)} {config.year}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <div className="space-y-2 pb-6">
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <span>Passé</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Aujourd'hui</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <span>À venir</span>
              </div>
            </div>

            {/* Daily forecasts */}
            {forecasts.map((forecast) => {
              const isOver = forecast.estimatedBudget < theoreticalDaily * 0.5;
              const isGood = forecast.estimatedBudget >= theoreticalDaily;
              
              return (
                <div
                  key={forecast.day}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl transition-colors',
                    forecast.isToday && 'bg-primary/10 border border-primary/30',
                    forecast.isPast && !forecast.isToday && 'bg-muted/30 opacity-60',
                    !forecast.isPast && !forecast.isToday && 'bg-secondary/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold',
                        forecast.isToday && 'bg-primary text-primary-foreground',
                        forecast.isPast && !forecast.isToday && 'bg-muted text-muted-foreground',
                        !forecast.isPast && !forecast.isToday && 'bg-secondary text-secondary-foreground'
                      )}
                    >
                      {forecast.day}
                    </div>
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        forecast.isToday && 'text-primary',
                        forecast.isPast && !forecast.isToday && 'text-muted-foreground'
                      )}>
                        {forecast.isToday ? "Aujourd'hui" : new Date(forecast.date).toLocaleDateString('fr-FR', { weekday: 'long' })}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {new Date(forecast.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!forecast.isPast && (
                      <>
                        {isGood ? (
                          <TrendingUp className="w-4 h-4 text-budget-ok" />
                        ) : isOver ? (
                          <TrendingDown className="w-4 h-4 text-budget-danger" />
                        ) : null}
                      </>
                    )}
                    <span
                      className={cn(
                        'font-display font-bold text-lg',
                        forecast.isToday && 'text-primary',
                        !forecast.isToday && isGood && 'text-budget-ok',
                        !forecast.isToday && isOver && 'text-budget-danger',
                        !forecast.isToday && !isGood && !isOver && 'text-foreground'
                      )}
                    >
                      {formatCurrencyCompact(forecast.estimatedBudget)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
