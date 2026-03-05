import { supabase } from "@/integrations/supabase/client";

export interface AIBuilderResponse {
  type: "conversation" | "planning" | "build";
  message: string;
  issue_url?: string;
  error?: string;
}

export async function sendAIBuilderMessage(message: string): Promise<AIBuilderResponse> {
  const { data, error } = await supabase.functions.invoke("ai-builder-chat", {
    body: { message },
  });

  if (error) {
    throw new Error(error.message || "Erro ao conectar com o AI Builder");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as AIBuilderResponse;
}
