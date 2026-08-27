/**
 * Comparação entre avaliações do mesmo tipo (PR-8b) — lógica PURA.
 *
 * Regra do plano: o Δ de uma avaliação é sempre contra a **anterior VÁLIDA
 * do mesmo tipo** — não contra a imediatamente anterior no tempo. Uma
 * avaliação sem resultado (teste abortado, laudo não anexado, questionário
 * incompleto) não vira base de comparação nem zera o histórico: ela é
 * pulada, e o Δ mede contra a última que de fato tem número.
 */

export interface AssessmentPointLike {
  id: string;
  /** Data da avaliação (YYYY-MM-DD). */
  date: string;
  /** Resultado-chave; null = avaliação sem resultado utilizável. */
  value: number | null;
  /** Desempate quando duas avaliações caem no mesmo dia. */
  createdAt?: string | null;
}

export interface AssessmentDelta {
  id: string;
  date: string;
  value: number | null;
  /** Diferença absoluta vs a anterior válida; null sem base. */
  delta: number | null;
  /** Diferença percentual; null sem base ou com base zero. */
  deltaPercent: number | null;
  /** Data da avaliação usada como base. */
  comparedTo: string | null;
}

/** Ordena da mais ANTIGA pra mais recente: data → created_at → id. */
const chronological = (a: AssessmentPointLike, b: AssessmentPointLike) => {
  const byDate = (a.date ?? "").localeCompare(b.date ?? "");
  if (byDate !== 0) return byDate;
  const byCreated = (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  if (byCreated !== 0) return byCreated;
  return a.id.localeCompare(b.id);
};

/**
 * Calcula o Δ de cada avaliação contra a anterior válida do mesmo tipo.
 *
 * @returns Mesma lista, da mais RECENTE pra mais antiga (ordem de exibição).
 */
export const computeAssessmentDeltas = (
  points: AssessmentPointLike[],
): AssessmentDelta[] => {
  const asc = [...points].sort(chronological);

  let lastValid: { date: string; value: number } | null = null;
  const withDeltas = asc.map((p): AssessmentDelta => {
    const value = typeof p.value === "number" && Number.isFinite(p.value) ? p.value : null;

    let delta: number | null = null;
    let deltaPercent: number | null = null;
    let comparedTo: string | null = null;

    if (value !== null && lastValid !== null) {
      delta = Number((value - lastValid.value).toFixed(2));
      // Base zero: a diferença absoluta continua verdadeira, o percentual não
      // existe (divisão por zero) — melhor omitir que inventar "∞%".
      deltaPercent =
        lastValid.value !== 0
          ? Math.round(((value - lastValid.value) / Math.abs(lastValid.value)) * 100)
          : null;
      comparedTo = lastValid.date;
    }

    if (value !== null) lastValid = { date: p.date, value };

    return { id: p.id, date: p.date, value, delta, deltaPercent, comparedTo };
  });

  return withDeltas.reverse();
};
