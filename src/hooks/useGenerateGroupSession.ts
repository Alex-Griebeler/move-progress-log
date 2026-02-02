/**
 * Hook para Geração de Mesociclo com IA
 * Fabrik Performance - Back to Basics
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
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
        throw new Error(error.message || "Erro ao gerar mesociclo");
      }

      if (!data?.success || !data.mesocycle) {
        throw new Error(data?.error || "Erro desconhecido ao gerar mesociclo");
      }

      // Mostrar warnings se houver
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach((warning) => {
          notify.warning("Atenção", { description: warning });
        });
      }

      return data.mesocycle;
    },
    onSuccess: () => {
      notify.success("Mesociclo gerado com sucesso!", {
        description: "3 treinos criados para as próximas 4 semanas",
      });
    },
    onError: (error) => {
      notify.error("Erro ao gerar mesociclo", {
        description: error.message,
      });
    },
  });
};

export type { MesocycleGenerationInput, GeneratedMesocycle };
