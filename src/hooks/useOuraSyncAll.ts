import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { logger } from "@/utils/logger";
import { buildErrorDescription } from "@/utils/errorParsing";
import { invalidateOuraQueries } from "./ouraQueryInvalidation";
import { summarizeSyncAllByStudent, type SyncAllPairResult } from "@/utils/ouraSyncSummary";

interface SyncAllResult {
  message: string;
  /** pares (aluna, data) — desde o lookback não é "alunos" */
  total: number;
  success: number;
  failed: number;
  /** execução cortada pelo orçamento de tempo: há datas não consultadas */
  truncated?: boolean;
  skipped?: number;
  results: SyncAllPairResult[];
}

export const useOuraSyncAll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SyncAllResult> => {
      const { data, error } = await supabase.functions.invoke('oura-sync-all', {
        body: { force_sync: true }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await invalidateOuraQueries(queryClient);

      const summary = summarizeSyncAllByStudent(data.results ?? []);
      // Truncamento é sinal PRÓPRIO da execução (data.truncated), independente
      // da classificação por aluna (uma aluna com falha E data pulada só
      // aparece em "Falhas").
      const skippedNames = Array.from(
        new Set((data.results ?? []).filter((r) => r.status === "skipped").map((r) => r.student_name ?? r.student_id)),
      );
      const incompleteNote =
        data.truncated || skippedNames.length > 0
          ? ` Tempo esgotado: nem todas as datas foram consultadas${skippedNames.length ? ` (${skippedNames.join(", ")})` : ""}. Rode de novo ou aguarde o próximo cron.`
          : "";

      if (summary.studentsFailed > 0) {
        notify.warning(
          i18n.modules.oura.syncCompletedWithFailures
            .replace("{{success}}", String(summary.studentsOk))
            .replace("{{failed}}", String(summary.studentsFailed)),
          {
            description: `${i18n.modules.oura.checkLogs} Falhas: ${summary.failedNames.join(", ")}.${incompleteNote}`
          }
        );
      } else if (summary.studentsIncomplete > 0 || data.truncated) {
        notify.warning("Sincronização incompleta (tempo esgotado)", {
          description: `${summary.studentsOk} aluna(s) completas, ${summary.studentsWithData} com dados novos.${incompleteNote}`,
        });
      } else if (summary.studentsWithData === 0 && summary.studentsTotal > 0) {
        notify.warning("Sincronização concluída sem dados novos", {
          description: `${summary.studentsTotal} aluna(s) consultada(s); o Oura não devolveu dados para as datas consultadas.${incompleteNote}`,
        });
      } else {
        notify.success(
          i18n.modules.oura.syncCompleted,
          {
            description: `${summary.studentsOk} ${i18n.modules.oura.studentsSynced} · ${summary.studentsWithData} com dados novos${incompleteNote}`
          }
        );
      }
    },
    onError: (error: Error) => {
      logger.error("Error in sync all:", error);
      notify.error(i18n.modules.oura.errorSyncAll, {
        description: buildErrorDescription(error, i18n.errors.unknown)
      });
    },
  });
};
