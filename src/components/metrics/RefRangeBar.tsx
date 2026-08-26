import { cn } from "@/lib/utils";
import type { MetricTone } from "./ScoreRing";

export interface RefBand {
  label: string;
  /** Limite inferior (inclusivo) no domínio da escala. */
  from: number;
  /** Limite superior no domínio da escala. */
  to: number;
  tone: MetricTone;
}

interface RefRangeBarProps {
  /** Faixas contíguas em ordem crescente cobrindo [min, max]. */
  bands: RefBand[];
  /** Valor do aluno; null esconde o marcador. */
  value: number | null;
  min: number;
  max: number;
  className?: string;
}

const TONE_BG: Record<MetricTone, string> = {
  success: "bg-success/40",
  warning: "bg-warning/40",
  destructive: "bg-destructive/40",
  primary: "bg-primary/40",
  neutral: "bg-muted",
};

/**
 * Faixa de referência com marcador posicional (avaliações: sit-to-stand,
 * VO₂, handgrip — só tipos COM faixas no banco). Identidade das faixas
 * nunca é só cor: cada uma tem rótulo com o intervalo.
 */
export const RefRangeBar = ({ bands, value, min, max, className }: RefRangeBarProps) => {
  const span = max - min || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Marcador vive no wrapper (fora do overflow-hidden do trilho) pra
          não ser cortado em value === max; bandas em posição ABSOLUTA por
          `from` — flex empacotaria errado faixas não-contíguas. */}
      <div className="relative h-2.5">
        <div className="absolute inset-0 overflow-hidden rounded-full bg-muted">
          {bands.map((b) => (
            <div
              key={b.label}
              className={cn("absolute inset-y-0", TONE_BG[b.tone])}
              style={{ left: `${pct(b.from)}%`, width: `${pct(b.to) - pct(b.from)}%` }}
            />
          ))}
        </div>
        {value !== null && Number.isFinite(value) && (
          <div
            aria-label={`valor: ${value}`}
            className="absolute -top-0.5 h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${pct(value)}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {bands.map((b) => (
          <span key={b.label}>
            {b.label} {b.from}–{b.to}
          </span>
        ))}
      </div>
    </div>
  );
};
