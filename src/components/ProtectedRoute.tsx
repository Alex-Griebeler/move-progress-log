import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/LoadingState";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Guard de autenticação. Deriva da identidade central (AuthProvider) em vez
 * de manter sessão própria (A-001): enquanto a identidade é desconhecida
 * nada privado renderiza; deslogado vai para /auth — inclusive por evento de
 * auth (logout em outra aba, sessão expirada), sem depender de handler algum.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingState text="Verificando acesso..." size="lg" fullScreen />;
  }

  if (status === "signed-out") {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
