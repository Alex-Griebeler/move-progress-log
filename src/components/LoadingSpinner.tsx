import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export const LoadingSpinner = ({ 
  size = "md", 
  text = "Carregando...",
  className 
}: LoadingSpinnerProps) => {
  return (
    <div 
      className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 
        className={cn("animate-spin text-primary", sizeClasses[size])} 
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">
        {text}
      </p>
      <span className="sr-only">{text}</span>
    </div>
  );
};
