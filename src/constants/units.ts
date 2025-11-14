/**
 * Constantes de Unidades e Validação de Carga
 * Fonte única de verdade para conversões e limites
 */

/**
 * Conversão de libras para quilogramas
 * Padrão Fabrik: 1 lb = 0.45 kg (simplificado)
 */
export const POUND_TO_KG_CONVERSION = 0.45;

/**
 * Limites de carga válida em quilogramas
 * Min: 0kg (peso corporal sem carga)
 * Max: 1000kg (limite prático para treinos)
 */
export const MIN_LOAD_KG = 0;
export const MAX_LOAD_KG = 1000;

/**
 * Casas decimais para arredondamento de carga
 * Sempre arredondar para 1 casa decimal
 */
export const DECIMAL_PLACES = 1;

/**
 * Arredonda valor para número específico de casas decimais
 * @param value - Valor a ser arredondado
 * @param decimals - Número de casas decimais (padrão: 1)
 * @returns Valor arredondado
 */
export const roundToDecimal = (value: number, decimals: number = DECIMAL_PLACES): number => {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
};

/**
 * Converte libras para quilogramas com arredondamento
 * @param pounds - Valor em libras
 * @returns Valor em quilogramas arredondado para 1 casa decimal
 */
export const poundsToKg = (pounds: number): number => {
  return roundToDecimal(pounds * POUND_TO_KG_CONVERSION);
};

/**
 * Valida se um valor de carga está dentro dos limites aceitáveis
 * @param loadKg - Valor de carga em quilogramas
 * @returns true se válido, false caso contrário
 */
export const isValidLoad = (loadKg: number | null): boolean => {
  if (loadKg === null) return true; // null é válido (peso corporal, elástico, etc)
  return loadKg >= MIN_LOAD_KG && loadKg <= MAX_LOAD_KG;
};

/**
 * Retorna mensagem de erro para carga inválida
 * @param loadKg - Valor de carga em quilogramas
 * @returns Mensagem de erro ou null se válido
 */
export const getLoadErrorMessage = (loadKg: number | null): string | null => {
  if (loadKg === null) return null;
  
  if (loadKg < MIN_LOAD_KG) {
    return `Carga mínima: ${MIN_LOAD_KG}kg`;
  }
  
  if (loadKg > MAX_LOAD_KG) {
    return `Carga máxima: ${MAX_LOAD_KG}kg`;
  }
  
  return null;
};
