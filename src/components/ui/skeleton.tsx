import { cn } from "@/lib/utils"

/**
 * Skeleton - Componente de loading placeholder
 * Padronizado com opacity 0.1 e animation pulse de 2s
 * Usa tokens de border-radius do design system
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/10",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
