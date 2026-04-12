import { useState } from "react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AIChat } from "./AIChat";
import { ShieldAlert, Bot, Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useAIBuilderConversations,
  useCreateConversation,
  useDeleteConversation,
} from "./useAIBuilderChat";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AIBuilderPage() {
  usePageTitle("AI Builder");
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const { data: conversations = [], isLoading: convsLoading } = useAIBuilderConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  if (roleLoading) {
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

  const handleNewConversation = async () => {
    try {
      const conv = await createConversation.mutateAsync("Nova conversa");
      setActiveConversationId(conv.id);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    await deleteConversation.mutateAsync(id);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar - Conversation List */}
      <div className="w-64 border-r border-border flex flex-col bg-muted/30">
        <div className="p-3 border-b border-border">
          <Button
            onClick={handleNewConversation}
            disabled={createConversation.isPending}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova conversa
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {convsLoading ? (
            <div className="p-4 text-xs text-muted-foreground text-center">Carregando...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              Nenhuma conversa ainda
            </div>
          ) : (
            <div className="py-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`w-full px-3 py-2.5 text-sm group flex items-start gap-2 hover:bg-muted transition-colors ${
                    activeConversationId === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveConversationId(conv.id)}
                    className="flex items-start gap-2 flex-1 min-w-0 text-left"
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground">{conv.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conv.updated_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                    aria-label="Excluir conversa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">AI Builder</h1>
            <p className="text-xs text-muted-foreground">
              Assistente interno de desenvolvimento
            </p>
          </div>
        </div>

        {activeConversationId ? (
          <AIChat conversationId={activeConversationId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <Bot className="h-16 w-16 opacity-20" />
            <p className="text-sm">Selecione uma conversa ou crie uma nova</p>
          </div>
        )}
      </div>
    </div>
  );
}
