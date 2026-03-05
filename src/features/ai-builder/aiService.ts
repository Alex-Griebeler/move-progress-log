import { supabase } from '@/integrations/supabase/client';

export interface AIBuilderResponse {
  type: 'conversation' | 'planning' | 'build';
  message: string;
  issue_url?: string;
}

export async function sendMessage(message: string): Promise<AIBuilderResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-builder-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao processar mensagem');
  }

  return response.json();
}
