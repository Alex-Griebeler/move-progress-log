import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { daysAgo, formatRelativeDay } from "@/utils/relativeDate";

interface StaleBadgeProps {
  /** Data do dado exibido ("YYYY-MM-DD" ou Date). */
  date: string | Date;
  /** Fonte do dado (ex.: "Oura", "Whoop") — prefixa o texto. */
  source?: string;
  /** A partir de quantos dias o dado é considerado velho (tom de alerta). */
  staleAfterDays?: number;
  className?: string;
}

/**
 * Badge de staleness: toda métrica-herói declara DE QUANDO é o dado
 * ("Oura · ontem"). Passa pra tom de alerta quando o dado envelhece.
 */
export const StaleBadge = ({
  date,
  source,
  staleAfterDays = 2,
  className,
}: StaleBadgeProps) => {
  const relative = formatRelativeDay(date);
  const isStale = daysAgo(date) >= staleAfterDays;

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
