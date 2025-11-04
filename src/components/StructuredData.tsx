import { useEffect } from 'react';

interface StructuredDataProps {
  data: object;
  id?: string;
}

/**
 * Componente para injetar structured data (JSON-LD) no head
 * Usado para rich snippets do Google e melhor SEO
 * 
 * @param data - Objeto com schema.org structured data
 * @param id - ID único para o script tag (padrão: "structured-data")
 * 
 * @example
 * <StructuredData data={{
 *   "@context": "https://schema.org",
 *   "@type": "Organization",
 *   "name": "Fabrik Performance"
 * }} />
 */
export const StructuredData = ({ data, id = "structured-data" }: StructuredDataProps) => {
  useEffect(() => {
    // Remove script existente se houver
    const existingScript = document.getElementById(id);
    if (existingScript) {
      existingScript.remove();
    }

    // Cria novo script com structured data
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);

    // Cleanup: remove ao desmontar
    return () => {
      const scriptToRemove = document.getElementById(id);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [data, id]);

  return null; // Component não renderiza nada visível
};
