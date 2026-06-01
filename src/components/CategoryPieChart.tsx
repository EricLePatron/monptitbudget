import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CategorySpending } from '@/hooks/useCategoryBudgets';
import { formatCurrencyCompact } from '@/lib/budget';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CategoryPieChartProps {
  categorySpending: CategorySpending[];
  emojiMap: Record<string, string>;
  onCategoryClick?: (categoryName: string) => void;
  onManageCaps?: () => void;
}

const FALLBACK_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4',
  '#8b5cf6', '#ef4444', '#f97316', '#3b82f6', '#64748b',
];

export function CategoryPieChart({ categorySpending, emojiMap, onCategoryClick, onManageCaps }: CategoryPieChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // Visible rows: any spent, or any cap defined
  const visible = useMemo(
    () =>
      categorySpending.filter(
        (s) => s.spent > 0 || (s.config && s.config.budgetType !== 'uncapped' && s.config.capAmount),
      ),
    [categorySpending],
  );

  const toRow = (s: typeof visible[number], i: number) => ({
    name: s.categoryName,
    value: s.spent,
    color: s.config?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    emoji: emojiMap[s.categoryName] ?? '📦',
    cap: s.config && s.config.budgetType !== 'uncapped' ? (s.config.capAmount ?? null) : null,
    status: s.status,
    parentName: s.parentName,
  });

  // Parent rows only (for pie + top-level list ordering)
  const parentRows = useMemo(() => {
    const rank = (st: string) => (st === 'exceeded' ? 0 : st === 'warning' ? 1 : 2);
    return visible
      .filter((s) => !s.parentName)
      .sort((a, b) => {
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return b.spent - a.spent;
      })
      .map(toRow);
  }, [visible, emojiMap]);

  // Subcategory rows grouped by parent name
  const subsByParent = useMemo(() => {
    const map: Record<string, ReturnType<typeof toRow>[]> = {};
    visible
      .filter((s) => !!s.parentName)
      .forEach((s, i) => {
        const row = toRow(s, i);
        const p = s.parentName as string;
        if (!map[p]) map[p] = [];
        map[p].push(row);
      });
    // Sort each parent's subs by spend desc
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => b.value - a.value);
    }
    return map;
  }, [visible, emojiMap]);

  // Subs with cap are always visible; others are collapsible (collapsed by default)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const toggleParent = (name: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Pie only shows parents with spend
  const data = useMemo(() => parentRows.filter((d) => d.value > 0), [parentRows]);

  const total = useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data]);

  if (visible.length === 0) {
    return (
      <div className="w-full rounded-3xl glass-card shadow-lg p-8 text-center">
        <p className="text-4xl mb-2">📊</p>
        <p className="text-sm font-semibold text-foreground">Aucune dépense ce mois</p>
        <p className="text-xs text-muted-foreground mt-1">
          Ajoutez votre première dépense pour voir le détail par catégorie
        </p>
        {onManageCaps && (
          <button
            type="button"
            onClick={onManageCaps}
            className="mt-4 text-xs font-semibold text-primary hover:underline"
          >
            Configurer mes plafonds →
          </button>
        )}
      </div>
    );
  }

  const active = activeIdx !== null ? data[activeIdx] : null;

  return (
    <div className="w-full rounded-3xl glass-card shadow-lg p-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Catégories & plafonds
        </p>
        {onManageCaps && (
          <button
            type="button"
            onClick={onManageCaps}
            className="text-[10px] font-semibold text-primary hover:underline"
          >
            Gérer
          </button>
        )}
      </div>

      {/* Chart with center label — only if there are actual expenses */}
      {data.length > 0 && (
        <div className="relative h-64 w-full">
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
      )}

      {/* Unified list — each row = catégorie + plafond inline, sous-catégories imbriquées */}
      <div className="mt-3 space-y-1.5">
        {parentRows.map((d) => {
          const subs = subsByParent[d.name] ?? [];
          const cappedSubs = subs.filter((s) => s.cap !== null && (s.cap as number) > 0);
          const otherSubs = subs.filter((s) => !(s.cap !== null && (s.cap as number) > 0));
          const isExpanded = expandedParents.has(d.name);
          const visibleSubs = isExpanded ? [...cappedSubs, ...otherSubs] : cappedSubs;
          return (
            <div key={d.name} className="space-y-1">
              <Row
                d={d}
                total={total}
                pieIdx={data.findIndex((x) => x.name === d.name)}
                setActiveIdx={setActiveIdx}
                onCategoryClick={onCategoryClick}
                isSub={false}
                hasSubs={otherSubs.length > 0}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleParent(d.name)}
              />
              {visibleSubs.length > 0 && (
                <div className="ml-5 pl-2 border-l border-border/50 space-y-1">
                  {visibleSubs.map((sd) => (
                    <Row
                      key={sd.name}
                      d={sd}
                      total={d.value || total}
                      pieIdx={-1}
                      setActiveIdx={setActiveIdx}
                      onCategoryClick={onCategoryClick}
                      isSub
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

interface RowProps {
  d: {
    name: string;
    value: number;
    color: string;
    emoji: string;
    cap: number | null;
    status: string;
  };
  total: number;
  pieIdx: number;
  setActiveIdx: (i: number | null) => void;
  onCategoryClick?: (name: string) => void;
  isSub: boolean;
  hasSubs?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function Row({ d, total, pieIdx, setActiveIdx, onCategoryClick, isSub, hasSubs, isExpanded, onToggleExpand }: RowProps) {
  const pct = total > 0 ? (d.value / total) * 100 : 0;
  const hasCap = d.cap !== null && d.cap > 0;
  const capPct = hasCap ? Math.min(100, (d.value / (d.cap as number)) * 100) : 0;
  const isExceeded = d.status === 'exceeded';
  const isWarning = d.status === 'warning';

  return (
    <button
      type="button"
      onMouseEnter={() => pieIdx >= 0 && setActiveIdx(pieIdx)}
      onMouseLeave={() => setActiveIdx(null)}
      onClick={() => onCategoryClick?.(d.name)}
      className={cn(
        'w-full text-left rounded-xl transition-all border',
        isSub ? 'px-2 py-1.5' : 'px-2.5 py-2',
        isExceeded
          ? 'border-destructive/40 bg-destructive/5'
          : isWarning
            ? 'border-amber-500/40 bg-amber-500/5'
            : 'border-transparent hover:bg-card/60'
      )}
    >
      <div className="flex items-center gap-2.5">
        {!isSub && hasSubs && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onToggleExpand?.();
              }
            }}
            className="shrink-0 -ml-1 p-0.5 rounded-full hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </span>
        )}
        <span
          className={cn('rounded-full shrink-0', isSub ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5')}
          style={{ backgroundColor: d.color, boxShadow: isSub ? undefined : `0 0 6px ${d.color}88` }}
        />
        <span className={cn('shrink-0', isSub ? 'text-sm' : 'text-base')}>{d.emoji}</span>
        <span
          className={cn(
            'flex-1 font-medium text-foreground truncate',
            isSub ? 'text-xs text-muted-foreground' : 'text-sm'
          )}
        >
          {d.name}
        </span>
        <div className="text-right shrink-0 tabular-nums">
          <p
            className={cn(
              'font-display font-semibold leading-tight',
              isSub ? 'text-xs' : 'text-sm',
              isExceeded ? 'text-destructive' : isWarning ? 'text-amber-500' : 'text-foreground'
            )}
          >
            {formatCurrencyCompact(d.value)}
            {hasCap && (
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                / {formatCurrencyCompact(d.cap as number)}
              </span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {hasCap
              ? isExceeded
                ? `+${formatCurrencyCompact(d.value - (d.cap as number))} dépassé`
                : `${Math.round(capPct)}% du plafond`
              : d.value === 0
                ? 'Aucune dépense'
                : ''}
          </p>
        </div>
      </div>

      {hasCap && (
        <div className={cn('mt-1.5 h-1 rounded-full bg-muted/60 overflow-hidden', isSub ? 'ml-5' : 'ml-7')}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isExceeded ? 'bg-destructive' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
            )}
            style={{ width: `${capPct}%` }}
          />
        </div>
      )}
    </button>
  );
}
