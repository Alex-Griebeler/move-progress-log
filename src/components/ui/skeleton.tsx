import { cn } from "@/lib/utils"

/**
 * Skeleton - Premium loading placeholder com shimmer effect
 * 
 * Features:
 * - Animação shimmer suave (2.5s loop)
 * - Gradiente premium com highlight sutil
 * - Responde ao prefers-reduced-motion
 * - Usa tokens do design system
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/20",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-muted/40 before:to-transparent",
        "before:animate-shimmer",
        "motion-reduce:before:animate-none motion-reduce:animate-pulse",
        className
      )}
      style={{
        backgroundSize: "200% 100%",
      }}
      {...props}
    />
  )
}

export { Skeleton }
