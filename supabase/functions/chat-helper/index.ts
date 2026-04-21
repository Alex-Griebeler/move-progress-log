import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_MESSAGE_CHARS = 20000;

type ChatMessageRole = "user" | "assistant";
type ChatMessage = { role: ChatMessageRole; content: string };

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("messages deve ser um array não vazio");
  }

  if (input.length > MAX_MESSAGES) {
    throw new Error(`messages excede o limite de ${MAX_MESSAGES} itens`);
  }

  let totalChars = 0;

  return input.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`messages[${index}] inválido`);
    }

    const entry = item as Record<string, unknown>;
    const role = entry.role;
    const content = entry.content;

    if (role !== "user" && role !== "assistant") {
      throw new Error(`messages[${index}].role inválido`);
    }

    if (typeof content !== "string") {
      throw new Error(`messages[${index}].content inválido`);
    }

    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new Error(`messages[${index}].content vazio`);
    }

    if (normalizedContent.length > MAX_MESSAGE_CHARS) {
      throw new Error(`messages[${index}].content excede ${MAX_MESSAGE_CHARS} caracteres`);
    }

    totalChars += normalizedContent.length;
    if (totalChars > MAX_TOTAL_MESSAGE_CHARS) {
      throw new Error(`messages excede o limite total de ${MAX_TOTAL_MESSAGE_CHARS} caracteres`);
    }

    return { role, content: normalizedContent };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user identity
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: "Payload inválido" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const payload = body as Record<string, unknown>;
    const messages = normalizeMessages(payload.messages);
    const studentId = typeof payload.studentId === "string" ? payload.studentId.trim() : "";
    if (studentId && !UUID_RE.test(studentId)) {
      return new Response(
        JSON.stringify({ error: "studentId inválido" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // MEL-IA-008: Build contextual system prompt
    let contextBlock = "";

    if (studentId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Verify trainer owns the student
      const { data: studentOwner, error: studentOwnerError } = await supabase
        .from("students")
        .select("trainer_id")
        .eq("id", studentId)
        .single();
      if (studentOwnerError) {
        throw new Error(`Erro ao validar dono do aluno: ${studentOwnerError.message}`);
      }

      if (!studentOwner || studentOwner.trainer_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Acesso não autorizado a este aluno" }),
          { status: 403, headers: jsonHeaders }
        );
      }

      // Parallel data fetching for student context
      const [studentRes, sessionsRes, metricsRes, prescriptionRes, observationsRes] = await Promise.all([
        supabase.from("students").select("name, birth_date, weight_kg, height_cm, fitness_level, objectives, limitations, injury_history, preferences").eq("id", studentId).single(),
        supabase.from("workout_sessions").select("date, time, session_type, workout_name").eq("student_id", studentId).order("date", { ascending: false }).limit(5),
        supabase.from("oura_metrics").select("date, readiness_score, sleep_score, average_sleep_hrv, resting_heart_rate, steps, active_calories").eq("student_id", studentId).order("date", { ascending: false }).limit(7),
        supabase.from("prescription_assignments").select("prescription_id, start_date, end_date, workout_prescriptions(name, objective)").eq("student_id", studentId).order("start_date", { ascending: false }).limit(1),
        supabase.from("student_observations").select("observation_text, severity, categories, created_at, is_resolved").eq("student_id", studentId).eq("is_resolved", false).order("created_at", { ascending: false }).limit(5),
      ]);

      if (studentRes.data) {
        const s = studentRes.data;
        contextBlock += `\n\n📋 PERFIL DO ALUNO:
- Nome: ${s.name}
- Nascimento: ${s.birth_date || "não informado"}
- Peso: ${s.weight_kg ? s.weight_kg + " kg" : "não informado"}
- Altura: ${s.height_cm ? s.height_cm + " cm" : "não informado"}
- Nível: ${s.fitness_level || "não informado"}
- Objetivos: ${s.objectives?.join(", ") || "não informado"}
- Limitações: ${s.limitations || "nenhuma registrada"}
- Histórico de lesões: ${s.injury_history || "nenhum"}
- Preferências: ${s.preferences || "não informadas"}`;
      }

      if (sessionsRes.data && sessionsRes.data.length > 0) {
        contextBlock += `\n\n📊 ÚLTIMAS 5 SESSÕES:`;
        for (const session of sessionsRes.data) {
          contextBlock += `\n- ${session.date} ${session.time} | ${session.session_type} | ${session.workout_name || "sem nome"}`;
        }
      }

      if (metricsRes.data && metricsRes.data.length > 0) {
        contextBlock += `\n\n💤 MÉTRICAS OURA (7 DIAS):`;
        for (const m of metricsRes.data) {
          contextBlock += `\n- ${m.date}: Readiness ${m.readiness_score ?? "—"} | Sleep ${m.sleep_score ?? "—"} | HRV ${m.average_sleep_hrv ?? "—"} | RHR ${m.resting_heart_rate ?? "—"} | Passos ${m.steps ?? "—"}`;
        }
      }

      if (prescriptionRes.data && prescriptionRes.data.length > 0) {
        const p = prescriptionRes.data[0] as Record<string, unknown>;
        const wp = p.workout_prescriptions as Record<string, unknown> | undefined;
        contextBlock += `\n\n💪 PRESCRIÇÃO ATUAL:
- Nome: ${wp?.name || "—"}
- Objetivo: ${wp?.objective || "—"}
- Período: ${p.start_date} a ${p.end_date || "em andamento"}`;
      }

      if (observationsRes.data && observationsRes.data.length > 0) {
        contextBlock += `\n\n⚠️ OBSERVAÇÕES CLÍNICAS ATIVAS:`;
        for (const obs of observationsRes.data) {
          contextBlock += `\n- [${obs.severity || "—"}] ${obs.observation_text} (${obs.categories?.join(", ") || "geral"})`;
        }
      }

      if (contextBlock) {
        console.log(`📋 Contexto carregado para aluno ${studentId}`);
      }
    }

    const systemPrompt = `Você é o assistente inteligente da Fabrik, um studio boutique de treinamento funcional em Brasília. Você ajuda treinadores a tomar decisões sobre prescrição, periodização, recuperação e acompanhamento de alunos.

PRINCÍPIOS DA FABRIK:
- Método Body & Mind Fitness: integra treinamento funcional, mindfulness e respiração
- Treinos descalços, small groups de até 8 alunos ou sessões individuais
- Público: empresários e profissionais 40-55 anos buscando corpo atlético e definido
- Foco em personalização, qualidade técnica e redução de risco de lesões
- Resultado estético como fruto de lifestyle saudável

SUAS CAPACIDADES:
- Analisar dados de Oura Ring (sono, HRV, readiness) para ajustar treinos
- Sugerir progressões/regressões de exercícios
- Recomendar protocolos de recuperação (imersão gelo, sauna, respiração)
- Identificar padrões de fadiga, overtraining ou inconsistência
- Orientar sobre periodização e volume de treino

REGRAS:
- Responda sempre em português brasileiro
- Seja direto e técnico, mas acessível
- Nunca faça diagnósticos médicos
- Quando houver dados do aluno, baseie suas respostas neles
- Se não houver dados suficientes, peça ao treinador para fornecer${contextBlock}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: jsonHeaders }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes no Lovable AI." }),
          { status: 402, headers: jsonHeaders }
        );
      }
      const errorText = await response.text();
      console.error("Erro AI gateway:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao conectar com IA" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Erro no chat-helper:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
