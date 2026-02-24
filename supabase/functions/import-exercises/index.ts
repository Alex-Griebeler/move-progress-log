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

// ============================================================================
// MAPEAMENTO UNIFICADO: subcategoria do JSON → (movement_pattern, category)
// Taxonomia simplificada: 2 níveis (Categoria → Padrão de Movimento)
// ============================================================================

interface SubcategoryMapping {
  movement_pattern: string;
  category: string;
}

const SUBCATEGORY_MAP: Record<string, SubcategoryMapping> = {
  // ── Empurrar ──
  empurrar_horizontal: { movement_pattern: "empurrar_horizontal", category: "forca_hipertrofia" },
  empurrar_vertical: { movement_pattern: "empurrar_vertical", category: "forca_hipertrofia" },

  // ── Puxar ──
  puxar_horizontal: { movement_pattern: "puxar_horizontal", category: "forca_hipertrofia" },
  puxar_vertical: { movement_pattern: "puxar_vertical", category: "forca_hipertrofia" },

  // ── Dominância de Joelho → agachamento / lunge / nordica ──
  agachamento_bilateral: { movement_pattern: "agachamento", category: "forca_hipertrofia" },
  agachamento_lateral: { movement_pattern: "agachamento", category: "forca_hipertrofia" },
  agachamento_unilateral: { movement_pattern: "agachamento", category: "forca_hipertrofia" },
  base_assimetrica_split_squat: { movement_pattern: "lunge", category: "forca_hipertrofia" },
  lunge: { movement_pattern: "lunge", category: "forca_hipertrofia" },
  lunge_slideboard: { movement_pattern: "lunge", category: "forca_hipertrofia" },
  flexao_joelhos_nordica: { movement_pattern: "nordica", category: "forca_hipertrofia" },

  // ── Dominância de Quadril → hip_hinge / ponte ──
  deadlift_bilateral: { movement_pattern: "hip_hinge", category: "forca_hipertrofia" },
  deadlift_unilateral: { movement_pattern: "hip_hinge", category: "forca_hipertrofia" },
  rdl_stiff: { movement_pattern: "hip_hinge", category: "forca_hipertrofia" },
  ponte_hip_thrust: { movement_pattern: "ponte", category: "forca_hipertrofia" },

  // ── Carregar ──
  carregamento: { movement_pattern: "carregar", category: "forca_hipertrofia" },
  carregamentos: { movement_pattern: "carregar", category: "forca_hipertrofia" },

  // ── Core ──
  anti_extensao: { movement_pattern: "anti_extensao", category: "core_ativacao" },
  anti_flexao_lateral: { movement_pattern: "anti_flexao_lateral", category: "core_ativacao" },
  anti_rotacao: { movement_pattern: "anti_rotacao", category: "core_ativacao" },

  // ── Ativação ──
  escapula: { movement_pattern: "ativacao_escapular", category: "core_ativacao" },
  gluteos_estabilidade: { movement_pattern: "ativacao_gluteos", category: "core_ativacao" },
  pe_tornozelo: { movement_pattern: "ativacao_escapular", category: "core_ativacao" },
  corretivos_quadril: { movement_pattern: "ativacao_gluteos", category: "core_ativacao" },

  // ── Mobilidade ──
  tornozelo: { movement_pattern: "mobilidade_tornozelo", category: "mobilidade" },
  quadril: { movement_pattern: "mobilidade_quadril", category: "mobilidade" },
  coluna_toracica: { movement_pattern: "mobilidade_toracica", category: "mobilidade" },
  integrados: { movement_pattern: "mobilidade_integrada", category: "mobilidade" },

  // ── Pliometria ──
  bilateral_linear: { movement_pattern: "pliometria_bilateral", category: "potencia_pliometria" },
  unilateral_linear: { movement_pattern: "pliometria_unilateral", category: "potencia_pliometria" },
  unilateral_lateral: { movement_pattern: "pliometria_lateral", category: "potencia_pliometria" },
  unilateral_lateral_medial: { movement_pattern: "pliometria_multidirecional", category: "potencia_pliometria" },

  // ── Locomoção → atletico ──
  frontal: { movement_pattern: "atletico", category: "potencia_pliometria" },
  sagital: { movement_pattern: "atletico", category: "potencia_pliometria" },
  transverso: { movement_pattern: "atletico", category: "potencia_pliometria" },

  // ── Liberação Miofascial ──
  regioes: { movement_pattern: "lmf", category: "lmf" },

  // ── Respiração ──
  tecnicas: { movement_pattern: "respiracao", category: "respiracao" },
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
      const mapping = SUBCATEGORY_MAP[subKey];
      const movementPattern = mapping?.movement_pattern || subKey;
      const category = mapping?.category || "forca_hipertrofia";

      const subObj = subVal as Record<string, unknown>;
      const exercicios = subObj.exercicios;

      if (!exercicios) continue;

      const pushExercise = (ex: Record<string, unknown>) => {
        result.push({
          nome: ex.nome as string,
          movement_pattern: movementPattern,
          category,
          subcategory: subKey,
          base: ex.base as string | undefined,
          posicao: ex.posicao as string | undefined,
          nivel: ex.nivel as number | undefined,
          equipamento: ex.equipamento as string | undefined,
          tags: ex.tags as string[] | undefined,
          fase_pliometria: ex.fase as number | undefined,
          sets_reps: ex.sets_reps as string | undefined,
          regiao: ex.regiao as string | undefined,
          cadeia: ex.cadeia as string | undefined,
        });
      };

      if (Array.isArray(exercicios)) {
        for (const ex of exercicios) pushExercise(ex);
      } else if (typeof exercicios === "object") {
        for (const [_groupKey, groupVal] of Object.entries(exercicios as Record<string, unknown>)) {
          if (Array.isArray(groupVal)) {
            for (const ex of groupVal) pushExercise(ex);
          } else {
            const group = groupVal as Record<string, unknown>;
            const groupExercises = group.exercicios;
            if (Array.isArray(groupExercises)) {
              for (const ex of groupExercises) pushExercise(ex);
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

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
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
          functional_group: ex.movement_pattern, // compatibilidade: preenche com movement_pattern
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
