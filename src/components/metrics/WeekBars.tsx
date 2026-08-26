import { cn } from "@/lib/utils";

export interface WeekBarPoint {
  /** Rótulo curto da semana (ex.: "18/08"). */
  label: string;
  value: number;
  /** Meta da semana (barra atinge tom de sucesso quando value >= target). */
  target?: number;
}

interface WeekBarsProps {
  weeks: WeekBarPoint[];
  className?: string;
}

/**
 * Micro-barras de frequência semanal (sessões/semana). Sem eixo — o
 * rótulo de cada barra e o title carregam o valor; para análise fina
 * existe o TrendChart.
 */
export const WeekBars = ({ weeks, className }: WeekBarsProps) => {
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.value, w.target ?? 0)));

  return (
    <div className={cn("flex items-end gap-1.5", className)} role="img" aria-label="Frequência semanal">
      {weeks.map((w) => {
        const met = w.target !== undefined && w.value >= w.target;
        return (
          <div key={w.label} className="flex flex-col items-center gap-1" title={`${w.label}: ${w.value}`}>
            <div className="flex h-10 w-4 items-end rounded-sm bg-muted">
              <div
                className={cn("w-full rounded-sm", met ? "bg-success" : "bg-primary")}
                style={{ height: `${Math.round((w.value / max) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] leading-none text-muted-foreground">{w.label}</span>
          </div>
        );
      })}
    </div>
  );
};
