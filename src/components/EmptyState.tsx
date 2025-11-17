import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

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
  className?: string;
  /**
   * Variant para diferentes contextos
   */
  variant?: "default" | "info" | "warning";
}

/**
 * EmptyState - Componente premium para estados vazios
 * Atualizado com tokens de spacing, typography e design system (Etapa 3)
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
  icon,
  className,
  variant = "default"
}: EmptyStateProps) => {
  
  const variantStyles = {
    default: "bg-muted/50",
    info: "bg-primary/10",
    warning: "bg-warning/10"
  };
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center gap-md py-xl px-lg",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Ícone com background premium */}
      <div className={cn(
        "rounded-radius-xl p-lg shadow-subtle",
        variantStyles[variant]
      )}>
        {icon || <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
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
