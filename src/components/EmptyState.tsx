import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

/**
 * Componente para exibir estados vazios com ações claras
 * Usado quando não há dados para exibir (listagens vazias, filtros sem resultado, etc.)
 * 
 * @example
 * <EmptyState
 *   icon={<Users className="h-6 w-6" />}
 *   title="Nenhum aluno cadastrado"
 *   description="Comece adicionando seu primeiro aluno"
 *   primaryAction={{
 *     label: "Adicionar aluno",
 *     onClick: () => openDialog()
 *   }}
 * />
 */
const EmptyState = ({ 
  title = "Nada por aqui ainda", 
  description = "Comece criando um novo item",
  primaryAction,
  secondaryAction,
  icon
}: EmptyStateProps) => {
  return (
    <div 
      className="flex flex-col items-center justify-center text-center gap-4 py-12 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-full bg-muted p-3">
        {icon || <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
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
        {primaryAction && (
          <Button onClick={primaryAction.onClick} size="sm">
            {primaryAction.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button 
            variant="outline" 
            onClick={secondaryAction.onClick}
            size="sm"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
