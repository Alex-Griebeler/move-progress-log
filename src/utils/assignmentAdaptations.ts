import type { AssignmentCustomAdaptations } from "@/hooks/prescriptionMappers";

const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sáb",
  sunday: "Dom",
};

// Ordem canônica da semana pra agenda não sair na ordem de inserção do JSON.
const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/**
 * Descreve as adaptações de uma atribuição de prescrição em PT-BR legível.
 * Substitui o JSON.stringify cru que vazava pro coach na aba Prescrições
 * (ex.: `{"weekdays":["monday"],"time":"08:00"}` → "Seg às 08:00").
 *
 * Retorna null quando não há nada apresentável (o chamador esconde o bloco).
 */
export const describeAssignmentAdaptations = (
  adaptations: AssignmentCustomAdaptations | null,
): string | null => {
  if (!adaptations) return null;

  // Lista de adaptações por exercício → resumo com contagem (o detalhe por
  // exercício pertence à superfície de prescrição, não ao card da atribuição).
  if (Array.isArray(adaptations)) {
    if (adaptations.length === 0) return null;
    return adaptations.length === 1
      ? "1 exercício adaptado"
      : `${adaptations.length} exercícios adaptados`;
  }

  // Agenda ({ weekdays, time }) → "Seg, Qua, Sex às 08:00".
  const days = (adaptations.weekdays ?? [])
    .slice()
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
    .map((day) => WEEKDAY_LABELS[day] ?? day);
  const time = adaptations.time ? adaptations.time.slice(0, 5) : null;

  if (days.length === 0 && !time) return null;
  if (days.length === 0) return `às ${time}`;
  if (!time) return days.join(", ");
  return `${days.join(", ")} às ${time}`;
};
