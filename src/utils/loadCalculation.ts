/**
 * Cálculo de carga — parser por GRAMÁTICA DE COMPONENTES.
 *
 * Substitui o motor antigo de regex acumulativas. Pipeline:
 *
 *   1. Normalização lexical
 *      - "lbs?", "libra(s)", "pound(s)" → "lb"
 *      - "kgs?", "quilo(s)", "quilograma(s)" → "kg"
 *      - "×", "*" → "x"
 *      - "barra de N" → "barra Nkg" e "barra N" → "barra Nkg"
 *      - "par de halteres" → "2 halteres"
 *      - "N dumbbells?", "N DB" → "N halteres"
 *      - Parêntese órfão (extra de fechamento sem abertura)
 *        é silenciosamente removido.
 *
 *   2. Decisão de contexto (vinda do caller via `options.exerciseName`)
 *      - Modo `landmine` se o nome do exercício ou o breakdown contém
 *        "landmine". NUNCA multiplica por 2 (mesmo com "cada lado").
 *      - Modo `bilateral barbell` se o nome do exercício é claramente
 *        bilateral com barra (supino/agachamento/levantamento terra/
 *        deadlift/remada com barra, etc.) E NÃO landmine. Permite
 *        inferir × 2 em peso solto + barra sem "cada lado".
 *
 *   3. Early-returns:
 *      - "peso corporal" → studentWeight (comportamento atual; ver finding)
 *      - "elástico|banda|elastic|band" → null
 *      - "placa N" sem unidade → null (placa não tem peso padrão)
 *
 *   4. Tokenize do restante por componentes:
 *      - eachSide(payload)   — "(...) (de )?cada lado" OU "X (de )?cada lado"
 *      - dualImplement(N kg) — "2 halteres N kg", "par de halteres N kg",
 *                              "2 kettlebells N kg", "2 dumbbells N kg",
 *                              "2 DB N kg", "dois halteres N kg"
 *      - bar(N kg)           — "barra (de )? N (kg)?"
 *      - plate(quantity?,    — "N kg", "N lb", "Mx N kg", "M x N lb"
 *              valueKg)
 *
 *   5. Avaliação:
 *      - bar: soma valor
 *      - dualImplement: soma valor × 2
 *      - eachSide(payload): processa cada termo do payload, multiplica
 *        APENAS termos sem `quantity` explícita por 2. Termos com `Nx`
 *        já são absolutos.
 *      - plate solo: soma quantity × valueKg
 *      - Em modo `barbell bilateral` (sem "cada lado" no input, sem
 *        dualImplement, COM `bar` e exatamente 1 `plate` solo SEM
 *        quantity explícita): multiplica esse plate por 2.
 *
 *   6. Arredondamento — `roundToDecimal` SÓ no return final.
 *
 * Constantes:
 *   - 1 lb = 0.4536 kg
 *
 * Retrocompatibilidade:
 *   - Assinatura aceita 2 args antigos (breakdown, studentWeight).
 *   - 3º arg `options.exerciseName` é OPCIONAL — quando ausente,
 *     comportamento é o mesmo do parser antigo nos casos não
 *     ambíguos. Inferências `landmine`/`barbell-bilateral` só
 *     disparam se `exerciseName` estiver presente OU o próprio
 *     breakdown contém "landmine" literal.
 */

import { POUND_TO_KG_CONVERSION, roundToDecimal } from "@/constants/units";

// ────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ────────────────────────────────────────────────────────────────────────────

export interface CalculateLoadOptions {
  /**
   * Nome do exercício (executed ou prescribed). Quando presente, o
   * parser ativa heurísticas de contexto:
   *   - "landmine" → modo landmine (sem × 2).
   *   - "supino", "agachamento", "levantamento terra", "deadlift",
   *     "barra fixa", "remada com barra" etc. → modo barra bilateral
   *     (peso solto + barra sem "cada lado" multiplica × 2).
   * Quando ausente, parser NÃO infere contexto silenciosamente.
   */
  exerciseName?: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Constantes internas
// ────────────────────────────────────────────────────────────────────────────

/**
 * Palavras-chave que, no nome do exercício, indicam barra bilateral.
 * Lista CONSERVADORA — só nomes onde o coach espera que peso solto seja
 * "cada lado" implícito.
 */
const BILATERAL_BARBELL_KEYWORDS = [
  "supino",
  "agachamento",
  "levantamento terra",
  "deadlift",
  "remada com barra",
  "remada curvada",
  "bench press",
  "barra fixa",
  "press militar",
  "desenvolvimento com barra",
  "stiff",
  "front squat",
  "back squat",
  "high bar",
  "low bar",
];

/** Palavras-chave que indicam fluxo unilateral mesmo com barra. */
const UNILATERAL_KEYWORDS = [
  "unilateral",
  "um braço",
  "um lado",
  "uma mão",
  "single arm",
  "single leg",
];

// ────────────────────────────────────────────────────────────────────────────
// 1. Normalização lexical
// ────────────────────────────────────────────────────────────────────────────

/**
 * Pré-processa o texto antes do parser estruturado.
 *
 * Operações (em ordem):
 *   a) Normaliza separadores de multiplicação: × e * → x
 *   b) Normaliza unidades em PT-BR/EN:
 *        "libras", "libra", "pounds", "pound", "lbs" → "lb"
 *        "quilogramas", "quilograma", "quilos", "quilo", "kgs" → "kg"
 *   c) "par de halteres" → "2 halteres"
 *   d) "dumbbells?" → "halteres"; "\bDB\b" → "halteres"; "dois" → "2"
 *   e) Barra sem unidade: "barra 20" → "barra 20kg"
 *   f) Barra "de N": "barra de 20kg" → "barra 20kg"
 *   g) Parêntese órfão de fechamento: descarta.
 *
 * Retorna sempre lowercase pra simplificar matchers downstream.
 */
function normalizeText(input: string): string {
  let t = input.toLowerCase();

  // (a) operadores de multiplicação
  t = t.replace(/[×*]/g, "x");

  // (b) unidades em variantes PT-BR/EN
  t = t.replace(/\blibras?\b|\bpounds?\b|\blbs\b/gi, "lb");
  t = t.replace(/\bquilogramas?\b|\bquilos?\b|\bkgs\b/gi, "kg");

  // (c) par de halteres → 2 halteres
  t = t.replace(/\bpar\s+de\s+halteres?\b/gi, "2 halteres");

  // (d) dumbbells / DB → halteres; "dois" → "2"
  t = t.replace(/\bdumbbells?\b/gi, "halteres");
  t = t.replace(/\bdb\b/gi, "halteres");
  t = t.replace(/\bdois\b/gi, "2");

  // (e) "barra N" sem unidade ou (f) "barra de N kg" → "barra Nkg".
  // Cuidado: só consome o número quando vier imediatamente após "barra".
  // Aceita opcional "de" e opcional unidade kg/lb.
  t = t.replace(
    /\bbarra\s+(?:de\s+)?(\d+(?:[.,]\d+)?)(?:\s*(kg|lb))?\b/gi,
    (_match, num: string, unit?: string) => {
      const u = (unit ?? "kg").toLowerCase();
      return `barra ${num}${u}`;
    },
  );

  // (g) parêntese de fechamento órfão (mais `)` que `(`)
  let openCount = 0;
  let closeCount = 0;
  for (const ch of t) {
    if (ch === "(") openCount += 1;
    if (ch === ")") closeCount += 1;
  }
  while (closeCount > openCount) {
    const lastIdx = t.lastIndexOf(")");
    if (lastIdx < 0) break;
    t = t.slice(0, lastIdx) + t.slice(lastIdx + 1);
    closeCount -= 1;
  }

  return t;
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Decisão de contexto
// ────────────────────────────────────────────────────────────────────────────

interface ParseContext {
  isLandmine: boolean;
  isBilateralBarbell: boolean;
  isUnilateralHint: boolean;
}

function decideContext(
  normalizedText: string,
  exerciseName: string | null | undefined,
): ParseContext {
  const exLower = (exerciseName ?? "").toLowerCase();
  const isLandmine =
    exLower.includes("landmine") || /\blandmine\b/.test(normalizedText);
  const isUnilateralHint =
    UNILATERAL_KEYWORDS.some((k) => exLower.includes(k)) ||
    UNILATERAL_KEYWORDS.some((k) => normalizedText.includes(k));
  const isBilateralBarbell =
    !isLandmine &&
    !isUnilateralHint &&
    !!exerciseName &&
    BILATERAL_BARBELL_KEYWORDS.some((k) => exLower.includes(k));
  return { isLandmine, isBilateralBarbell, isUnilateralHint };
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Early-returns (peso corporal / elástico / placa)
// ────────────────────────────────────────────────────────────────────────────

const BODYWEIGHT_WITH_VALUE_RE = /peso\s*corporal\s*=\s*(\d+(?:[.,]\d+)?)\s*kg/i;
const BODYWEIGHT_RE = /peso\s*corporal/i;
const ELASTIC_RE = /\bel[áa]stico\b|\bbanda\b|\belastic\b|\bband\b/i;
/** placa N sem unidade — "placa 8" sozinho ou "placa 8 (sem kg)". */
const UNKNOWN_PLATE_RE = /\bplaca\s+\d+(?!\s*(?:kg|lb|x))\b/i;

function tryEarlyReturn(
  normalizedText: string,
  studentWeight: number | null | undefined,
): { matched: true; value: number | null } | { matched: false } {
  // Peso corporal com valor explícito ("Peso corporal = 75 kg").
  const bwMatch = normalizedText.match(BODYWEIGHT_WITH_VALUE_RE);
  if (bwMatch) {
    const v = parseFloat(bwMatch[1].replace(",", "."));
    return { matched: true, value: roundToDecimal(v) };
  }

  // Peso corporal sem valor → usa studentWeight (comportamento atual).
  if (BODYWEIGHT_RE.test(normalizedText) && !bwMatch) {
    return {
      matched: true,
      value: studentWeight ? roundToDecimal(studentWeight) : null,
    };
  }

  // Elástico/banda → null (nunca converter pra kg).
  if (ELASTIC_RE.test(normalizedText)) {
    return { matched: true, value: null };
  }

  // "placa 8" sem unidade — placa não tem peso padrão.
  if (UNKNOWN_PLATE_RE.test(normalizedText)) {
    return { matched: true, value: null };
  }

  return { matched: false };
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Tokenize / parse de componentes
// ────────────────────────────────────────────────────────────────────────────

type WeightTerm = {
  /** Quantidade explícita (Nx). 1 se não vier "Nx" no texto. */
  quantity: number;
  /** Flag: quantity veio do texto, não default 1. */
  explicitQuantity: boolean;
  /** Valor convertido pra kg ANTES de qualquer multiplicação. */
  valueKg: number;
};

/**
 * Captura um termo de peso com quantity opcional:
 *   "70 lb"        → {quantity:1, explicit:false, kg:31.752}
 *   "2x70lb"       → {quantity:2, explicit:true,  kg:31.752}
 *   "2 x 70 lb"    → idem
 *   "12,5 kg"      → {quantity:1, explicit:false, kg:12.5}
 *
 * Aceita unidades "kg" e "lb" (após normalização).
 */
const WEIGHT_TERM_RE = /(?:(\d+(?:[.,]\d+)?)\s*x\s*)?(\d+(?:[.,]\d+)?)\s*(kg|lb)\b/gi;

function parseNumeric(value: string): number {
  return parseFloat(value.replace(",", "."));
}

function extractWeightTerms(content: string): WeightTerm[] {
  const out: WeightTerm[] = [];
  WEIGHT_TERM_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WEIGHT_TERM_RE.exec(content)) !== null) {
    const hasQuantity = Boolean(match[1]);
    const quantity = hasQuantity ? parseNumeric(match[1]!) : 1;
    const value = parseNumeric(match[2]);
    const unit = match[3].toLowerCase();
    const valueKg = unit === "lb" ? value * POUND_TO_KG_CONVERSION : value;
    out.push({
      quantity,
      explicitQuantity: hasQuantity,
      valueKg,
    });
  }
  return out;
}

/**
 * Extrai a barra (se houver). Regex específica pra capturar
 * "barra Nkg" ou "barra Nlb" (já normalizado).
 */
const BAR_RE = /\bbarra\s+(\d+(?:[.,]\d+)?)\s*(kg|lb)\b/i;

function extractBar(text: string): { kg: number; range: [number, number] } | null {
  const m = text.match(BAR_RE);
  if (!m || m.index === undefined) return null;
  const value = parseNumeric(m[1]);
  const unit = m[2].toLowerCase();
  const kg = unit === "lb" ? value * POUND_TO_KG_CONVERSION : value;
  return { kg, range: [m.index, m.index + m[0].length] };
}

/**
 * Extrai "2 halteres N kg|lb", "2 kettlebells N kg|lb", etc.
 * Já assume normalização (dumbbells → halteres, DB → halteres).
 * Aceita "2 kettlebell" sem 's' por tolerância.
 */
const DUAL_IMPLEMENT_RE =
  /\b(\d+)\s*(?:halteres?|kettlebells?)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(kg|lb)\b|\b(?:duplo\s*kettlebell|kettlebell\s*duplo)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(kg|lb)\b/i;

function extractDualImplement(
  text: string,
): { kg: number; range: [number, number] } | null {
  const m = text.match(DUAL_IMPLEMENT_RE);
  if (!m || m.index === undefined) return null;

  let value: number;
  let unit: string;
  if (m[1]) {
    // "2 halteres 24 kg"
    const declaredQty = parseInt(m[1], 10);
    if (declaredQty < 2) return null; // halter solo cai em outro caminho
    value = parseNumeric(m[2]);
    unit = m[3].toLowerCase();
  } else {
    // "duplo kettlebell N kg"
    value = parseNumeric(m[4]);
    unit = m[5].toLowerCase();
  }
  const kgEach = unit === "lb" ? value * POUND_TO_KG_CONVERSION : value;
  return { kg: kgEach * 2, range: [m.index, m.index + m[0].length] };
}

/**
 * Detecta o grupo "cada lado" com ou sem parens, com ou sem "de".
 * Retorna o conteúdo "interno" (que vai por lado) e o range a remover
 * do texto base. Se houver parens balanceados antes de "cada lado",
 * usa o conteúdo dos parens; se for um trecho sem parens, usa tudo
 * até o início do range (limitado pelo `+` anterior).
 */
function extractEachSide(
  text: string,
): { innerContent: string; range: [number, number] } | null {
  // Caso (1): "(...) (de )?cada lado"
  const parenRe = /\(([^()]*)\)\s*(?:de\s+)?cada\s+lado/i;
  const parenMatch = text.match(parenRe);
  if (parenMatch && parenMatch.index !== undefined) {
    return {
      innerContent: parenMatch[1],
      range: [parenMatch.index, parenMatch.index + parenMatch[0].length],
    };
  }

  // Caso (2): "...termos... (de )?cada lado" sem parens.
  // O grupo "cada lado" engloba TUDO antes da frase "cada lado",
  // até o início da string OU até uma "barra Nkg" anterior (porque
  // a barra é tratada separadamente, sem multiplicar por 2).
  //
  // Ex.: "15lb + 2kg cada lado + barra 10kg":
  //   innerContent = "15lb + 2kg"  (ambos vão por lado, ×2)
  // Ex.: "barra 20kg + 10kg cada lado":
  //   innerContent = "10kg"        (a barra antes do cada lado fica
  //                                 fora do grupo)
  const eachSideRe = /(?:de\s+)?cada\s+lado/i;
  const m = text.match(eachSideRe);
  if (!m || m.index === undefined) return null;
  const phraseEnd = m.index + m[0].length;
  // Default: começa do início da string.
  let start = 0;
  // Se houver "barra Nkg" entre start e m.index, ajusta start pra DEPOIS
  // da barra (a barra é tratada separadamente, não dentro de cada lado).
  const slice = text.slice(0, m.index);
  const barMatchBefore = slice.match(BAR_RE);
  if (barMatchBefore && barMatchBefore.index !== undefined) {
    start = barMatchBefore.index + barMatchBefore[0].length;
  }
  const innerContent = text.slice(start, m.index).trim();
  return {
    innerContent,
    range: [start, phraseEnd],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Avaliação
// ────────────────────────────────────────────────────────────────────────────

/**
 * Soma termos de peso. Recebe multiplier (1 ou 2) — se 2 (modo "cada
 * lado"), termos com `explicitQuantity=true` NÃO recebem o multiplier
 * (já são quantidade absoluta declarada pelo coach: "2x70lb" = 2
 * anilhas totais, NÃO 2 anilhas por lado).
 */
function sumTerms(terms: WeightTerm[], multiplier: 1 | 2): number {
  let sum = 0;
  for (const term of terms) {
    if (multiplier === 2 && !term.explicitQuantity) {
      sum += term.quantity * term.valueKg * 2;
    } else {
      sum += term.quantity * term.valueKg;
    }
  }
  return sum;
}

/**
 * Remove um range do texto preservando espaçamento "neutro" para que
 * delimitadores externos (+, parens) continuem fazendo sentido nos
 * próximos passos.
 */
function removeRange(text: string, range: [number, number]): string {
  return text.slice(0, range[0]) + " " + text.slice(range[1]);
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a carga total em kg baseada em descrição textual + opcional
 * contexto do exercício. Sempre retorna kg arredondado a 1 casa
 * decimal ou null (não calculável).
 *
 * NUNCA inventa carga: sem unidade/sem contexto suficiente → retorna
 * conservadoramente ou null.
 *
 * @param breakdown - Descrição textual da carga (load_breakdown).
 * @param studentWeight - Peso do aluno em kg (para "peso corporal"
 *                        — comportamento atual preservado).
 * @param options - Opcional. `exerciseName` ativa heurísticas de
 *                  contexto (landmine, barra bilateral).
 */
export const calculateLoadFromBreakdown = (
  breakdown: string,
  studentWeight?: number | null,
  options?: CalculateLoadOptions,
): number | null => {
  if (!breakdown || !breakdown.trim()) return null;

  try {
    // (1) Normaliza
    const normalized = normalizeText(breakdown.trim());

    // (2) Contexto
    const ctx = decideContext(normalized, options?.exerciseName);

    // (3) Early returns
    const early = tryEarlyReturn(normalized, studentWeight);
    if (early.matched) return early.value;

    // (4) Pipeline:
    //   - Extrai cada lado (se existir)
    //   - Extrai duplos (halteres/kettlebells × 2)
    //   - Extrai barra
    //   - Restante = pesos avulsos
    let remaining = normalized;
    let total = 0;

    // 4a. cada lado (em modo landmine NÃO multiplica — mantém ramo,
    //     mas usa multiplier=1 e emite "finding interno" silencioso).
    const eachSide = extractEachSide(remaining);
    if (eachSide) {
      const innerTerms = extractWeightTerms(eachSide.innerContent);
      const multiplier = ctx.isLandmine ? 1 : 2;
      total += sumTerms(innerTerms, multiplier as 1 | 2);
      remaining = removeRange(remaining, eachSide.range);
    }

    // 4b. Duplo (2 halteres / 2 kettlebells / par de / etc.)
    //     Não compatível com unilateral explícito.
    if (!ctx.isUnilateralHint) {
      const dual = extractDualImplement(remaining);
      if (dual) {
        total += dual.kg;
        remaining = removeRange(remaining, dual.range);
      }
    }

    // 4c. Barra (sempre soma direta — em modo landmine também,
    //     porque a barra do landmine entra como peso)
    const bar = extractBar(remaining);
    if (bar) {
      total += bar.kg;
      remaining = removeRange(remaining, bar.range);
    }

    // 4d. Pesos avulsos
    const looseTerms = extractWeightTerms(remaining);
    if (looseTerms.length > 0) {
      // Caso bilateral barbell: se há `bar` + UM único plate solto sem
      // quantity explícita, e o ramo `eachSide` não atuou, inferir × 2.
      const onlyImplicitSingle =
        looseTerms.length === 1 &&
        !looseTerms[0].explicitQuantity;
      const inferBilateralX2 =
        ctx.isBilateralBarbell &&
        !eachSide &&
        bar !== null &&
        onlyImplicitSingle;
      const multiplier: 1 | 2 = inferBilateralX2 ? 2 : 1;
      total += sumTerms(looseTerms, multiplier);
    }

    // (5) Final
    return total > 0 ? roundToDecimal(total) : null;
  } catch {
    // Defensivo: qualquer falha inesperada → null em vez de número errado.
    return null;
  }
};
