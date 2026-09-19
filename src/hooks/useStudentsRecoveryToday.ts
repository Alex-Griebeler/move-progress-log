import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { spToday } from "@/hooks/useOuraMetrics";
import { buildRecoverySnapshot, type RecoverySnapshot } from "@/utils/recoverySnapshot";

/**
 * Leitura de HOJE (America/Sao_Paulo) de Oura e Whoop para a lista de alunos.
 *
 * Mesmo contrato do hero da aba Treinamento (`buildRecoverySnapshot`): só o
 * score fechado do dia, nunca o de ontem; empate → Oura; faixas por aparelho
 * (Oura 85/70, Whoop 67/34). Assim o card da lista e o hero da ficha nunca
 * divergem, e a aluna com Whoop deixa de aparecer sem leitura.
 *
 * Leitura pura (3 selects, RLS de wearables) — nenhuma escrita.
 */
export interface StudentRecoveryToday {
  snapshot: RecoverySnapshot | null;
  hasOura: boolean;
  hasWhoop: boolean;
}

export type StudentsRecoveryTodayMap = Record<string, StudentRecoveryToday>;

export const useStudentsRecoveryToday = (studentIds: string[]) => {
  const ids = Array.from(new Set(studentIds)).sort();
  const today = spToday();

  return useQuery({
    queryKey: ["students-recovery-today", ids.join(","), today],
    enabled: ids.length > 0,
    // Criar/excluir aluna muda a chave: mantém a leitura anterior até chegar a nova.
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<StudentsRecoveryTodayMap> => {
      const [ouraRes, whoopRes, whoopConnRes] = await Promise.all([
        supabase
          .from("oura_metrics")
          .select("student_id, date, readiness_score")
          .in("student_id", ids)
          .eq("date", today),
        supabase
          .from("whoop_metrics")
          .select("student_id, date, recovery_score, score_state")
          .in("student_id", ids)
          .eq("date", today),
        supabase
          .from("whoop_connections")
          .select("student_id")
          .in("student_id", ids)
          .eq("is_active", true),
      ]);
      if (ouraRes.error) throw ouraRes.error;
      if (whoopRes.error) throw whoopRes.error;
      if (whoopConnRes.error) throw whoopConnRes.error;

      const whoopConnected = new Set((whoopConnRes.data ?? []).map((r) => r.student_id));
      const result: StudentsRecoveryTodayMap = {};
      for (const id of ids) {
        const oura = (ouraRes.data ?? []).filter((r) => r.student_id === id);
        const whoop = (whoopRes.data ?? []).filter((r) => r.student_id === id);
        result[id] = {
          snapshot: buildRecoverySnapshot(oura, whoop, today),
          hasOura: oura.length > 0,
          hasWhoop: whoopConnected.has(id) || whoop.length > 0,
        };
      }
      return result;
    },
  });
};
