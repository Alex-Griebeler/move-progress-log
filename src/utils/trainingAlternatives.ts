/**
 * Alternativas de treino por zona de recuperação (extraído do dashboard na
 * R2 pra ser testável) — dados puros, sem estado.
 */

export type RecommendationZoneLabel = "green_high" | "green" | "yellow" | "orange" | "red";

/**
 * Alternativas pela ZONA FINAL do motor. O recálculo antigo pelo score cru
 * ignorava fadiga acumulada e override agudo: um aluno rebaixado de zona
 * pelo override via alternativas da zona de cima.
 */
export const getTrainingAlternativesForZone = (
  zone: RecommendationZoneLabel | null,
  fallbackScore: number,
) => {
  if (zone !== null) {
    const zoneScore =
      zone === "green_high" ? 90 : zone === "green" ? 70 : zone === "yellow" ? 50 : zone === "orange" ? 30 : 0;
    return getTrainingAlternatives(zoneScore);
  }
  return getTrainingAlternatives(fallbackScore);
};

const getTrainingAlternatives = (rs: number) => {
  if (rs >= 85) {
    return [
      { type: "Desafio Máximo Recomendado", description: "Score no topo da faixa — dia adequado para buscar recordes pessoais." },
      { type: "Treino Normal Intenso", description: "Alta intensidade dentro do programado." },
      { type: "Volume Alto", description: "Bom dia para treinos longos ou múltiplas sessões." },
    ];
  } else if (rs >= 65) {
    return [
      { type: "Treino Completo (Recomendado)", description: "Executar o treino programado normalmente, com cargas habituais." },
      { type: "Redução Leve (10%)", description: "Se houver fadiga durante o treino, reduzir levemente volume ou intensidade." },
      { type: "Foco Técnico", description: "Priorizar qualidade de movimento sobre carga máxima." },
    ];
  } else if (rs >= 45) {
    return [
      { type: "Redução Moderada (Recomendado)", description: "Reduzir 20-30% do volume ou intensidade — carga mais leve pra seguir progredindo." },
      { type: "Recuperação Ativa", description: "Alternativa mais segura: mobilidade leve, yoga ou caminhada." },
      { type: "Descanso Completo", description: "Com sintomas de overtraining (fadiga intensa, dor persistente), optar por descanso." },
    ];
  } else if (rs >= 25) {
    return [
      { type: "Recuperação Ativa (Recomendado)", description: "Movimento leve apenas: alongamento dinâmico, yoga suave ou caminhada de 20-30 min." },
      { type: "Descanso Completo", description: "Com cansaço acentuado, priorizar descanso total." },
      { type: "Protocolos de Recuperação", description: "Focar nos protocolos recomendados (crioterapia, respiração, mindfulness)." },
    ];
  }
  return [
    { type: "Descanso Obrigatório", description: "Recuperação muito baixa hoje — descanso é a conduta recomendada." },
    { type: "Protocolos de Recuperação", description: "Focar nos protocolos prioritários do dia (banho de contraste, respiração lenta, descanso)." },
    { type: "Avaliação Médica", description: "Se o quadro persistir por 3+ dias, considerar avaliação médica/fisioterapia." },
  ];
};
