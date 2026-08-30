import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { daysAgo } from "@/utils/relativeDate";

interface StaleBadgeProps {
  /** Data do dado exibido ("YYYY-MM-DD" ou Date). */
  date: string | Date;
  /** Fonte do dado (ex.: "Oura", "Whoop") — prefixa o texto. */
  source?: string;
  /** A partir de quantos dias o dado é considerado velho (tom de alerta). */
  staleAfterDays?: number;
  /** Idade em dias já ancorada no calendário do produto (America/Sao_Paulo). */
  ageDays?: number;
  className?: string;
}

/**
 * Badge de staleness: declara DE QUANDO é o dado ("Oura · ontem") e passa
 * pra tom de alerta quando ele envelhece.
 *
 * Quem decide QUANDO renderizar é o call site: as abas Oura/Whoop mostram
 * sempre; o hero de Treinamento só com dado de 2+ dias (decisão de produto
 * ratificada em 28/08 — no fluxo normal a origem era ruído).
 */
export const StaleBadge = ({
  date,
  source,
  staleAfterDays = 2,
  ageDays,
  className,
}: StaleBadgeProps) => {
  // ageDays: idade em dias no CALENDÁRIO DO PRODUTO (spToday/SP) — sem ela,
  // texto e tom recalculavam pelo fuso do runtime e podiam divergir do gate
  // de quem renderiza o badge (revisão R8a).
  const effectiveAge = ageDays ?? daysAgo(date);
  const relative =
    effectiveAge <= 0 ? "hoje" : effectiveAge === 1 ? "ontem" : `há ${effectiveAge} dias`;
  const isStale = effectiveAge >= staleAfterDays;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal text-muted-foreground",
        isStale && "border-warning/50 text-warning",
        className,
      )}
    >
      {source ? `${source} · ${relative}` : relative}
    </Badge>
  );
};
