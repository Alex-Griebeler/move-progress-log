/**
 * Utilitários para gerar structured data (JSON-LD) schema.org
 * Facilita criação de rich snippets para Google
 */

const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : '';
const getHref = () => typeof window !== 'undefined' ? window.location.href : '';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PersonSchema {
  name: string;
  email?: string;
  description?: string;
}

/**
 * Schema para Organization - Informações da empresa
 * Usado em todas as páginas principais
 */
export const getOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "name": "Fabrik Performance",
  "description": "Studio boutique sofisticado e exclusivo com método Body & Mind Fitness. Treinamento funcional de alta intensidade, mindfulness e técnicas de respiração no Lago Sul, Brasília.",
  "url": getOrigin(),
  "logo": `${getOrigin()}/logo-fabrik.webp`,
  "image": `${getOrigin()}/logo-fabrik.webp`,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Brasília",
    "addressRegion": "DF",
    "addressCountry": "BR",
    "postalCode": "71680-000",
    "streetAddress": "Lago Sul"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "-15.8267",
    "longitude": "-47.9218"
  },
  "priceRange": "Premium",
  "amenityFeature": [
    {
      "@type": "LocationFeatureSpecification",
      "name": "HIIT Training"
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Functional Training"
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Yoga"
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Mindfulness"
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Cold Exposure"
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Heat Exposure"
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Physiotherapy"
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Nutrition Counseling"
    }
  ],
  "knowsAbout": [
    "Functional Training",
    "High Intensity Interval Training",
    "Recovery Protocols",
    "Mindfulness",
    "Performance Optimization",
    "Oura Ring Integration"
  ]
});

/**
 * Schema para BreadcrumbList - Navegação hierárquica
 * Melhora navegação nos resultados do Google
 */
export const getBreadcrumbSchema = (items: BreadcrumbItem[]) => {
  const listItems = items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.label,
    "item": item.href ? `${getOrigin()}${item.href}` : undefined
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": listItems
  };
};

/**
 * Schema para WebPage - Página web genérica
 * Adiciona contexto sobre cada página
 */
export const getWebPageSchema = (title: string, description: string) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": title,
  "description": description,
  "url": getHref(),
  "isPartOf": {
    "@type": "WebSite",
    "name": "Fabrik Performance",
    "url": getOrigin()
  },
  "inLanguage": "pt-BR"
});

/**
 * Schema para Person - Perfil de pessoa (aluno/treinador)
 * Usado em páginas de detalhes de pessoas
 */
export const getPersonSchema = (person: PersonSchema) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "name": person.name,
  "email": person.email,
  "description": person.description || `Aluno da Fabrik Performance - ${person.name}`,
  "memberOf": {
    "@type": "SportsActivityLocation",
    "name": "Fabrik Performance"
  }
});

/**
 * Schema para ExerciseAction - Atividade física/treino
 * Usado para representar sessões de treino
 */
export const getExerciseActionSchema = (exerciseName: string, date: string) => ({
  "@context": "https://schema.org",
  "@type": "ExerciseAction",
  "name": exerciseName,
  "actionStatus": "CompletedActionStatus",
  "startTime": date,
  "exerciseCourse": {
    "@type": "Place",
    "name": "Fabrik Performance"
  }
});

/**
 * Schema para Course/TrainingProgram - Programa de treino/prescrição
 * Usado para prescrições de treino
 */
export const getTrainingProgramSchema = (
  name: string,
  description: string,
  objective?: string
) => ({
  "@context": "https://schema.org",
  "@type": "Course",
  "name": name,
  "description": description || objective,
  "provider": {
    "@type": "SportsActivityLocation",
    "name": "Fabrik Performance"
  },
  "courseWorkload": "Personalizado",
  "inLanguage": "pt-BR"
});

/**
 * Schema para ItemList - Lista de itens (exercícios, alunos, etc)
 * Usado em páginas de listagem
 */
export const getItemListSchema = (
  items: Array<{ name: string; url?: string }>,
  listName: string
) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": listName,
  "numberOfItems": items.length,
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "url": item.url ? `${getOrigin()}${item.url}` : undefined
  }))
});

/**
 * Schema combinado para WebApplication - Aplicação web
 * Define a aplicação como um todo
 */
export const getWebApplicationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Fabrik Performance System",
  "description": "Sistema de registro e acompanhamento de treinos com integração Oura Ring",
  "url": getOrigin(),
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "BRL"
  },
  "featureList": [
    "Registro de treinos",
    "Biblioteca de exercícios",
    "Prescrições personalizadas",
    "Protocolos de recuperação",
    "Integração Oura Ring",
    "Métricas de performance",
    "Análise de dados"
  ],
  "provider": {
    "@type": "SportsActivityLocation",
    "name": "Fabrik Performance"
  }
});
