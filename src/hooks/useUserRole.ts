import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";

// Mapeamento dos papéis do sistema
export type AppRole = 'admin' | 'moderator' | 'user';

/**
 * Role da identidade corrente. A chave carrega o userId e a consulta só roda
 * com identidade resolvida (A-001): não existe mais uma entrada ["user-role"]
 * anônima que a conta seguinte pudesse herdar, e a consulta não passa pela
 * API de auth (getUser) — a identidade vem do AuthProvider.
 */
export const useUserRole = () => {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["user-role", userId],
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!userId) return null;

      // BUG-004 fix: maybeSingle() instead of single() to avoid error when no role exists
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        logger.error("Error fetching user role:", error);
        return null;
      }

      // Sem linha de role: null explícito (queryFn não pode devolver undefined).
      return (data?.role as AppRole | undefined) ?? null;
    },
  });
};

export const useIsAdmin = () => {
  const { data: role, isLoading } = useUserRole();
  return {
    isAdmin: role === 'admin',
    isLoading
  };
};

export const useIsModerator = () => {
  const { data: role, isLoading } = useUserRole();
  return {
    isModerator: role === 'moderator' || role === 'admin',
    isLoading
  };
};
