import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataErrorStateProps {
  /** O que falhou, em linguagem do coach (ex.: "as observações clínicas"). */
  what: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Estado de ERRO de dados — nunca renderizar vazio no lugar de falha
 * (regra transversal do redesign: erro ≠ "nenhum registro").
 */
export const DataErrorState = ({ what, onRetry, className }: DataErrorStateProps) => (
  <div className={cn("flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center", className)}>
    <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
    <p className="text-sm text-foreground">
      Não foi possível carregar {what}.
    </p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Tentar novamente
      </Button>
    )}
  </div>
);
