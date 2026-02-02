import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { 
  SessionGenerationInput, 
  SessionGenerationResponse,
  GeneratedSession 
} from "@/types/aiSession";

export const useGenerateGroupSession = () => {
  return useMutation({
    mutationFn: async (input: SessionGenerationInput): Promise<GeneratedSession> => {
      const { data, error } = await supabase.functions.invoke<SessionGenerationResponse>(
        "generate-group-session",
        { body: input }
      );

      if (error) {
        throw new Error(error.message || "Erro ao gerar sessão");
      }

      if (!data?.success || !data.session) {
        throw new Error(data?.error || "Erro desconhecido ao gerar sessão");
      }

      // Mostrar warnings se houver
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach((warning) => {
          notify.warning("Atenção", { description: warning });
        });
      }

      return data.session;
    },
    onSuccess: () => {
      notify.success("Sessão gerada com sucesso!");
    },
    onError: (error) => {
      notify.error("Erro ao gerar sessão", {
        description: error.message,
      });
    },
  });
};

export type { SessionGenerationInput, GeneratedSession };
