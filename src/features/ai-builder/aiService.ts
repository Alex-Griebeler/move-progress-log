import { supabase } from "@/integrations/supabase/client";

export interface AIBuilderResponse {
  type: "conversation" | "planning" | "build";
  message: string;
  issue_url?: string;
  pr_url?: string;
  error?: string;
}

interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendAIBuilderMessage(
  message: string,
  history: ChatHistoryMessage[] = []
): Promise<AIBuilderResponse> {
  const { data, error } = await supabase.functions.invoke("ai-builder-chat", {
    body: { message, history },
  });

  if (error) {
    throw new Error(error.message || "Erro ao conectar com o AI Builder");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  // Validate response shape
  if (!data || typeof data.message !== "string" || typeof data.type !== "string") {
    throw new Error("Resposta inválida do AI Builder");
  }

  return data as AIBuilderResponse;
}
