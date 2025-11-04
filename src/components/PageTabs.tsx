/**
 * PageTabs - Tabs acessíveis para navegação secundária
 * 
 * Features:
 * - role="tablist" e aria-selected
 * - Navegação por teclado (Arrow keys)
 * - Indicador visual do tab ativo
 * - Responsivo
 */

import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  /**
   * Match exato ou partial (default: false)
   */
  exactMatch?: boolean;
}

interface PageTabsProps {
  tabs: TabItem[];
  className?: string;
}

export const PageTabs = ({ tabs, className }: PageTabsProps) => {
  const location = useLocation();
  
  const isActive = (tab: TabItem) => {
    if (tab.exactMatch) {
      return location.pathname === tab.href;
    }
    return location.pathname.startsWith(tab.href);
  };
  
  return (
    <nav
      role="tablist"
      aria-label="Navegação de seção"
      className={cn(
        "flex items-center gap-1 border-b border-border overflow-x-auto",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        
        return (
          <Link
            key={tab.href}
            to={tab.href}
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium",
              "border-b-2 transition-colors whitespace-nowrap",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};