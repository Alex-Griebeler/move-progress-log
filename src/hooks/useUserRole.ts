import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Mapeamento dos papéis do sistema
export type AppRole = 'admin' | 'moderator' | 'user';

export const useUserRole = () => {
  return useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      // BUG-004 fix: maybeSingle() instead of single() to avoid error when no role exists
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role as AppRole | null;
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
