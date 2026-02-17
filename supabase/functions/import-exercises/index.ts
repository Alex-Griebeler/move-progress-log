import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Normalize name for matching ──
function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// ── Movement pattern mapping ──
const PATTERN_MAP: Record<string, string> = {
  empurrar_horizontal: "empurrar_horizontal",
  empurrar_vertical: "empurrar_vertical",
  puxar_horizontal: "puxar_horizontal",
  puxar_vertical: "puxar_vertical",
  dominancia_de_joelho: "dominancia_joelho",
  dominancia_de_quadril: "dominancia_quadril",
  carregamento: "carregar",
  carregamentos: "carregar",
  anti_extensao: "core_anti_extensao",
  anti_flexao_lateral: "core_anti_flexao_lateral",
  anti_rotacao: "core_anti_rotacao",
  bilateral_linear: "pliometria_bilateral_linear",
  unilateral_linear: "pliometria_unilateral_linear",
  unilateral_lateral: "pliometria_unilateral_lateral",
  unilateral_lateral_medial: "pliometria_unilateral_lateral_medial",
  regioes: "lmf",
  tecnicas: "respiracao",
  tornozelo: "mobilidade_tornozelo",
  quadril: "mobilidade_quadril",
  coluna_toracica: "mobilidade_toracica",
  integrados: "mobilidade_integrada",
  frontal: "locomocao",
  sagital: "locomocao",
  transverso: "locomocao",
  gluteos: "ativacao_gluteos",
  escapular: "ativacao_escapula",
  pe_tornozelo: "ativacao_geral",
  corretivos_quadril: "ativacao_gluteos",
};

const CATEGORY_MAP: Record<string, string> = {
  empurrar_horizontal: "forca",
  empurrar_vertical: "forca",
  puxar_horizontal: "forca",
  puxar_vertical: "forca",
  dominancia_de_joelho: "forca",
  dominancia_de_quadril: "forca",
  carregamento: "forca",
  carregamentos: "forca",
  anti_extensao: "core",
  anti_flexao_lateral: "core",
  anti_rotacao: "core",
  bilateral_linear: "pliometria",
  unilateral_linear: "pliometria",
  unilateral_lateral: "pliometria",
  unilateral_lateral_medial: "pliometria",
  regioes: "lmf",
  tecnicas: "respiracao",
  tornozelo: "mobilidade",
  quadril: "mobilidade",
  coluna_toracica: "mobilidade",
  integrados: "mobilidade",
  frontal: "locomocao",
  sagital: "locomocao",
  transverso: "locomocao",
  gluteos: "ativacao",
  escapular: "ativacao",
  pe_tornozelo: "ativacao",
  corretivos_quadril: "ativacao",
};

const LATERALITY_MAP: Record<string, string> = {
  bilateral: "bilateral",
  unilateral: "unilateral",
  alternado: "alternado",
  assimetrica: "base assimétrica",
};

function riskFromLevel(level: number): string {
  if (level <= 3) return "low";
  if (level <= 6) return "medium";
  return "high";
}

function levelLabel(level: number): string {
  if (level <= 3) return "Iniciante";
  if (level <= 6) return "Intermediário";
  return "Avançado";
}

// ── Flatten nested JSON into flat exercise array ──
interface FlatExercise {
  nome: string;
  movement_pattern: string;
  category: string;
  subcategory: string;
  base?: string;
  posicao?: string;
  nivel?: number;
  equipamento?: string;
  tags?: string[];
  fase_pliometria?: number;
  sets_reps?: string;
  regiao?: string;
  cadeia?: string;
}

function flattenJSON(json: Record<string, unknown>): FlatExercise[] {
  const result: FlatExercise[] = [];
  const padroes = json.padroes_de_movimento as Record<string, unknown>;
  if (!padroes) return result;

  for (const [_topKey, topVal] of Object.entries(padroes)) {
    const topObj = topVal as Record<string, unknown>;
    const subcategorias = topObj.subcategorias as Record<string, unknown>;
    if (!subcategorias) continue;

    for (const [subKey, subVal] of Object.entries(subcategorias)) {
      const subObj = subVal as Record<string, unknown>;
      const exercicios = subObj.exercicios;

      if (!exercicios) continue;

      if (Array.isArray(exercicios)) {
        // Direct array of exercises
        for (const ex of exercicios) {
          result.push({
            nome: ex.nome,
            movement_pattern: PATTERN_MAP[subKey] || subKey,
            category: CATEGORY_MAP[subKey] || "geral",
            subcategory: subKey,
            base: ex.base,
            posicao: ex.posicao,
            nivel: ex.nivel,
            equipamento: ex.equipamento,
            tags: ex.tags,
            fase_pliometria: ex.fase,
            sets_reps: ex.sets_reps,
            regiao: ex.regiao,
            cadeia: ex.cadeia,
          });
        }
      } else if (typeof exercicios === "object") {
        // Object with groups → each group has exercicios array or is itself nested
        for (const [_groupKey, groupVal] of Object.entries(
          exercicios as Record<string, unknown>
        )) {
          if (Array.isArray(groupVal)) {
            // Direct array under group (corretivos_quadril pattern)
            for (const ex of groupVal) {
              result.push({
                nome: ex.nome,
                movement_pattern: PATTERN_MAP[subKey] || subKey,
                category: CATEGORY_MAP[subKey] || "geral",
                subcategory: subKey,
                base: ex.base,
                posicao: ex.posicao,
                nivel: ex.nivel,
                equipamento: ex.equipamento,
                tags: ex.tags,
                fase_pliometria: ex.fase,
                sets_reps: ex.sets_reps,
                regiao: ex.regiao,
                cadeia: ex.cadeia,
              });
            }
          } else {
            const group = groupVal as Record<string, unknown>;
            const groupExercises = group.exercicios;
            if (Array.isArray(groupExercises)) {
              for (const ex of groupExercises) {
                result.push({
                  nome: ex.nome,
                  movement_pattern: PATTERN_MAP[subKey] || subKey,
                  category: CATEGORY_MAP[subKey] || "geral",
                  subcategory: subKey,
                  base: ex.base,
                  posicao: ex.posicao,
                  nivel: ex.nivel,
                  equipamento: ex.equipamento,
                  tags: ex.tags,
                  fase_pliometria: ex.fase,
                  sets_reps: ex.sets_reps,
                  regiao: ex.regiao,
                  cadeia: ex.cadeia,
                });
              }
            }
          }
        }
      }
    }
  }

  return result;
}

// ── Main handler ──
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check - allow service role (no user needed) or authenticated user
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      // Check if it's the service role key (skip user auth)
      if (token !== serviceKey) {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (!roleData || !["admin", "trainer"].includes(roleData.role)) {
          return new Response(
            JSON.stringify({ error: "Forbidden: admin or trainer required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const body = await req.json();

    // Accept either flat array or nested JSON
    let exercises: FlatExercise[];
    if (body.exercises && Array.isArray(body.exercises)) {
      exercises = body.exercises;
    } else if (body.padroes_de_movimento) {
      exercises = flattenJSON(body);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid format: need exercises array or padroes_de_movimento" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (exercises.length === 0) {
      return new Response(
        JSON.stringify({ error: "No exercises found in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing exercises
    const { data: existing } = await supabase
      .from("exercises_library")
      .select("id, name");

    const existingMap = new Map<string, { id: string; name: string }>();
    for (const ex of existing || []) {
      existingMap.set(normalize(ex.name), { id: ex.id, name: ex.name });
    }

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const ex of exercises) {
      try {
        const normalizedName = normalize(ex.nome);
        const match = existingMap.get(normalizedName);

        const laterality = ex.base
          ? LATERALITY_MAP[ex.base] || ex.base
          : null;

        const equipmentArr = ex.equipamento
          ? ex.equipamento
              .split(/[+\/]/)
              .map((e: string) => e.trim())
              .filter(Boolean)
          : [];

        // Parse sets_reps if available (e.g. "3x5")
        let defaultSets: string | null = null;
        let defaultReps: string | null = null;
        if (ex.sets_reps) {
          const parts = ex.sets_reps.split("x");
          if (parts.length === 2) {
            defaultSets = parts[0];
            defaultReps = parts[1];
          }
        }

        const record: Record<string, unknown> = {
          name: ex.nome,
          movement_pattern: ex.movement_pattern,
          category: ex.category,
          subcategory: ex.subcategory,
          laterality,
          numeric_level: ex.nivel || null,
          position: ex.posicao || null,
          tags: ex.tags || [],
          equipment_required: equipmentArr,
          risk_level: ex.nivel ? riskFromLevel(ex.nivel) : null,
          level: ex.nivel ? levelLabel(ex.nivel) : null,
          plyometric_phase:
            typeof ex.fase_pliometria === "number" ? ex.fase_pliometria : null,
        };

        if (defaultSets) record.default_sets = defaultSets;
        if (defaultReps) record.default_reps = defaultReps;

        if (match) {
          const { error } = await supabase
            .from("exercises_library")
            .update(record)
            .eq("id", match.id);

          if (error) errors.push(`Update "${ex.nome}": ${error.message}`);
          else updated++;
        } else {
          const { error } = await supabase
            .from("exercises_library")
            .insert(record);

          if (error) errors.push(`Insert "${ex.nome}": ${error.message}`);
          else {
            inserted++;
            existingMap.set(normalizedName, { id: "new", name: ex.nome });
          }
        }
      } catch (e) {
        errors.push(`Exception "${ex.nome}": ${(e as Error).message}`);
      }
    }

    // Find orphans
    const jsonNormalized = new Set(exercises.map((e) => normalize(e.nome)));
    const orphans: string[] = [];
    for (const [norm, ex] of existingMap) {
      if (!jsonNormalized.has(norm)) {
        orphans.push(ex.name);
      }
    }

    return new Response(
      JSON.stringify({
        inserted,
        updated,
        errors: errors.slice(0, 50),
        errors_total: errors.length,
        orphans,
        orphans_total: orphans.length,
        total_processed: exercises.length,
        total_in_db_after: existingMap.size,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
