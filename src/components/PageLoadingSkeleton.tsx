/**
 * PageLoadingSkeleton - Esqueleto estrutural de página
 *
 * Régua 8 (motion com propósito): o layout inteiro aparece de uma vez, com um
 * único fade de 200ms (`animate-fade-in`, zerado por prefers-reduced-motion no
 * CSS global). Sem stagger, sem deslizamento por JS e sem overlay de spinner.
 */

import { Skeleton } from "@/components/ui/skeleton";

interface PageLoadingSkeletonProps {
  /**
   * Tipo de layout da página sendo carregada
   */
  layout?: "dashboard" | "list" | "detail" | "form";

  /**
   * Mantido por compatibilidade com chamadores antigos; o anúncio de
   * carregamento agora é sempre só para leitor de tela.
   * @deprecated
   */
  showSpinner?: boolean;
}

export const PageLoadingSkeleton = ({ layout = "list" }: PageLoadingSkeletonProps) => {
  return (
    <div
      className="container mx-auto px-4 md:px-6 py-6 space-y-6 max-w-7xl animate-fade-in"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Carregando página</span>

      {/* Cabeçalho */}
      <div className="space-y-2 pb-4 border-b border-border" aria-hidden="true">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {layout === "dashboard" && (
        <div className="space-y-4" aria-hidden="true">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {layout === "list" && (
        <div className="space-y-4" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      )}

      {layout === "detail" && (
        <div className="space-y-6" aria-hidden="true">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {layout === "form" && (
        <div className="max-w-2xl mx-auto space-y-6" aria-hidden="true">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-12 w-32 rounded-lg" />
        </div>
      )}
    </div>
  );
};
