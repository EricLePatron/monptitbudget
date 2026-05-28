import { CategorySpending } from '@/hooks/useCategoryBudgets';
import { formatCurrencyCompact } from '@/lib/budget';
import { cn } from '@/lib/utils';

interface CategoryCapsListProps {
  categorySpending: CategorySpending[];
  emojiMap: Record<string, string>;
  onCategoryClick?: (categoryName: string) => void;
  onOpenAll?: () => void;
}

const STATUS_BG: Record<string, string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  exceeded: 'bg-destructive',
  uncapped: 'bg-muted-foreground/40',
};

export function CategoryCapsList({
  categorySpending,
  emojiMap,
  onCategoryClick,
  onOpenAll,
}: CategoryCapsListProps) {
  // Only show capped categories — that's the whole point: know where you stand vs your caps
  const capped = categorySpending.filter(
    (c) => c.config && c.config.budgetType !== 'uncapped' && c.config.capAmount
  );

  if (capped.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpenAll}
        className="w-full rounded-2xl border border-dashed border-border/60 bg-card/40 px-4 py-3 text-center text-xs text-muted-foreground hover:bg-card/70 transition"
      >
        Aucun plafond défini — appuie pour en configurer
      </button>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Plafonds
        </h3>
        {onOpenAll && (
          <button
            type="button"
            onClick={onOpenAll}
            className="text-[10px] font-semibold text-primary hover:underline"
          >
            Gérer
          </button>
        )}
      </div>

      <ul className="space-y-1.5">
        {capped.map((c) => {
          const cap = c.config!.capAmount!;
          const pct = Math.min(100, Math.max(0, (c.spent / cap) * 100));
          const emoji = emojiMap[c.categoryName] ?? '📦';
          const overflow = c.spent > cap;

          return (
            <li key={c.categoryName}>
              <button
                type="button"
                onClick={() => onCategoryClick?.(c.categoryName)}
                className="w-full text-left rounded-xl bg-card/70 border border-border/50 px-3 py-2 hover:bg-card transition active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm leading-none">{emoji}</span>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {c.categoryName}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 shrink-0 tabular-nums">
                    <span
                      className={cn(
                        'text-xs font-bold',
                        c.status === 'exceeded'
                          ? 'text-destructive'
                          : c.status === 'warning'
                            ? 'text-amber-500'
                            : 'text-foreground'
                      )}
                    >
                      {formatCurrencyCompact(c.spent)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      / {formatCurrencyCompact(cap)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      STATUS_BG[c.status] ?? 'bg-primary',
                      overflow && 'animate-pulse'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
