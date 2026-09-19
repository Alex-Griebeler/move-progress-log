import { useState } from "react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AIChat } from "./AIChat";
import { ShieldAlert, Bot, Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useAIBuilderConversations,
  useCreateConversation,
  useDeleteConversation,
} from "./useAIBuilderChat";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { formatDateSP, formatTimeSP } from "@/utils/displayFormat";
import { notify } from "@/lib/notify";
import { buildErrorDescription } from "@/utils/errorParsing";

export default function AIBuilderPage() {
  usePageTitle("AI Builder");
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const {
    data: conversations = [],
    isLoading: convsLoading,
    isError: convsError,
    refetch: refetchConversations,
  } = useAIBuilderConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  if (roleLoading) {
    return <LoadingSpinner size="lg" text="Verificando permissões…" />;
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
    } catch (error: unknown) {
      notify.error("Erro ao criar conversa", {
        description: buildErrorDescription(error),
      });
    }
  };

  // Excluir pede confirmação (UX-26): a conversa não tem "desfazer".
  const confirmDeleteConversation = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteConversation.mutateAsync(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (error: unknown) {
      notify.error("Erro ao excluir conversa", {
        description: buildErrorDescription(error),
      });
    }
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
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova conversa
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {convsLoading ? (
            <div className="p-4 text-xs text-muted-foreground text-center" role="status">Carregando…</div>
          ) : convsError ? (
            <div className="space-y-2 p-4 text-center text-xs text-muted-foreground" role="alert">
              <p>Não foi possível carregar as conversas.</p>
              <Button variant="outline" onClick={() => refetchConversations()}>
                Tentar novamente
              </Button>
            </div>
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
                        {formatDateSP(conv.updated_at)} às {formatTimeSP(conv.updated_at)}
                      </p>
                    </div>
                  </button>
                  {/* Sempre visível (no toque não há hover) e com alvo de 40px. */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete({ id: conv.id, title: conv.title })}
                    className="-my-1.5 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Excluir conversa ${conv.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title ? `"${pendingDelete.title}" e ` : "A conversa e "}
              todas as mensagens serão apagadas. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => void confirmDeleteConversation()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
