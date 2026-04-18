import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { buildErrorDescription } from "@/utils/errorParsing";

export const useGenerateInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      expires_in_days = 7,
    }: {
      email?: string;
      expires_in_days?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-student-invite",
        {
          body: { email, expires_in_days },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-invites"] });
      notify.success(i18n.modules.invites.generated);
    },
    onError: (error: Error) => {
      notify.error(i18n.modules.invites.errorGenerate, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};

export const useValidateInvite = (token: string) => {
  return useQuery({
    queryKey: ["validate-invite", token],
    enabled: !!token,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/validate-student-invite?token=${encodeURIComponent(token)}`,
        {
          headers: {
            apikey: supabaseKey,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || "Falha ao validar convite");
      }

      const result = await response.json();
      if (!result.valid) {
        throw new Error(result.error || "Convite inválido");
      }

      return result;
    },
    retry: false,
  });
};

export const useCreateStudentFromInvite = () => {
  return useMutation({
    mutationFn: async ({
      invite_token,
      student_data,
      avatar_base64,
    }: {
      invite_token: string;
      student_data: {
        name: string;
        birth_date?: string;
        weight_kg?: number;
        height_cm?: number;
        fitness_level?: string;
        objectives?: string;
        limitations?: string;
        injury_history?: string;
        preferences?: string;
        weekly_sessions_proposed?: number;
        has_oura_ring: boolean;
        accepts_oura_sharing: boolean;
      };
      avatar_base64?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "create-student-from-invite",
        {
          body: { invite_token, student_data, avatar_base64 },
        }
      );

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      notify.error(i18n.modules.invites.errorCreate, {
        description: buildErrorDescription(error, i18n.errors.unknown),
      });
    },
  });
};
