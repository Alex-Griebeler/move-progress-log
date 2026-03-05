import { useIsAdmin } from "@/hooks/useUserRole";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AIChat } from "./AIChat";
import { ShieldAlert, Bot } from "lucide-react";

export default function AIBuilderPage() {
  usePageTitle("AI Builder");
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Verificando permissões..." />;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">Acesso negado</p>
        <p className="text-sm">Esta funcionalidade é exclusiva para administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Builder</h1>
          <p className="text-sm text-muted-foreground">
            Assistente interno de desenvolvimento
          </p>
        </div>
      </div>
      <AIChat />
    </div>
  );
}
