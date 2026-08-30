/**
 * Alternativas de treino por zona de recuperação (extraído do dashboard na
 * R2 pra ser testável) — dados puros, sem estado.
 *
 * R8b: cada alternativa carrega semântica operacional {targetZone,
 * targetLoadDecision, targetAdjustmentPercent} — a escolha vira CONDUTA
 * pelo funil do effectiveConduct (nunca contorna percepção/pisos/zona 4).
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
      { type: "Desafio Máximo Recomendado", description: "Score no topo da faixa — dia adequado para buscar recordes pessoais.", targetZone: 4 as const, targetLoadDecision: "increase" as const, targetAdjustmentPercent: 5 },
      { type: "Treino Normal Intenso", description: "Alta intensidade dentro do programado.", targetZone: 3 as const, targetLoadDecision: "maintain" as const, targetAdjustmentPercent: 0 },
      { type: "Volume Alto", description: "Bom dia para treinos longos ou múltiplas sessões.", targetZone: 3 as const, targetLoadDecision: "maintain" as const, targetAdjustmentPercent: 0 },
    ];
  } else if (rs >= 65) {
    return [
      { type: "Treino Completo (Recomendado)", description: "Executar o treino programado normalmente, com cargas habituais.", targetZone: 3 as const, targetLoadDecision: "maintain" as const, targetAdjustmentPercent: 0 },
      { type: "Redução Leve (10%)", description: "Se houver fadiga durante o treino, reduzir levemente volume ou intensidade.", targetZone: 2 as const, targetLoadDecision: "reduce" as const, targetAdjustmentPercent: -10 },
      { type: "Foco Técnico", description: "Priorizar qualidade de movimento sobre carga máxima.", targetZone: 2 as const, targetLoadDecision: "reduce" as const, targetAdjustmentPercent: -10 },
    ];
  } else if (rs >= 45) {
    return [
      { type: "Redução Moderada (Recomendado)", description: "Reduzir 20-30% do volume ou intensidade — carga mais leve pra seguir progredindo.", targetZone: 2 as const, targetLoadDecision: "reduce" as const, targetAdjustmentPercent: -20 },
      { type: "Recuperação Ativa", description: "Mobilidade leve, yoga ou caminhada.", targetZone: 1 as const, targetLoadDecision: "block" as const, targetAdjustmentPercent: null },
      { type: "Descanso Completo", description: "Com fadiga intensa ou dor persistente, optar por descanso.", targetZone: 0 as const, targetLoadDecision: "block" as const, targetAdjustmentPercent: null },
    ];
  } else if (rs >= 25) {
    return [
      { type: "Recuperação Ativa (Recomendado)", description: "Movimento leve apenas: alongamento dinâmico, yoga suave ou caminhada de 20-30 min.", targetZone: 1 as const, targetLoadDecision: "block" as const, targetAdjustmentPercent: null },
      { type: "Descanso Completo", description: "Com cansaço acentuado, priorizar descanso total.", targetZone: 0 as const, targetLoadDecision: "block" as const, targetAdjustmentPercent: null },
      { type: "Protocolos de Recuperação", description: "Focar nos protocolos recomendados (crioterapia, respiração, mindfulness).", targetZone: 0 as const, targetLoadDecision: "block" as const, targetAdjustmentPercent: null },
    ];
  }
  return [
    { type: "Descanso Obrigatório", description: "Recuperação muito baixa hoje — descanso é a conduta recomendada.", targetZone: 0 as const, targetLoadDecision: "block" as const, targetAdjustmentPercent: null },
    { type: "Protocolos de Recuperação", description: "Focar nos protocolos prioritários do dia (banho de contraste, respiração lenta, descanso).", targetZone: 0 as const, targetLoadDecision: "block" as const, targetAdjustmentPercent: null },
    { type: "Avaliação Médica", description: "Se o quadro persistir por 3+ dias, considerar avaliação médica/fisioterapia.", targetZone: 0 as const, targetLoadDecision: "block" as const, targetAdjustmentPercent: null },
  ];
};
