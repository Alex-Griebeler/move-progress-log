import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── helpers ──────────────────────────────────────────────────────────
function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/\s+/g, " ");
}

// Movement-pattern mapping: JSON path → DB movement_pattern
const PATTERN_MAP: Record<string, string> = {
  empurrar_horizontal: "empurrar_horizontal",
  empurrar_vertical: "empurrar_vertical",
  puxar_horizontal: "puxar_horizontal",
  puxar_vertical: "puxar_vertical",
  dominancia_de_joelho: "dominancia_joelho",
  dominancia_de_quadril: "dominancia_quadril",
  carregamentos: "carregar",
  anti_extensao: "core_anti_extensao",
  anti_flexao_lateral: "core_anti_flexao_lateral",
  anti_rotacao: "core_anti_rotacao",
  liberacao_miofascial: "lmf",
  bilateral_linear: "pliometria_bilateral_linear",
  unilateral_linear: "pliometria_unilateral_linear",
  unilateral_lateral: "pliometria_unilateral_lateral",
  unilateral_lateral_medial: "pliometria_unilateral_lateral_medial",
  exercicios_nao_convencionais: "locomocao",
  potencializacao_snc: "potencializacao_snc",
  locomocao: "locomocao",
  potencia: "potencia",
};

// Category mapping from JSON structure
const CATEGORY_MAP: Record<string, string> = {
  empurrar_horizontal: "forca",
  empurrar_vertical: "forca",
  puxar_horizontal: "forca",
  puxar_vertical: "forca",
  dominancia_de_joelho: "forca",
  dominancia_de_quadril: "forca",
  carregamentos: "forca",
  anti_extensao: "core",
  anti_flexao_lateral: "core",
  anti_rotacao: "core",
  liberacao_miofascial: "lmf",
  bilateral_linear: "pliometria",
  unilateral_linear: "pliometria",
  unilateral_lateral: "pliometria",
  unilateral_lateral_medial: "pliometria",
  exercicios_nao_convencionais: "locomocao",
  potencializacao_snc: "preparacao",
  locomocao: "locomocao",
  potencia: "potencia",
  mobilidade_tornozelo: "mobilidade",
  mobilidade_quadril: "mobilidade",
  mobilidade_toracica: "mobilidade",
  mobilidade_integrada: "mobilidade",
  ativacao_escapular: "ativacao",
  ativacao_gluteos: "ativacao",
  ativacao_flexores_quadril: "ativacao",
};

// Mobility / activation sub-pattern mapping
const MOBILITY_ACTIVATION_MAP: Record<string, string> = {
  mobilidade_tornozelo: "mobilidade_tornozelo",
  mobilidade_quadril: "mobilidade_quadril",
  mobilidade_toracica: "mobilidade_toracica",
  mobilidade_integrada: "mobilidade_integrada",
  ativacao_escapular: "ativacao_escapula",
  ativacao_gluteos: "ativacao_gluteos",
  ativacao_flexores_quadril: "ativacao_flexores_quadril",
};

// Laterality mapping
const LATERALITY_MAP: Record<string, string> = {
  bilateral: "bilateral",
  unilateral: "unilateral",
  alternado: "alternado",
  assimetrica: "base assimétrica",
};

// Risk level from numeric_level
function riskFromLevel(level: number): string {
  if (level <= 3) return "low";
  if (level <= 6) return "medium";
  return "high";
}

// Contraction type mapping
const CONTRACTION_MAP: Record<string, string> = {
  concentrica: "Concêntrica",
  excentrica: "Excêntrica",
  isometrica: "Isométrica",
  pliometrica: "Pliométrica / Potência",
  mista: "Mista",
};

interface ExerciseInput {
  nome: string;
  subcategoria: string; // JSON sub-path key
  categoria?: string;   // top-level JSON category key
  base?: string;
  nivel?: number;
  posicao?: string;
  tags?: string[];
  equipamento?: string[];
  series_padrao?: string;
  reps_padrao?: string;
  plano_movimento?: string;
  tipo_contracao?: string;
  nivel_risco?: string;
  fase_pliometria?: number;
  descricao?: string;
  video_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check: require admin or trainer
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "trainer"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: admin or trainer required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const exercises: ExerciseInput[] = body.exercises;

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return new Response(JSON.stringify({ error: "Missing exercises array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all existing exercises for matching
    const { data: existing } = await supabase
      .from("exercises_library")
      .select("id, name");

    const existingMap = new Map<string, { id: string; name: string }>();
    for (const ex of existing || []) {
      existingMap.set(normalize(ex.name), { id: ex.id, name: ex.name });
    }

    let inserted = 0;
    let updated = 0;
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const ex of exercises) {
      try {
        const normalizedName = normalize(ex.nome);
        const match = existingMap.get(normalizedName);

        // Resolve movement_pattern
        const subcat = ex.subcategoria;
        const movementPattern =
          MOBILITY_ACTIVATION_MAP[subcat] ||
          PATTERN_MAP[subcat] ||
          PATTERN_MAP[ex.categoria || ""] ||
          "core_geral";

        // Resolve category
        const category =
          CATEGORY_MAP[subcat] ||
          CATEGORY_MAP[ex.categoria || ""] ||
          null;

        const laterality = ex.base ? (LATERALITY_MAP[ex.base] || ex.base) : null;
        const contractionType = ex.tipo_contracao
          ? (CONTRACTION_MAP[ex.tipo_contracao.toLowerCase()] || ex.tipo_contracao)
          : null;

        const record: Record<string, unknown> = {
          name: ex.nome,
          movement_pattern: movementPattern,
          category: category,
          subcategory: subcat || null,
          laterality: laterality,
          numeric_level: ex.nivel || null,
          position: ex.posicao || null,
          tags: ex.tags || [],
          equipment_required: ex.equipamento || [],
          default_sets: ex.series_padrao || null,
          default_reps: ex.reps_padrao || null,
          movement_plane: ex.plano_movimento || null,
          contraction_type: contractionType,
          risk_level: ex.nivel_risco || (ex.nivel ? riskFromLevel(ex.nivel) : null),
          plyometric_phase: ex.fase_pliometria || null,
          description: ex.descricao || null,
          video_url: ex.video_url || null,
          level: ex.nivel
            ? ex.nivel <= 3
              ? "Iniciante"
              : ex.nivel <= 6
              ? "Intermediário"
              : "Avançado"
            : null,
        };

        if (match) {
          // Update existing
          const { error } = await supabase
            .from("exercises_library")
            .update(record)
            .eq("id", match.id);

          if (error) {
            errors.push(`Update "${ex.nome}": ${error.message}`);
          } else {
            updated++;
          }
        } else {
          // Insert new
          const { error } = await supabase
            .from("exercises_library")
            .insert(record);

          if (error) {
            errors.push(`Insert "${ex.nome}": ${error.message}`);
          } else {
            inserted++;
            existingMap.set(normalizedName, { id: "new", name: ex.nome });
          }
        }
      } catch (e) {
        errors.push(`Exception "${ex.nome}": ${(e as Error).message}`);
      }
    }

    // Find orphans: DB exercises not in the JSON
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
        skipped,
        errors,
        orphans,
        total_in_db: existingMap.size,
        total_in_json: exercises.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
