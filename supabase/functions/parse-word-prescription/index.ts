import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract text from .docx by parsing the XML inside the ZIP
async function extractTextFromDocx(base64Data: string): Promise<string> {
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // A .docx is a ZIP file. We need to find document.xml inside it.
  // Simple ZIP parser to find the document.xml entry
  const zipData = bytes;
  const textContent: string[] = [];

  // Find End of Central Directory
  let eocdOffset = -1;
  for (let i = zipData.length - 22; i >= 0; i--) {
    if (
      zipData[i] === 0x50 &&
      zipData[i + 1] === 0x4b &&
      zipData[i + 2] === 0x05 &&
      zipData[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid ZIP file: EOCD not found");
  }

  const cdOffset =
    zipData[eocdOffset + 16] |
    (zipData[eocdOffset + 17] << 8) |
    (zipData[eocdOffset + 18] << 16) |
    (zipData[eocdOffset + 19] << 24);
  const cdEntries =
    zipData[eocdOffset + 10] | (zipData[eocdOffset + 11] << 8);

  let offset = cdOffset;
  const entries: Array<{ name: string; compressedSize: number; uncompressedSize: number; localHeaderOffset: number; compressionMethod: number }> = [];

  for (let i = 0; i < cdEntries; i++) {
    const nameLen = zipData[offset + 28] | (zipData[offset + 29] << 8);
    const extraLen = zipData[offset + 30] | (zipData[offset + 31] << 8);
    const commentLen = zipData[offset + 32] | (zipData[offset + 33] << 8);
    const compressionMethod = zipData[offset + 10] | (zipData[offset + 11] << 8);
    const compressedSize =
      zipData[offset + 20] |
      (zipData[offset + 21] << 8) |
      (zipData[offset + 22] << 16) |
      (zipData[offset + 23] << 24);
    const uncompressedSize =
      zipData[offset + 24] |
      (zipData[offset + 25] << 8) |
      (zipData[offset + 26] << 16) |
      (zipData[offset + 27] << 24);
    const localHeaderOffset =
      zipData[offset + 42] |
      (zipData[offset + 43] << 8) |
      (zipData[offset + 44] << 16) |
      (zipData[offset + 45] << 24);

    const nameBytes = zipData.slice(offset + 46, offset + 46 + nameLen);
    const name = new TextDecoder().decode(nameBytes);

    entries.push({ name, compressedSize, uncompressedSize, localHeaderOffset, compressionMethod });
    offset += 46 + nameLen + extraLen + commentLen;
  }

  // Find document.xml
  const docEntry = entries.find(
    (e) => e.name === "word/document.xml"
  );

  if (!docEntry) {
    throw new Error("No word/document.xml found in .docx");
  }

  // Read local file header to get to data
  const lhOffset = docEntry.localHeaderOffset;
  const lhNameLen = zipData[lhOffset + 26] | (zipData[lhOffset + 27] << 8);
  const lhExtraLen = zipData[lhOffset + 28] | (zipData[lhOffset + 29] << 8);
  const dataStart = lhOffset + 30 + lhNameLen + lhExtraLen;
  const compressedData = zipData.slice(dataStart, dataStart + docEntry.compressedSize);

  let xmlText: string;
  if (docEntry.compressionMethod === 0) {
    // Stored (no compression)
    xmlText = new TextDecoder().decode(compressedData);
  } else {
    // Deflate
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(compressedData);
    writer.close();
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const result = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }
    xmlText = new TextDecoder().decode(result);
  }

  // Extract text from XML, preserving paragraph structure
  // Replace paragraph/table boundaries with newlines
  const cleaned = xmlText
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x26;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileBase64 } = await req.json();
    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "Missing fileBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Extract text from .docx
    console.log("Extracting text from .docx...");
    const extractedText = await extractTextFromDocx(fileBase64);
    console.log("Extracted text length:", extractedText.length);

    // 2. Send to AI for structured extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um parser de prescrições de treino da Fabrik Studio.
Analise o texto extraído de um documento Word e extraia TODOS os treinos com seus exercícios.

ABREVIAÇÕES COMUNS:
- DB: dumbbell (halter)
- MB: miniband
- SB: superband
- KB: kettlebell
- BB: barra
- cl: cada lado
- RM: repetições máximas
- RR: repetições de reserva
- PC: peso corporal
- UNL: unilateral
- ALT: alternado
- AJ: ajoelhado
- RDL: deadlift romeno
- ISO: isométrico
- LMF: liberação miofascial
- RE: rotação externa
- RI: rotação interna
- CNTL: contralateral
- (PFE): pé da frente elevado
- DD: decúbito dorsal
- ECC: excêntrico
- CONC: concêntrico

REGRAS:
- Cada treino tem um nome (ex: "TREINO 1 – FORÇA / HIPERTROFIA") e um dia da semana
- Exercícios podem estar agrupados em CIRCUITO, SUPERSET, ou EMOM - marque group_with_previous=true para o 2º exercício em diante no grupo
- Para sets/reps como "4 x 8-5", extraia sets="4" e reps="8-5"
- Para tempos como "2 x 30s", extraia sets="2" e reps="30s"
- Para duração como "1 minuto", extraia sets="1" e reps="1 min"
- PSE deve incluir o sufixo (ex: "1-2RR", "All out", "PC", "Carga alta")
- Intervalo em segundos (ex: "1 min" = 60, "90s" = 90, "2 min" = 120)
- training_method: CIRCUITO, SUPERSET, EMOM, ou null
- Inclua exercícios de respiração e mindfulness também`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Extraia todos os treinos e exercícios deste documento:\n\n${extractedText}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_prescriptions",
                description: "Extract all workout prescriptions from the document",
                parameters: {
                  type: "object",
                  properties: {
                    prescriptions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string", description: "Workout name (e.g. 'TREINO 1 – FORÇA / HIPERTROFIA')" },
                          objective: { type: "string", description: "Main objective (e.g. 'Força / Hipertrofia')" },
                          day_of_week: { type: "string", description: "Day(s) of week (e.g. 'Seg / Qui')" },
                          exercises: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string", description: "Exercise name as written in the document" },
                                sets: { type: "string", description: "Number of sets" },
                                reps: { type: "string", description: "Reps or duration" },
                                interval_seconds: { type: "integer", description: "Rest interval in seconds, null if not specified" },
                                pse: { type: "string", description: "PSE/RPE value" },
                                training_method: { type: "string", description: "CIRCUITO, SUPERSET, EMOM, or null" },
                                group_with_previous: { type: "boolean", description: "True if grouped with previous exercise" },
                                observations: { type: "string", description: "Any additional notes" },
                              },
                              required: ["name", "sets", "reps"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["name", "objective", "exercises"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["prescriptions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_prescriptions" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para processamento de IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const { prescriptions } = parsed;

    // 3. Match exercises with exercises_library via pg_trgm
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    for (const prescription of prescriptions) {
      for (const exercise of prescription.exercises) {
        const { data: matches } = await supabaseAdmin.rpc(
          "search_exercises_by_name",
          {
            p_query: exercise.name,
            p_limit: 3,
          }
        );

        exercise.matches = (matches || []).map((m: Record<string, unknown>) => ({
          id: m.id,
          name: m.name,
          similarity: Math.round(m.similarity * 100),
        }));

        // Auto-select best match if similarity > 40%
        if (exercise.matches.length > 0 && exercise.matches[0].similarity > 40) {
          exercise.matched_exercise_id = exercise.matches[0].id;
          exercise.matched_exercise_name = exercise.matches[0].name;
          exercise.match_confidence = exercise.matches[0].similarity;
        } else {
          exercise.matched_exercise_id = null;
          exercise.matched_exercise_name = null;
          exercise.match_confidence = exercise.matches.length > 0 ? exercise.matches[0].similarity : 0;
        }
      }
    }

    return new Response(JSON.stringify({ prescriptions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-word-prescription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
