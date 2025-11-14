/**
 * SuccessState - Componente para feedback de sucesso
 * Design minimalista e positivo
 */

import { CheckCircle2, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SuccessStateProps {
  /**
   * Título do sucesso
   */
  title: string;
  /**
   * Mensagem descritiva (opcional)
   */
  message?: string;
  /**
   * Ícone customizado (opcional)
   * @default CheckCircle2
   */
  icon?: LucideIcon;
  /**
   * Call-to-action (opcional)
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "secondary" | "outline";
  };
  /**
   * Classes CSS adicionais
   */
  className?: string;
}

export const SuccessState = ({
  title,
  message,
  icon: Icon = CheckCircle2,
  action,
  className,
}: SuccessStateProps) => {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center p-xl",
        className
      )}
    >
      {/* Ícone */}
      <div className="mb-lg rounded-xl bg-success/10 p-lg">
        <Icon className="h-12 w-12 text-success" aria-hidden="true" />
      </div>

      {/* Título */}
      <h3 className="text-lg font-semibold text-foreground mb-sm">
        {title}
      </h3>

      {/* Mensagem */}
      {message && (
        <p className="text-muted-foreground text-sm max-w-md mb-lg leading-relaxed">
          {message}
        </p>
      )}

      {/* Call-to-action */}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "success"}
          className="mt-sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
