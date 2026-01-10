import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PiggyBank, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrencyCompact, getMonthName } from '@/lib/budget';
import { useSavingsHistory, SavingsEntry } from '@/hooks/useSavingsHistory';
import { cn } from '@/lib/utils';

interface SavingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string | null;
}

export function SavingsSheet({ open, onOpenChange, accountId }: SavingsSheetProps) {
  const { entries, totalSavings, loading } = useSavingsHistory(accountId);

  // Calculate cumulative savings for each entry
  const entriesWithCumulative = entries.reduce<(SavingsEntry & { cumulative: number })[]>(
    (acc, entry) => {
      const previousCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      acc.push({
        ...entry,
        cumulative: previousCumulative + entry.savings,
      });
      return acc;
    },
    []
  );

  // Reverse to show most recent first
  const sortedEntries = [...entriesWithCumulative].reverse();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl flex items-center justify-center gap-2">
            <PiggyBank className="w-6 h-6 text-primary" />
            Mon épargne
          </SheetTitle>
        </SheetHeader>

        {/* Total Savings Summary */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 mb-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                Total épargné
              </p>
              <p className="text-4xl font-display font-bold text-primary mt-1">
                {formatCurrencyCompact(totalSavings)}
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </div>
          {entries.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Sur {entries.length} mois d'épargne
            </p>
          )}
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <PiggyBank className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Aucune épargne enregistrée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez un montant d'épargne dans la configuration de votre budget mensuel
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {sortedEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    'bg-card rounded-xl p-4 border border-border/50',
                    index === 0 && 'ring-2 ring-primary/20 bg-primary/5'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        index === 0 ? 'bg-primary/20' : 'bg-muted/50'
                      )}>
                        <Calendar className={cn(
                          'w-5 h-5',
                          index === 0 ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {entry.monthLabel}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          +{formatCurrencyCompact(entry.savings)} ce mois
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Cumulé
                      </p>
                      <p className={cn(
                        'text-lg font-display font-bold',
                        index === 0 ? 'text-primary' : 'text-foreground'
                      )}>
                        {formatCurrencyCompact(entry.cumulative)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
