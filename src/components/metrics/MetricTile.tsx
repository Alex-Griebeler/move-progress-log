import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricTone } from "./ScoreRing";
import type { TileAlertSummary } from "@/utils/attentionAlerts";

export interface MetricDelta {
  /** Texto já formatado (ex.: "+4 vs 7d", "−2 bpm"). */
  text: string;
  direction: "up" | "down" | "flat";
  /** Se a direção é boa pro aluno (FC repouso caindo = down + positive). */
  positive?: boolean;
}

interface MetricTileProps {
  label: string;
  /** Valor principal já formatado; null/undefined renderiza "—". */
  value: string | number | null | undefined;
  unit?: string;
  delta?: MetricDelta;
  tone?: MetricTone;
  /** Slot pra sparkline/conteúdo extra abaixo do valor. */
  children?: ReactNode;
  footnote?: string;
  /**
   * Estado de atenção (refinamento R1): sinal do motor de alertas ancorado
   * NESTA métrica — borda sutil + rótulo curto, mensagem completa no nome
   * acessível. Agregação (maior severidade, "+N sinais") vem pronta do
   * partitionAlerts; o tile só apresenta.
   */
  alert?: TileAlertSummary | null;
  className?: string;
}

const DELTA_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

const TONE_VALUE: Record<MetricTone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  primary: "text-foreground",
  neutral: "text-foreground",
};

/**
 * Tile de métrica com delta e slot de sparkline. Substitui, NA FICHA DO
 * ALUNO, o padrão de StatCard (que permanece intocado no dashboard).
 */
export const MetricTile = ({
  label,
  value,
  unit,
  delta,
  tone = "neutral",
  children,
  footnote,
  alert,
  className,
}: MetricTileProps) => {
  const DeltaIcon = delta ? DELTA_ICON[delta.direction] : null;
  const deltaColor =
    delta?.positive === undefined
      ? "text-muted-foreground"
      : delta.positive
        ? "text-success"
        : "text-destructive";

  // `h-full` + coluna flex: num grid, os tiles de uma linha têm alturas de
  // conteúdo diferentes (só alguns têm footnote ou sparkline). Sem isso, o
  // item do grid estica mas o CARD dentro dele não, e a linha fica com
  // cards de tamanhos distintos e buracos embaixo dos menores.
  const alertBorder =
    alert?.level === "CRITICAL"
      ? "border-destructive/50"
      : alert
        ? "border-warning/50"
        : null;
  const alertText =
    alert?.level === "CRITICAL" ? "text-destructive" : "text-warning";

  return (
    <div
      role={alert ? "group" : undefined}
      aria-label={
        alert
          ? `${label}: ${value ?? "sem dado"}${unit ? ` ${unit}` : ""}. Atenção: ${alert.messages.join(" ")}`
          : undefined
      }
      className={cn(
        "flex h-full flex-col rounded-lg border bg-card p-3.5",
        alertBorder,
        className,
      )}
    >
      <p className="text-[10.5px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn("text-2xl font-semibold leading-none", TONE_VALUE[tone])}>
          {value ?? "—"}
        </span>
        {unit && value !== null && value !== undefined && (
          <span className="text-xs text-muted-foreground">{unit}</span>
        )}
        {delta && DeltaIcon && (
          <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", deltaColor)}>
            <DeltaIcon className="h-3 w-3" aria-hidden="true" />
            {delta.text}
          </span>
        )}
      </div>
      {children}
      {alert && (
        <p className={cn("mt-1 text-[11px] font-medium", alertText)} aria-hidden="true">
          {alert.label}
          {alert.extraCount > 0 && (
            <span className="ml-1 font-normal text-muted-foreground">
              +{alert.extraCount} {alert.extraCount === 1 ? "sinal" : "sinais"}
            </span>
          )}
        </p>
      )}
      {footnote && <p className="mt-auto pt-1.5 text-xs text-muted-foreground">{footnote}</p>}
    </div>
  );
};
