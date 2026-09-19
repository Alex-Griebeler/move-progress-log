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
import { Search } from "lucide-react";
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
                  <div className="flex items-center gap-1">
                    {/* Busca visível: no tablet/celular não há ⌘K. */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSearchOpen(true)}
                      aria-label="Buscar alunos, prescrições ou exercícios"
                      aria-keyshortcuts="Meta+K Control+K"
                      className="h-10 gap-2 px-3 text-muted-foreground font-normal md:w-64 md:justify-start"
                    >
                      <Search className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Buscar</span>
                      <kbd className="ml-auto hidden md:inline rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">⌘K</kbd>
                    </Button>
                    <ThemeToggle />
                  </div>
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
