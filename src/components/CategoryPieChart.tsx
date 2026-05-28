import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CategorySpending } from '@/hooks/useCategoryBudgets';
import { formatCurrencyCompact } from '@/lib/budget';
import { cn } from '@/lib/utils';

interface CategoryPieChartProps {
  categorySpending: CategorySpending[];
  emojiMap: Record<string, string>;
  onCategoryClick?: (categoryName: string) => void;
}

const FALLBACK_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4',
  '#8b5cf6', '#ef4444', '#f97316', '#3b82f6', '#64748b',
];

export function CategoryPieChart({ categorySpending, emojiMap, onCategoryClick }: CategoryPieChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const data = useMemo(() => {
    return categorySpending
      .filter((s) => s.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .map((s, i) => ({
        name: s.categoryName,
        value: s.spent,
        color: s.config?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        emoji: emojiMap[s.categoryName] ?? '📦',
      }));
  }, [categorySpending, emojiMap]);

  const total = useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data]);

  if (data.length === 0) {
    return (
      <div className="w-full rounded-3xl glass-card shadow-lg p-8 text-center">
        <p className="text-4xl mb-2">📊</p>
        <p className="text-sm font-semibold text-foreground">Aucune dépense ce mois</p>
        <p className="text-xs text-muted-foreground mt-1">
          Ajoutez votre première dépense pour voir le détail par catégorie
        </p>
      </div>
    );
  }

  const active = activeIdx !== null ? data[activeIdx] : null;

  return (
    <div className="w-full rounded-3xl glass-card shadow-lg p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center mb-2">
        Dépenses par catégorie
      </p>

      {/* Chart with center label */}
      <div className="relative h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
              labelLine={false}
              label={(props: any) => {
                const { cx, cy, midAngle, innerRadius, outerRadius, index } = props;
                const RAD = Math.PI / 180;
                const r = innerRadius + (outerRadius - innerRadius) * 0.55;
                const x = cx + r * Math.cos(-midAngle * RAD);
                const y = cy + r * Math.sin(-midAngle * RAD);
                const pct = (data[index].value / total) * 100;
                if (pct < 4) return null;
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fontSize: 16, pointerEvents: 'none' }}
                  >
                    {data[index].emoji}
                  </text>
                );
              }}
              onClick={(_, idx) => {
                setActiveIdx(idx);
                onCategoryClick?.(data[idx].name);
              }}
              onMouseEnter={(_, idx) => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={d.color}
                  opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {active ? (
            <>
              <span className="text-3xl leading-none mb-1">{active.emoji}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                {active.name}
              </span>
              <span className="font-display font-bold text-xl text-foreground tabular-nums mt-0.5">
                {formatCurrencyCompact(active.value)}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {Math.round((active.value / total) * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total dépensé
              </span>
              <span className="font-display font-bold text-2xl text-foreground tabular-nums mt-0.5">
                {formatCurrencyCompact(total)}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {data.length} catégorie{data.length > 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="mt-4 space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {data.map((d, i) => {
          const pct = (d.value / total) * 100;
          const isActive = activeIdx === i;
          return (
            <button
              key={d.name}
              type="button"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={() => onCategoryClick?.(d.name)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all text-left',
                isActive ? 'bg-card/80' : 'hover:bg-card/50'
              )}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color, boxShadow: `0 0 6px ${d.color}88` }}
              />
              <span className="text-base shrink-0">{d.emoji}</span>
              <span className="flex-1 text-sm font-medium text-foreground truncate">{d.name}</span>
              <div className="text-right shrink-0">
                <p className="text-sm font-display font-semibold text-foreground tabular-nums leading-tight">
                  {formatCurrencyCompact(d.value)}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {pct.toFixed(1)}%
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
