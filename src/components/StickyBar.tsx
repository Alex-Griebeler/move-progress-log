/**
 * StickyBar - Barra fixa para filtros/ações em listas longas
 * 
 * Features:
 * - Sticky positioning quando scroll passa threshold
 * - Smooth transition
 * - Sem layout shift
 * - Acessível
 */

import { ReactNode, useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface StickyBarProps {
  /**
   * Conteúdo da barra (filtros, botões, etc)
   */
  children: ReactNode;
  
  /**
   * Offset do topo em pixels (default: 0)
   */
  topOffset?: number;
  
  /**
   * Threshold para ativar sticky (pixels do topo)
   */
  threshold?: number;
  
  className?: string;
}

export const StickyBar = ({
  children,
  topOffset = 0,
  threshold = 100,
  className,
}: StickyBarProps) => {
  const [isSticky, setIsSticky] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        setIsSticky(window.scrollY > threshold);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);
  
  return (
    <div
      ref={barRef}
      className={cn(
        "transition-all duration-200",
        isSticky && [
          "sticky z-40 bg-background/95 backdrop-blur-sm",
          "border-b border-border shadow-sm",
          "py-3 -mx-4 px-4 md:-mx-6 md:px-6"
        ],
        className
      )}
      style={{
        top: isSticky ? `${topOffset}px` : undefined,
      }}
      role="region"
      aria-label="Barra de filtros e ações"
    >
      {children}
    </div>
  );
};