import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status da sessão com rótulo e variante únicos em lista, detalhe e edição
 * (revisão UX-16): "Finalizada" em contorno verde, "Em edição" em contorno
 * âmbar. O texto carrega o significado; a cor só reforça.
 */
export function SessionStatusBadge({
  isFinalized,
  className,
}: {
  isFinalized: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant={isFinalized ? "outline-success" : "outline-warning"}
      className={cn("text-foreground", className)}
    >
      {isFinalized ? "Finalizada" : "Em edição"}
    </Badge>
  );
}
