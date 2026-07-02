import { CategoryStatus } from '@/hooks/useCategoryBudgets';

interface CategoryGaugeProps {
  percentage: number;      // 0–100+ (capped or not)
  color: string;           // hex accent color when healthy
  size?: number;
  strokeWidth?: number;
  status: CategoryStatus;
}

const STATUS_COLOR: Record<CategoryStatus, string | null> = {
  ok: null,         // use the category's own color
  warning: 'hsl(var(--budget-warning))',
  exceeded: 'hsl(var(--budget-danger))',
  uncapped: 'hsl(var(--muted-foreground))',
};

// Soft glow tint per status — same hue as the ring, low alpha (no neon effect)
const STATUS_GLOW: Record<CategoryStatus, string | null> = {
  ok: null,          // use the category's own color
  warning: 'hsl(var(--budget-warning) / 0.35)',
  exceeded: 'hsl(var(--budget-danger) / 0.35)',
  uncapped: 'hsl(var(--muted-foreground) / 0.35)',
};

export function CategoryGauge({
  percentage,
  color,
  size = 68,
  strokeWidth = 5.5,
  status,
}: CategoryGaugeProps) {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp visual fill at 100 %; overflow shown as full red ring
  const visualPct = Math.min(percentage, 100);
  const offset = circumference - (visualPct / 100) * circumference;

  const strokeColor = STATUS_COLOR[status] ?? color;
  const glowColor = STATUS_GLOW[status] ?? `${color}59`;
  const isExceeded = status === 'exceeded';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />

      {/* Filled arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)',
          filter: `drop-shadow(0 0 4px ${glowColor})`,
        }}
      />

      {/* Overflow pulse ring (only when exceeded) */}
      {isExceeded && (
        <circle
          cx={center}
          cy={center}
          r={radius + strokeWidth * 0.7}
          fill="none"
          stroke="hsl(var(--budget-danger) / 0.3)"
          strokeWidth={strokeWidth * 0.6}
          strokeLinecap="round"
          strokeDasharray={circumference * 1.2}
          strokeDashoffset={0}
          style={{ animation: 'pulse 1.8s ease-in-out infinite' }}
        />
      )}
    </svg>
  );
}
