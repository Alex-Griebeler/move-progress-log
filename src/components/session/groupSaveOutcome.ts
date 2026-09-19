/** Resultado de um salvamento manual em lote: quem entrou e quem falhou. */
export interface GroupSaveOutcome {
  saved: string[];
  failed: Array<{ name: string; reason: string }>;
}

/**
 * Frase única de erro parcial (revisão UX-04): diz quem salvou e quem não,
 * para o treinador saber que tentar de novo não duplica as já salvas.
 */
export function describePartialGroupSave(outcome: GroupSaveOutcome): string {
  const failedNames = outcome.failed.map((f) => f.name).join(", ");
  if (outcome.saved.length === 0) {
    return `Nenhuma sessão foi salva (${failedNames}). Tente de novo.`;
  }
  return `Salvas: ${outcome.saved.join(", ")}. Não salvas: ${failedNames}. Tentar de novo envia só as que faltam.`;
}
