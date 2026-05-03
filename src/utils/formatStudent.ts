/**
 * Formatters para campos de aluno que precisam de mapeamento
 * domain value → presentation label.
 *
 * Padrão usado pelo app: enums no banco/zod são minúsculos sem til
 * ('iniciante' | 'intermediario' | 'avancado') porque é storage-friendly.
 * A UI precisa exibir capitalizado e acentuado ("Iniciante",
 * "Intermediário", "Avançado"). Antes desse helper, alguns lugares
 * mostravam o value cru ("avancado") ou usavam Tailwind `capitalize`
 * (que vira "Avancado", sem til). Aqui centralizamos a tradução.
 */

export type FitnessLevel = "iniciante" | "intermediario" | "avancado";

const FITNESS_LEVEL_LABELS: Record<FitnessLevel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

/**
 * Devolve o label em PT-BR para um valor de fitness_level. Aceita
 * `null`/`undefined` (devolve string vazia, útil pra render direto)
 * e qualquer valor inesperado (devolve o valor cru — não mascara
 * dado inconsistente).
 */
export const formatFitnessLevel = (
  level: FitnessLevel | null | undefined | string,
): string => {
  if (!level) return "";
  if (level in FITNESS_LEVEL_LABELS) {
    return FITNESS_LEVEL_LABELS[level as FitnessLevel];
  }
  return level;
};
