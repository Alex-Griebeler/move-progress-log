import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { logger } from "@/utils/logger";
import { buildErrorDescription } from "@/utils/errorParsing";
import { invalidateOuraQueries } from "./ouraQueryInvalidation";

interface SyncAllResult {
  message: string;
  total: number;
  success: number;
  failed: number;
  results: Array<{
    student_id: string;
    student_name: string;
    status: 'success' | 'failed';
    attempt: number;
    error?: string;
  }>;
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

      if (data.failed > 0) {
        notify.warning(
          i18n.modules.oura.syncCompletedWithFailures
            .replace("{{success}}", String(data.success))
            .replace("{{failed}}", String(data.failed)),
          {
            description: i18n.modules.oura.checkLogs
          }
        );
      } else {
        notify.success(
          i18n.modules.oura.syncCompleted,
          {
            description: `${data.success} ${i18n.modules.oura.studentsSynced}`
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
