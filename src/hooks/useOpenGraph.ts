import { useEffect } from 'react';

interface OpenGraphOptions {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile' | 'product';
  url?: string | boolean; // URL completa ou true para usar URL atual
  siteName?: string;
  locale?: string;
  // Twitter Card específico
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
}

/**
 * Hook para gerenciar Open Graph e Twitter Card meta tags
 * Essencial para previews bonitos em redes sociais (Facebook, Twitter, LinkedIn, WhatsApp)
 * 
 * @param options - Configurações de Open Graph
 * 
 * @example
 * useOpenGraph({
 *   title: "Fabrik Performance - Studio Boutique",
 *   description: "Treinamento funcional de alta intensidade com mindfulness",
 *   image: "/logo-fabrik.webp",
 *   type: "website"
 * });
 */
export const useOpenGraph = (options: OpenGraphOptions = {}) => {
  useEffect(() => {
    const metaTags: Array<{ property?: string; name?: string; content: string }> = [];

    // Open Graph Tags
    if (options.title) {
      metaTags.push({ property: 'og:title', content: options.title });
    }

    if (options.description) {
      metaTags.push({ property: 'og:description', content: options.description });
    }

    if (options.image) {
      // Se for caminho relativo, converte para URL absoluta
      const imageUrl = options.image.startsWith('http') 
        ? options.image 
        : `${window.location.origin}${options.image}`;
      metaTags.push({ property: 'og:image', content: imageUrl });
      metaTags.push({ property: 'og:image:secure_url', content: imageUrl });
      metaTags.push({ property: 'og:image:type', content: 'image/webp' });
      metaTags.push({ property: 'og:image:width', content: '1200' });
      metaTags.push({ property: 'og:image:height', content: '630' });
      metaTags.push({ property: 'og:image:alt', content: options.title || 'Fabrik Performance' });
    }

    if (options.type) {
      metaTags.push({ property: 'og:type', content: options.type });
    }

    if (options.url) {
      const urlContent = options.url === true 
        ? window.location.href.split('?')[0].split('#')[0]
        : options.url;
      metaTags.push({ property: 'og:url', content: urlContent });
    }

    if (options.siteName) {
      metaTags.push({ property: 'og:site_name', content: options.siteName });
    }

    if (options.locale) {
      metaTags.push({ property: 'og:locale', content: options.locale });
    }

    // Twitter Card Tags
    if (options.twitterCard) {
      metaTags.push({ name: 'twitter:card', content: options.twitterCard });
    }

    if (options.title) {
      metaTags.push({ name: 'twitter:title', content: options.title });
    }

    if (options.description) {
      metaTags.push({ name: 'twitter:description', content: options.description });
    }

    if (options.image) {
      const imageUrl = options.image.startsWith('http') 
        ? options.image 
        : `${window.location.origin}${options.image}`;
      metaTags.push({ name: 'twitter:image', content: imageUrl });
      metaTags.push({ name: 'twitter:image:alt', content: options.title || 'Fabrik Performance' });
    }

    if (options.twitterSite) {
      metaTags.push({ name: 'twitter:site', content: options.twitterSite });
    }

    if (options.twitterCreator) {
      metaTags.push({ name: 'twitter:creator', content: options.twitterCreator });
    }

    // Remove meta tags existentes
    const existingTags = document.querySelectorAll(
      'meta[property^="og:"], meta[name^="twitter:"]'
    );
    existingTags.forEach(tag => tag.remove());

    // Adiciona novas meta tags
    metaTags.forEach(({ property, name, content }) => {
      const meta = document.createElement('meta');
      if (property) meta.setAttribute('property', property);
      if (name) meta.setAttribute('name', name);
      meta.content = content;
      document.head.appendChild(meta);
    });

    // Cleanup
    return () => {
      const tagsToRemove = document.querySelectorAll(
        'meta[property^="og:"], meta[name^="twitter:"]'
      );
      tagsToRemove.forEach(tag => tag.remove());
    };
  }, [
    options.title,
    options.description,
    options.image,
    options.type,
    options.url,
    options.siteName,
    options.locale,
    options.twitterCard,
    options.twitterSite,
    options.twitterCreator,
  ]);
};

/**
 * Presets comuns para diferentes tipos de páginas
 */
export const OG_PRESETS = {
  // Homepage/Landing page
  home: {
    type: 'website' as const,
    siteName: 'Fabrik Performance',
    locale: 'pt_BR',
    twitterCard: 'summary_large_image' as const,
  },

  // Página de artigo/blog
  article: {
    type: 'article' as const,
    siteName: 'Fabrik Performance',
    locale: 'pt_BR',
    twitterCard: 'summary_large_image' as const,
  },

  // Perfil de usuário/aluno
  profile: {
    type: 'profile' as const,
    siteName: 'Fabrik Performance',
    locale: 'pt_BR',
    twitterCard: 'summary' as const,
  },

  // Produto/serviço
  product: {
    type: 'product' as const,
    siteName: 'Fabrik Performance',
    locale: 'pt_BR',
    twitterCard: 'summary_large_image' as const,
  },
} as const;

/**
 * Valores padrão para Fabrik Performance
 */
export const FABRIK_OG_DEFAULTS = {
  siteName: 'Fabrik Performance',
  locale: 'pt_BR',
  image: '/logo-fabrik.webp', // Logo padrão
  twitterCard: 'summary_large_image' as const,
  description: 'Studio Boutique de alta performance no Lago Sul, Brasília. Método exclusivo Body & Mind Fitness: treinamento funcional HIIT, mindfulness, yoga e recuperação.',
};
