/**
 * LazyChart - AUD-007
 * Wrapper para gráficos com lazy loading usando Intersection Observer
 * Renderiza gráficos apenas quando ficam visíveis no viewport
 */

import { ReactNode, useEffect, useRef, useState } from 'react';
import { Skeleton } from './ui/skeleton';

interface LazyChartProps {
  children: ReactNode;
  height?: string | number;
  className?: string;
}

export const LazyChart = ({ children, height = 250, className = '' }: LazyChartProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect(); // Stop observing after first render
          }
        });
      },
      {
        rootMargin: '100px', // Load 100px before entering viewport
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={className} style={{ height }}>
      {isVisible ? (
        children
      ) : (
        <Skeleton className="w-full h-full" />
      )}
    </div>
  );
};
