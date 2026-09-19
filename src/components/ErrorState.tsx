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
    >
      <div className="rounded-xl bg-destructive/10 p-md">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      
      <div className="space-y-1">
        <h3 className="text-h3 text-foreground">
          {title}
        </h3>
        
        {description && (
          <p className="text-body-sm text-muted-foreground max-w-md">
            {description}
          </p>
        )}
      </div>

      {/* Actions com spacing premium */}
      {(onRetry || onDetails) && (
      <div className="flex flex-wrap gap-sm justify-center mt-xs">
        {/* Tentar de novo não é destrutivo: botão neutro. */}
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            {retryLabel}
          </Button>
        )}
        
        {onDetails && (
          <Button 
            variant="ghost" 
            onClick={onDetails}
          >
            {detailsLabel}
          </Button>
        )}
      </div>
      )}
    </div>
  );
}
