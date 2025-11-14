/**
 * PageHeader - Cabeçalho padronizado para páginas
 * 
 * Features:
 * - Título e descrição opcional
 * - Breadcrumbs integrados
 * - Área de ações (botões, filtros, etc)
 * - Responsivo e acessível
 */

import { ReactNode } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

interface PageHeaderProps {
  /**
   * Título principal da página
   */
  title: string;
  
  /**
   * Descrição/subtítulo opcional
   */
  description?: string;
  
  /**
   * Breadcrumbs para navegação
   * Home sempre incluído automaticamente
   */
  breadcrumbs?: BreadcrumbItem[];
  
  /**
   * Ações/botões no canto direito
   */
  actions?: ReactNode;
  
  /**
   * Conteúdo adicional abaixo do cabeçalho (tabs, filtros, etc)
   */
  children?: ReactNode;
  
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  breadcrumbs = [],
  actions,
  children,
  className,
}: PageHeaderProps) => {
  return (
    <header className={cn("space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}
      
      {/* Título e Ações */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-sm flex-1">
          <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        
        {/* Ações */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      
      {/* Conteúdo adicional (tabs, filtros secundários, etc) */}
      {children}
    </header>
  );
};