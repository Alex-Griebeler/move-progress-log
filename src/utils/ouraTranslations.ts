// Traduções para atividades do Oura Ring
export const activityTranslations: Record<string, string> = {
  // Cardiovascular
  running: "Corrida",
  cycling: "Ciclismo",
  walking: "Caminhada",
  swimming: "Natação",
  rowing: "Remo",
  elliptical: "Elíptico",
  
  // Força e Resistência
  strength_training: "Treino de Força",
  weightlifting: "Musculação",
  functional_training: "Treino Funcional",
  cross_training: "Cross Training",
  
  // Esportes
  soccer: "Futebol",
  basketball: "Basquete",
  tennis: "Tênis",
  volleyball: "Vôlei",
  golf: "Golfe",
  
  // Mente e Corpo
  yoga: "Yoga",
  pilates: "Pilates",
  stretching: "Alongamento",
  meditation: "Meditação",
  
  // Outros
  hiking: "Caminhada/Trilha",
  dancing: "Dança",
  martial_arts: "Artes Marciais",
  boxing: "Boxe",
  climbing: "Escalada",
  skating: "Patinação",
  skiing: "Esqui",
  surfing: "Surf",
  other: "Outro",
};

export const translateActivity = (activity: string): string => {
  const translated = activityTranslations[activity.toLowerCase()];
  if (translated) return translated;
  
  // Fallback: capitalize and replace underscores
  return activity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Traduções para intensidade
export const intensityTranslations: Record<string, string> = {
  easy: "Leve",
  moderate: "Moderado",
  hard: "Intenso",
};

export const translateIntensity = (intensity: string | null): string => {
  if (!intensity) return "—";
  return intensityTranslations[intensity.toLowerCase()] || intensity;
};

// Traduções para níveis de resiliência
export const resilienceTranslations: Record<string, string> = {
  exceptional: "Excepcional",
  strong: "Forte",
  solid: "Sólida",
  adequate: "Adequada",
  limited: "Limitada",
  compromised: "Comprometida",
};

export const translateResilience = (level: string | null): string => {
  if (!level) return "Sem dados";
  return resilienceTranslations[level.toLowerCase()] || level;
};

// Traduções para day summary
export const daySummaryTranslations: Record<string, string> = {
  restored: "Restaurado",
  normal: "Normal",
  stressful: "Estressante",
  demanding: "Exigente",
  recovery: "Recuperação",
  good: "Bom",
};

export const translateDaySummary = (summary: string | null): string => {
  if (!summary) return "Sem dados";
  const lower = summary.toLowerCase();
  return daySummaryTranslations[lower] || summary.charAt(0).toUpperCase() + summary.slice(1);
};
