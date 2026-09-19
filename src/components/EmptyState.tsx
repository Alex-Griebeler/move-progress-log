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
      <div
        className={cn(
          "rounded-xl p-md text-muted-foreground [&_svg]:h-6 [&_svg]:w-6",
          variantStyles[variant]
        )}
        aria-hidden="true"
      >
        {icon || <FileText className="h-6 w-6" />}
      </div>
      
      {/* Título e descrição com typography premium */}
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
      {(primaryAction || secondaryAction) && (
      <div className="flex flex-wrap gap-sm justify-center mt-xs">
        {primaryAction && (
          <Button onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button 
            variant="ghost" 
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
      )}
    </div>
  );
};

export default EmptyState;
