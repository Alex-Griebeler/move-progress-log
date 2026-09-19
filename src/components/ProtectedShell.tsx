/**
 * Casca das rotas autenticadas (antes inline no App.tsx).
 *
 * Ordem importa (A-001): ProtectedRoute só libera com identidade resolvida;
 * IdentityScope provê o cache privado da identidade corrente (criado pelo
 * AuthProvider) e remonta tudo abaixo na troca de conta — inclusive
 * TrainingProvider (estado de check-in/conduta) e GlobalSearch (resultados de
 * busca em memória), que antes viviam fora da fronteira e atravessavam o logout.
 */
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <ProtectedRoute>
      <IdentityScope>
        <TrainingProvider>
          <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col">
                <header className="h-14 flex items-center justify-between gap-2 border-b border-border px-md sticky top-0 bg-background/95 z-50 backdrop-blur-md">
                  <SidebarTrigger aria-label="Abrir ou fechar o menu" />
                  <ThemeToggle />
                </header>
                {/* Único marco "principal" da casca; PageLayout é só o contêiner. */}
                <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
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
