/**
 * Ordenação "precisa de atenção" da lista de alunos (revisão UX 18/09, UX-19).
 *
 * Só apresentação: não decide conduta. Pesa sinais que a treinadora já vê no
 * card, em ordem de urgência:
 *   1. leitura de hoje na faixa baixa do próprio aparelho (Oura <70, Whoop <34)
 *   2. sem sessão registrada há 7+ dias (mesma RPC do KPI da home)
 *   3. observação clínica em aberto de severidade alta
 *   4. leitura de hoje na faixa média
 *   5. outras observações em aberto
 * Empate → ordem alfabética (pt-BR, sem acento).
 */
import type { RecoverySnapshot } from "@/utils/recoverySnapshot";

export type StudentsSortMode = "attention" | "alpha";

export interface AttentionSignals {
  zone: RecoverySnapshot["zone"] | null;
  inactive7d: boolean;
  highSeverityObservations: number;
  openObservations: number;
}

export const attentionWeight = (s: AttentionSignals): number =>
  (s.zone === "baixa" ? 16 : 0) +
  (s.inactive7d ? 8 : 0) +
  (s.highSeverityObservations > 0 ? 4 : 0) +
  (s.zone === "media" ? 2 : 0) +
  (s.openObservations > 0 ? 1 : 0);

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

export const sortStudents = <T extends { id: string; name: string }>(
  students: T[],
  mode: StudentsSortMode,
  signalsFor: (student: T) => AttentionSignals,
): T[] => {
  const copy = [...students];
  if (mode === "alpha") {
    return copy.sort((a, b) => collator.compare(a.name, b.name));
  }
  const weights = new Map(copy.map((s) => [s.id, attentionWeight(signalsFor(s))]));
  return copy.sort(
    (a, b) => (weights.get(b.id)! - weights.get(a.id)!) || collator.compare(a.name, b.name),
  );
};
