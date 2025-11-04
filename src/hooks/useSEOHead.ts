import { useEffect } from 'react';

interface SEOHeadOptions {
  canonical?: string | boolean; // URL completa ou true para usar URL atual
  robots?: {
    index?: boolean;
    follow?: boolean;
    noarchive?: boolean;
    nosnippet?: boolean;
    noimageindex?: boolean;
  };
}

/**
 * Hook para gerenciar canonical URLs e meta robots tags
 * Essencial para SEO: evita conteúdo duplicado e controla indexação
 * 
 * @param options - Configurações de SEO
 * @param options.canonical - URL canônica ou true para usar URL atual
 * @param options.robots - Diretivas para buscadores
 * 
 * @example
 * // URL canônica automática + indexação padrão
 * useSEOHead({ canonical: true });
 * 
 * @example
 * // URL canônica customizada + noindex
 * useSEOHead({ 
 *   canonical: "https://example.com/page",
 *   robots: { index: false, follow: true }
 * });
 * 
 * @example
 * // Página de busca/filtros (não indexar)
 * useSEOHead({ 
 *   canonical: true,
 *   robots: { index: false, follow: false }
 * });
 */
export const useSEOHead = (options: SEOHeadOptions = {}) => {
  useEffect(() => {
    // Gerenciar Canonical URL
    if (options.canonical) {
      // Remove canonical existente
      const existingCanonical = document.querySelector('link[rel="canonical"]');
      if (existingCanonical) {
        existingCanonical.remove();
      }

      // Cria novo canonical
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      
      // Se true, usa URL atual; se string, usa a URL fornecida
      canonical.href = options.canonical === true 
        ? window.location.href.split('?')[0].split('#')[0] // Remove query params e hash
        : options.canonical;
      
      document.head.appendChild(canonical);
    }

    // Gerenciar Meta Robots
    if (options.robots) {
      // Remove meta robots existente
      const existingRobots = document.querySelector('meta[name="robots"]');
      if (existingRobots) {
        existingRobots.remove();
      }

      // Cria array de diretivas
      const directives: string[] = [];
      
      // Index/NoIndex
      if (options.robots.index === false) {
        directives.push('noindex');
      } else if (options.robots.index === true) {
        directives.push('index');
      }
      
      // Follow/NoFollow
      if (options.robots.follow === false) {
        directives.push('nofollow');
      } else if (options.robots.follow === true) {
        directives.push('follow');
      }
      
      // Outras diretivas
      if (options.robots.noarchive) directives.push('noarchive');
      if (options.robots.nosnippet) directives.push('nosnippet');
      if (options.robots.noimageindex) directives.push('noimageindex');

      // Cria meta tag apenas se houver diretivas
      if (directives.length > 0) {
        const robots = document.createElement('meta');
        robots.name = 'robots';
        robots.content = directives.join(', ');
        document.head.appendChild(robots);
      }
    }

    // Cleanup
    return () => {
      if (options.canonical) {
        const canonicalToRemove = document.querySelector('link[rel="canonical"]');
        if (canonicalToRemove) {
          canonicalToRemove.remove();
        }
      }
      
      if (options.robots) {
        const robotsToRemove = document.querySelector('meta[name="robots"]');
        if (robotsToRemove) {
          robotsToRemove.remove();
        }
      }
    };
  }, [options.canonical, options.robots]);
};

/**
 * Presets comuns para diferentes tipos de páginas
 */
export const SEO_PRESETS = {
  // Páginas públicas principais (indexar tudo)
  public: {
    canonical: true as const,
    robots: { index: true, follow: true }
  },
  
  // Páginas privadas/admin (não indexar)
  private: {
    canonical: true as const,
    robots: { index: false, follow: false }
  },
  
  // Páginas de busca/filtros (não indexar, seguir links)
  search: {
    canonical: true as const,
    robots: { index: false, follow: true }
  },
  
  // Páginas temporárias (não indexar, não arquivar)
  temporary: {
    canonical: true as const,
    robots: { index: false, follow: false, noarchive: true }
  },
  
  // Páginas de detalhe (indexar, sem snippet)
  detail: {
    canonical: true as const,
    robots: { index: true, follow: true, nosnippet: false }
  }
} as const;
