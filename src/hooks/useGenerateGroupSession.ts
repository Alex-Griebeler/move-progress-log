/**
 * Hook para Geração de Mesociclo com IA
 * Fabrik Performance - Back to Basics
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { buildErrorDescription } from "@/utils/errorParsing";
import type { 
  MesocycleGenerationInput, 
  MesocycleGenerationResponse,
  GeneratedMesocycle 
} from "@/types/aiSession";

export const useGenerateGroupSession = () => {
  return useMutation({
    mutationFn: async (input: MesocycleGenerationInput): Promise<GeneratedMesocycle> => {
      const { data, error } = await supabase.functions.invoke<MesocycleGenerationResponse>(
        "generate-group-session",
        { body: input }
      );

      if (error) {
        // INC-010: usando chaves i18n
        throw new Error(error.message || i18n.errors.unknown);
      }

      if (!data?.success || !data.mesocycle) {
        throw new Error(data?.error || i18n.errors.unknown);
      }

      // Mostrar warnings se houver
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach((warning) => {
          notify.warning(i18n.modules.workouts.warning, { description: warning });
        });
      }

      return data.mesocycle;
    },
    onSuccess: () => {
      notify.success(i18n.feedback.success, {
        description: i18n.modules.workouts.sessionSaved,
      });
    },
    onError: (error) => {
      notify.error(i18n.modules.workouts.errorCreate, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};

export type { MesocycleGenerationInput, GeneratedMesocycle };
