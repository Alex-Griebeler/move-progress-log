import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface PersistedMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  message_type: string | null;
  issue_url: string | null;
  created_at: string;
}

const AI_BUILDER_CONVERSATION_COLUMNS = `
  id,
  title,
  created_at,
  updated_at
`;

const AI_BUILDER_MESSAGE_COLUMNS = `
  id,
  conversation_id,
  role,
  content,
  message_type,
  issue_url,
  created_at
`;

export function useAIBuilderConversations() {
  return useQuery({
    queryKey: ["ai-builder-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_builder_conversations")
        .select(AI_BUILDER_CONVERSATION_COLUMNS)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });
}

export function useAIBuilderMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["ai-builder-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_builder_messages")
        .select(AI_BUILDER_MESSAGE_COLUMNS)
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as PersistedMessage[];
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string = "Nova conversa") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("ai_builder_conversations")
        .insert({ user_id: user.id, title })
        .select()
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-builder-conversations"] });
    },
  });
}

export function useAddMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (msg: {
      conversation_id: string;
      role: "user" | "assistant";
      content: string;
      message_type?: string;
      issue_url?: string;
    }) => {
      const { data, error } = await supabase
        .from("ai_builder_messages")
        .insert(msg)
        .select()
        .single();

      if (error) throw error;

      // Update conversation timestamp and title if first user message
      await supabase
        .from("ai_builder_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", msg.conversation_id);

      return data as PersistedMessage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai-builder-messages", data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["ai-builder-conversations"] });
    },
  });
}

export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("ai_builder_conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-builder-conversations"] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_builder_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-builder-conversations"] });
    },
  });
}
