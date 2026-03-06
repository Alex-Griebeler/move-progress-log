import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  onDetails?: () => void;
  retryLabel?: string;
  detailsLabel?: string;
  className?: string;
}

/**
 * ErrorState - Componente premium para estados de erro
 * Atualizado com tokens de spacing, typography e design system (Etapa 3)
 * 
 * @example
 * <ErrorState
 *   title="Erro ao carregar alunos"
 *   description="Não foi possível conectar ao servidor"
 *   onRetry={() => refetch()}
 * />
 */
export function ErrorState({
  title,
  description,
  onRetry,
  onDetails,
  retryLabel = "Tentar novamente",
  detailsLabel = "Ver detalhes",
  className,
}: ErrorStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center gap-md py-xl px-lg",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Ícone com background premium */}
      <div className="rounded-radius-xl bg-destructive/10 p-lg shadow-subtle">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      
      {/* Título e descrição com typography premium */}
      <div className="space-y-sm">
        <h3 className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        
        {description && (
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Actions com spacing premium */}
      <div className="flex flex-wrap gap-sm justify-center mt-sm">
        {onRetry && (
          <Button onClick={onRetry} size="sm" variant="destructive">
            {retryLabel}
          </Button>
        )}
        
        {onDetails && (
          <Button 
            variant="outline" 
            onClick={onDetails}
            size="sm"
          >
            {detailsLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
