import { cn } from "@/lib/utils";

export type MetricTone = "success" | "warning" | "destructive" | "primary" | "neutral";

interface ScoreRingProps {
  /** Score 0-100; null renderiza o anel vazio com "—". */
  value: number | null;
  /** hero = destaque da superfície; mini = strip/tile. */
  size?: "hero" | "mini";
  /** Rótulo curto sob o número (ex.: "prontidão"). */
  label?: string;
  tone?: MetricTone;
  className?: string;
}

const SIZES = {
  hero: { box: 150, radius: 64, stroke: 11, number: "text-4xl" },
  mini: { box: 72, radius: 30, stroke: 6, number: "text-lg" },
} as const;

const TONE_STROKE: Record<MetricTone, string> = {
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
  primary: "stroke-primary",
  neutral: "stroke-muted-foreground",
};

/**
 * Anel de score 0-100 (padrão Oura/Whoop). Texto usa tokens de texto — a
 * cor da série fica só no traço do anel, nunca no número.
 */
export const ScoreRing = ({
  value,
  size = "hero",
  label,
  tone = "primary",
  className,
}: ScoreRingProps) => {
  const s = SIZES[size];
  const circumference = 2 * Math.PI * s.radius;
  // Normaliza UMA vez: não-finito vira "sem dado"; fora de 0-100 é clampado
  // — arco, número exibido e aria-label sempre contam a mesma história.
  const score =
    value !== null && Number.isFinite(value)
      ? Math.round(Math.max(0, Math.min(100, value)))
      : null;
  const dash = ((score ?? 0) / 100) * circumference;
  const center = s.box / 2;

  return (
    <div
      role="img"
      aria-label={label ? `${label}: ${score ?? "sem dado"}` : String(score ?? "sem dado")}
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: s.box, height: s.box }}
    >
      <svg width={s.box} height={s.box} viewBox={`0 0 ${s.box} ${s.box}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={s.radius}
          fill="none"
          strokeWidth={s.stroke}
          className="stroke-muted"
        />
        {score !== null && (
          <circle
            cx={center}
            cy={center}
            r={s.radius}
            fill="none"
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className={cn("transition-all duration-500", TONE_STROKE[tone])}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold leading-none text-foreground", s.number)}>
          {score ?? "—"}
        </span>
        {label && size === "hero" && (
          <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
