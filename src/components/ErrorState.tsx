import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  onDetails?: () => void;
  retryLabel?: string;
  detailsLabel?: string;
}

/**
 * Componente para exibir estados de erro com ações claras
 * Usado quando uma operação falha ou dados não podem ser carregados
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
}: ErrorStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center text-center gap-4 py-12 px-4"
      role="alert"
      aria-live="polite"
    >
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        
        {description && (
          <p className="text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {onRetry && (
          <Button onClick={onRetry} size="sm">
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
