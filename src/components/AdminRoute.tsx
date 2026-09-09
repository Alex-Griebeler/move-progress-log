import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Guard de admin. A identidade vem do AuthProvider (A-001): sem assinatura
 * própria do auth e sem getSession concorrente. A consulta de role é
 * escopada ao userId corrente e uma resposta que chegue depois da troca de
 * identidade (cleanup do efeito) nunca é publicada.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsAdmin(null);

    if (!userId) {
      setIsAdmin(false);
      return;
    }

    const resolveAdmin = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        logger.error("[AdminRoute] Failed to fetch user role", error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    };

    void resolveAdmin();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
