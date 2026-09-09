/**
 * Casca das rotas autenticadas (antes inline no App.tsx).
 *
 * Ordem importa (A-001): ProtectedRoute só libera com identidade resolvida;
 * IdentityScope cria o cache privado por identidade e remonta tudo abaixo na
 * troca de conta — inclusive TrainingProvider (estado de check-in/conduta) e
 * GlobalSearch (resultados de busca em memória), que antes viviam fora da
 * fronteira e atravessavam o logout.
 */
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { IdentityScope } from "@/contexts/AuthContext";
import { TrainingProvider } from "@/contexts/TrainingContext";
import { GlobalSearch } from "@/components/GlobalSearch";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface ProtectedShellProps {
  children: ReactNode;
}

export function ProtectedShell({ children }: ProtectedShellProps) {
  return (
    <ProtectedRoute>
      <IdentityScope>
        <TrainingProvider>
          <GlobalSearch />
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col">
                <header className="h-14 flex items-center justify-between border-b border-border px-md sticky top-0 bg-background/95 z-50 backdrop-blur-md">
                  <SidebarTrigger aria-label="Abrir/Fechar menu lateral" />
                  <ThemeToggle />
                </header>
                <main className="flex-1">
                  <ErrorBoundary>{children}</ErrorBoundary>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </TrainingProvider>
      </IdentityScope>
    </ProtectedRoute>
  );
}
