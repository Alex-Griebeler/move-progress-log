/**
 * Formatação de APRESENTAÇÃO da recomendação de treino (refinamento R1).
 *
 * As strings do motor não mudam (contrato + testes existentes); a tela é que
 * passa a exibir versões enxutas. Princípio ratificado: score → interpretação
 * → recomendação, com a referência completa (zonas/FCmáx) no accordion.
 */

/**
 * Rótulo curto da zona de recuperação do hero, por fonte.
 * O texto longo antigo ("Recuperação alta — pronta pra treinar pesado")
 * competia com a própria recomendação escrita ao lado.
 */
export const SNAPSHOT_ZONE_SHORT: Record<
  "oura" | "whoop",
  Record<"alta" | "media" | "baixa", string>
> = {
  oura: {
    alta: "Alta prontidão",
    media: "Prontidão média",
    baixa: "Prontidão baixa",
  },
  whoop: {
    alta: "Recovery alto",
    media: "Recovery médio",
    baixa: "Recovery baixo",
  },
};

/**
 * "MODERADA-ALTA (70-85% FCMáx)" → "moderada-alta".
 *
 * O % sai do hero por decisão ratificada: a tabela de zonas com bpm
 * calculados vive no accordion da mesma tela. Âncora no FIM da string —
 * um strip genérico de parênteses quebraria textos futuros.
 */
export const formatIntensityShort = (intensity: string): string => {
  const stripped = intensity.replace(/\s+\([^()]*\)\s*$/, "").trim();
  return stripped.toLowerCase();
};

/** "45-55 minutos" → "45–55 min"; "Repouso total" passa intacto. */
export const formatDurationShort = (duration: string): string =>
  duration
    .replace(/(\d+)\s*-\s*(\d+)\s*minutos?/i, "$1–$2 min")
    .replace(/^(\d+)\s*minutos?$/i, "$1 min");

/**
 * Linha única de prescrição do hero: "Intensidade moderada-alta · 45–55 min".
 * Zona 0 não tem intensidade útil ("muito baixa") — vira só "Repouso total".
 */
export const formatPrescriptionLine = (intensity: string, duration: string): string => {
  const shortDuration = formatDurationShort(duration);
  if (/repouso/i.test(shortDuration)) return shortDuration;
  return `Intensidade ${formatIntensityShort(intensity)} · ${shortDuration}`;
};
