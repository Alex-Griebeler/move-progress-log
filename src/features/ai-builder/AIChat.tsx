import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, ExternalLink, Loader2 } from "lucide-react";
import { sendAIBuilderMessage, type AIBuilderResponse } from "./aiService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import {
  useAIBuilderMessages,
  useAddMessage,
  useUpdateConversationTitle,
  type PersistedMessage,
} from "./useAIBuilderChat";

interface AIChaChatProps {
  conversationId: string;
}

const MAX_CHARS = 2000;
const SEND_COOLDOWN_MS = 2000;

export function AIChat({ conversationId }: AIChaChatProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: persistedMessages = [], isLoading: messagesLoading } =
    useAIBuilderMessages(conversationId);
  const addMessage = useAddMessage();
  const updateTitle = useUpdateConversationTitle();

  useEffect(() => {
    if (persistedMessages.length > 0) {
      setIsFirstMessage(false);
    }
  }, [persistedMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [persistedMessages, isLoading]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (Date.now() - lastSentAt < SEND_COOLDOWN_MS) {
      toast.info("Aguarde um momento antes de enviar outra mensagem.");
      return;
    }

    setInput("");
    setIsLoading(true);
    setLastSentAt(Date.now());

    try {
      // Persist user message
      await addMessage.mutateAsync({
        conversation_id: conversationId,
        role: "user",
        content: trimmed,
      });

      // Update conversation title with first message
      if (isFirstMessage) {
        const title = trimmed.slice(0, 80);
        await updateTitle.mutateAsync({ id: conversationId, title });
        setIsFirstMessage(false);
      }

      // Build history
      const history = persistedMessages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      const response = await sendAIBuilderMessage(trimmed, history);

      // Persist AI response
      await addMessage.mutateAsync({
        conversation_id: conversationId,
        role: "assistant",
        content: response.message,
        message_type: response.type,
        issue_url: response.pr_url || response.issue_url,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(errorMsg);

      await addMessage.mutateAsync({
        conversation_id: conversationId,
        role: "assistant",
        content: `⚠️ ${errorMsg}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, lastSentAt, conversationId, persistedMessages, isFirstMessage, addMessage, updateTitle]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typeBadge = (type?: string | null) => {
    if (!type) return null;
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      conversation: { label: "Conversa", variant: "secondary" },
      planning: { label: "Planejamento", variant: "outline" },
      build: { label: "Pull Request", variant: "default" },
    };
    const v = variants[type];
    if (!v) return null;
    return <Badge variant={v.variant}>{v.label}</Badge>;
  };

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando conversa...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {persistedMessages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-20">
            <Bot className="h-12 w-12 opacity-30" />
            <p className="text-sm">Envie uma mensagem para começar.</p>
            <p className="text-xs opacity-60">
              Pergunte, peça um plano ou solicite uma tarefa de build.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {persistedMessages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} typeBadge={typeBadge} />
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Pensando...
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder="Descreva sua ideia, peça um plano ou solicite um build..."
              className="min-h-[60px] max-h-[140px] resize-none pr-16"
              disabled={isLoading}
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
              {input.length}/{MAX_CHARS}
            </span>
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px]"
            aria-label="Enviar mensagem"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  typeBadge,
}: {
  msg: PersistedMessage;
  typeBadge: (type?: string | null) => React.ReactNode;
}) {
  return (
    <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      {msg.role === "assistant" && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-lg px-4 py-3 text-sm ${
          msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {msg.role === "assistant" && msg.message_type && (
          <div className="mb-2">{typeBadge(msg.message_type)}</div>
        )}

        {msg.role === "assistant" ? (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        )}

        {msg.issue_url && (
          <a
            href={msg.issue_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-primary underline underline-offset-2 hover:opacity-80"
          >
            <ExternalLink className="h-3 w-3" />
            {msg.issue_url.includes("/pull/") ? "Ver Pull Request no GitHub" : "Ver issue no GitHub"}
          </a>
        )}
      </div>

      {msg.role === "user" && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-4 w-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}
