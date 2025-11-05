/**
 * PageLayout - Layout padronizado para todas as páginas
 * 
 * Features:
 * - Skip to main content link para acessibilidade
 * - Estrutura HTML semântica
 * - Container responsivo
 * - Suporte a Structured Data
 */

import { ReactNode } from "react";
import { SkipToContent } from "@/components/SkipToContent";
import { StructuredData } from "@/components/StructuredData";
import { getOrganizationSchema } from "@/utils/structuredData";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  /**
   * Structured data adicional para a página
   * Organization schema é incluído automaticamente
   */
  structuredData?: Array<{
    data: object;
    id: string;
  }>;
}

export const PageLayout = ({ children, className, structuredData }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <SkipToContent />
      
      {/* Organization schema sempre presente */}
      <StructuredData data={getOrganizationSchema()} id="org-schema" />
      
      {/* Schemas adicionais da página */}
      {structuredData?.map(({ data, id }) => (
        <StructuredData key={id} data={data} id={id} />
      ))}
      
      <main 
        id="main-content" 
        className={cn("container mx-auto px-4 md:px-6 py-6 space-y-6 max-w-7xl", className)}
        role="main"
      >
        {children}
      </main>
    </div>
  );
};