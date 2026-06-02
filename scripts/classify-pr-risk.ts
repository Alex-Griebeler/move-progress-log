/**
 * classify-pr-risk — classificador de risco de PR para a automação multi-agente
 * do Fabrik Performance (scaffolding v1 endurecido).
 *
 * PRINCÍPIO CENTRAL: DEFAULT-DENY.
 *   Qualquer arquivo cujo path NÃO esteja na allowlist explícita de baixo
 *   risco resulta em `needs-human`. Nunca `safe-auto` por omissão.
 *
 * Níveis de saída:
 *   - "safe-auto"   : 100% dos arquivos batem na allowlist estreita. Elegível
 *                     a auto-merge SE o CI estiver verde (e SE o auto-merge
 *                     estiver habilitado — em v1 ele vem DESLIGADO).
 *   - "needs-human" : algo de risco, algo não-reconhecido, ou PR misto.
 *                     Espera o clique humano.
 *   - "blocked"     : padrão perigoso que não deve seguir sem replanejar
 *                     (secrets/Vault/.env). Não mergeia nem com aprovação
 *                     trivial — exige reconsideração.
 *
 * IMPORTANTE: este classificador é PATH-BASED. Ele não "entende" semântica.
 * Por isso a allowlist `safe-auto` é deliberadamente minúscula em v1 — só o
 * que é mecanicamente verificável por caminho/status. Casos como
 * "constante com valores idênticos" NÃO entram em safe-auto na v1 porque um
 * classificador de path não consegue provar identidade de valor (ver
 * LIMITAÇÕES no fim do arquivo).
 *
 * Sem dependências externas: roda com `npx tsx scripts/classify-pr-risk.ts`.
 */

export type RiskLevel = "safe-auto" | "needs-human" | "blocked";

export interface ChangedFile {
  /** Caminho relativo à raiz do repo. */
  path: string;
  /** Status do git: A(dded) M(odified) D(eleted) R(enamed) C(opied) T(ype). */
  status: string;
}

export interface FileVerdict {
  path: string;
  status: string;
  level: RiskLevel;
  rule: string;
}

export interface RiskResult {
  risk: RiskLevel;
  /** safe-auto E elegível a auto-merge (auto-merge ainda pode estar OFF). */
  autoMergeEligible: boolean;
  fileVerdicts: FileVerdict[];
  reasons: string[];
  /** Avisos não-bloqueantes (ex.: possível major bump no lockfile). */
  advisories: string[];
  gatesRequired: string[];
}

// ──────────────────────────────────────────────────────────────────────────
// Regras de path. Ordem de precedência: BLOCKED > NEEDS_HUMAN > SAFE > default.
// ──────────────────────────────────────────────────────────────────────────

/** Padrões que travam o PR (não mergeia até replanejar). */
const BLOCKED_PATTERNS: Array<{ re: RegExp; rule: string }> = [
  { re: /(^|\/)\.env(\.|$)/i, rule: "arquivo .env (secret)" },
  { re: /(^|\/)secrets?(\/|\.|$)/i, rule: "path de secret" },
  { re: /vault/i, rule: "referência a Vault" },
  { re: /\.pem$|\.key$|id_rsa|credentials?\.json$/i, rule: "material de credencial" },
];

/** Padrões de ALTO RISCO — exigem aprovação humana (nunca safe-auto). */
const NEEDS_HUMAN_PATTERNS: Array<{ re: RegExp; rule: string }> = [
  { re: /^supabase\/migrations\//, rule: "migration de banco" },
  { re: /^supabase\/functions\//, rule: "edge function" },
  { re: /\b(rls|policy|policies|grant|grants|role|roles)\b/i, rule: "RLS/policy/role/grant" },
  { re: /(auth|oauth|oura|token|callback)/i, rule: "auth/Oura/OAuth/token" },
  { re: /storage/i, rule: "storage" },
  { re: /(^|\/)package\.json$/, rule: "package.json (dependências)" },
  { re: /supabase\/.*types\.ts$|integrations\/supabase\/types/i, rule: "Supabase types" },
  // Módulos sensíveis Fabrik (dados clínicos / prescrição / carga / voz).
  { re: /(dexa|assessment|prescription|prescricao|relatorio|report)/i, rule: "prescrição/DEXA/relatório" },
  { re: /(load|carga|voice|voz|audio|segment)/i, rule: "carga/registro por voz" },
  { re: /(^|\/)(migration|seed)s?\//i, rule: "migration/seed" },
];

/** Allowlist ESTREITA de baixo risco (v1). Precedência mais baixa. */
const SAFE_PATTERNS: Array<{ re: RegExp; rule: string; addedOnly?: boolean }> = [
  { re: /\.md$/i, rule: "documentação (markdown)" },
  { re: /^docs\//i, rule: "documentação (docs/)" },
  { re: /(^|\/)__tests__\/.*\.(test|spec|coverage\.test)\.[cm]?[jt]sx?$/i, rule: "arquivo de teste", addedOnly: true },
  { re: /\.(test|spec)\.[cm]?[jt]sx?$/i, rule: "arquivo de teste", addedOnly: true },
  { re: /^package-lock\.json$/, rule: "lockfile (somente)" },
];

const ADD_STATUS = new Set(["A"]);

function matchFile(file: ChangedFile): FileVerdict {
  const { path, status } = file;

  // 1) BLOCKED tem prioridade máxima.
  for (const { re, rule } of BLOCKED_PATTERNS) {
    if (re.test(path)) return { path, status, level: "blocked", rule };
  }

  // 2) Qualquer DELEÇÃO é needs-human (pode remover teste/segurança/contrato).
  if (status.startsWith("D")) {
    return { path, status, level: "needs-human", rule: "deleção de arquivo" };
  }

  // 3) ALTO RISCO.
  for (const { re, rule } of NEEDS_HUMAN_PATTERNS) {
    if (re.test(path)) return { path, status, level: "needs-human", rule };
  }

  // 4) Allowlist de baixo risco (só pra arquivos ADICIONADOS quando exigido).
  for (const { re, rule, addedOnly } of SAFE_PATTERNS) {
    if (re.test(path)) {
      if (addedOnly && !ADD_STATUS.has(status[0] ?? "")) {
        // Teste MODIFICADO pode relaxar asserts → trata como risco.
        return {
          path,
          status,
          level: "needs-human",
          rule: `${rule} (modificado, não adicionado — pode enfraquecer cobertura)`,
        };
      }
      return { path, status, level: "safe-auto", rule };
    }
  }

  // 5) DEFAULT-DENY: path não reconhecido → needs-human.
  return { path, status, level: "needs-human", rule: "path não reconhecido (default-deny)" };
}

/**
 * Detector best-effort de major bump no diff do package-lock.json.
 * Fail-safe: se há QUALQUER dúvida de major, sinaliza (advisory) e força
 * needs-human. Pareamento exato old↔new por pacote é complexo; aqui usamos
 * a heurística conservadora de comparar o multiset de "majors" removidos vs
 * adicionados — divergência => possível major.
 */
export function detectLockfileMajorBump(lockfileDiff: string): {
  suspected: boolean;
  detail: string;
} {
  if (!lockfileDiff) return { suspected: false, detail: "" };
  const majorsOf = (sign: "+" | "-") => {
    const re = new RegExp(`^\\${sign}\\s*"version":\\s*"(\\d+)\\.`, "gm");
    const counts: Record<string, number> = {};
    let m: RegExpExecArray | null;
    while ((m = re.exec(lockfileDiff)) !== null) {
      counts[m[1]] = (counts[m[1]] ?? 0) + 1;
    }
    return counts;
  };
  const removed = majorsOf("-");
  const added = majorsOf("+");
  const majors = new Set([...Object.keys(removed), ...Object.keys(added)]);
  for (const maj of majors) {
    if ((removed[maj] ?? 0) !== (added[maj] ?? 0)) {
      return {
        suspected: true,
        detail: `desbalanço no major ${maj}.x (removidos=${removed[maj] ?? 0}, adicionados=${added[maj] ?? 0})`,
      };
    }
  }
  return { suspected: false, detail: "" };
}

export interface ClassifyOptions {
  /** Diff bruto do package-lock.json, se houver, para o detector de major. */
  lockfileDiff?: string;
}

export function classifyRisk(
  files: ChangedFile[],
  opts: ClassifyOptions = {},
): RiskResult {
  const reasons: string[] = [];
  const advisories: string[] = [];
  const gatesRequired = [
    "git diff --check",
    "npm run lint",
    "npx tsc --noEmit",
    "npm run test -- --run",
    "npm run build",
    "npm run verify:essential",
  ];

  if (files.length === 0) {
    return {
      risk: "needs-human",
      autoMergeEligible: false,
      fileVerdicts: [],
      reasons: ["nenhum arquivo detectado no diff (fail-safe → needs-human)"],
      advisories,
      gatesRequired,
    };
  }

  const fileVerdicts = files.map(matchFile);

  const anyBlocked = fileVerdicts.some((v) => v.level === "blocked");
  const anyNeedsHuman = fileVerdicts.some((v) => v.level === "needs-human");
  const allSafe = fileVerdicts.every((v) => v.level === "safe-auto");

  // Detecção de PR misto (safe + algo de risco) → nunca safe-auto.
  const hasSafe = fileVerdicts.some((v) => v.level === "safe-auto");
  const mixed = hasSafe && (anyBlocked || anyNeedsHuman);
  if (mixed) {
    reasons.push(
      "PR MISTO: combina arquivos safe-auto com arquivos de risco. " +
        "Política: dividir em PRs separados (um tema por PR).",
    );
  }

  // Major bump no lockfile → fail-safe needs-human + advisory.
  let forcedByDeps = false;
  if (opts.lockfileDiff) {
    const mb = detectLockfileMajorBump(opts.lockfileDiff);
    if (mb.suspected) {
      forcedByDeps = true;
      advisories.push(`Possível major bump no package-lock.json: ${mb.detail}. Forçando needs-human.`);
    }
  }

  let risk: RiskLevel;
  if (anyBlocked) {
    risk = "blocked";
    reasons.push(
      "Contém path bloqueado (secret/Vault/.env/credencial) — replanejar antes de mergear.",
    );
  } else if (anyNeedsHuman || !allSafe || forcedByDeps) {
    risk = "needs-human";
  } else {
    risk = "safe-auto";
  }

  for (const v of fileVerdicts) {
    if (v.level !== "safe-auto") {
      reasons.push(`${v.path} [${v.status}] → ${v.level}: ${v.rule}`);
    }
  }

  return {
    risk,
    autoMergeEligible: risk === "safe-auto",
    fileVerdicts,
    reasons,
    advisories,
    gatesRequired,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Render do comentário de PR (markdown legível).
// ──────────────────────────────────────────────────────────────────────────

export function renderMarkdown(result: RiskResult): string {
  const emoji =
    result.risk === "safe-auto" ? "🟢" : result.risk === "needs-human" ? "🟡" : "🔴";
  const lines: string[] = [];
  lines.push(`### ${emoji} Classificação de risco: \`${result.risk}\``);
  lines.push("");
  if (result.risk === "safe-auto") {
    lines.push(
      "Todos os arquivos batem na allowlist estreita de baixo risco. " +
        "**Elegível a auto-merge** se o CI passar (auto-merge só age se estiver habilitado).",
    );
  } else if (result.risk === "needs-human") {
    lines.push("**Requer aprovação humana.** Auto-merge não age neste PR.");
  } else {
    lines.push("**BLOQUEADO.** Contém padrão perigoso — replaneje antes de prosseguir.");
  }
  lines.push("");
  lines.push("| Arquivo | Status | Nível | Regra |");
  lines.push("|---|---|---|---|");
  for (const v of result.fileVerdicts) {
    const e = v.level === "safe-auto" ? "🟢" : v.level === "needs-human" ? "🟡" : "🔴";
    lines.push(`| \`${v.path}\` | ${v.status} | ${e} ${v.level} | ${v.rule} |`);
  }
  if (result.advisories.length) {
    lines.push("");
    lines.push("**Avisos:**");
    for (const a of result.advisories) lines.push(`- ⚠️ ${a}`);
  }
  lines.push("");
  lines.push("<sub>Gerado por `scripts/classify-pr-risk.ts` · default-deny · só o workflow aplica a label.</sub>");
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────────
// CLI
//   node/tsx scripts/classify-pr-risk.ts --files-from <name-status.txt> \
//        [--lockfile-diff <lock.diff>] [--markdown-out <comment.md>]
//   `name-status.txt` no formato de `git diff --name-status base...head`.
//   Imprime o JSON do resultado no stdout.
// ──────────────────────────────────────────────────────────────────────────

function parseNameStatus(content: string): ChangedFile[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const status = parts[0] ?? "";
      // Rename/Copy vêm como "R100 old new" — pegamos o destino.
      const path = parts.length >= 3 && /^[RC]/.test(status) ? parts[2] : parts[1] ?? "";
      return { status, path };
    })
    .filter((f) => f.path);
}

async function main() {
  const { readFileSync, writeFileSync } = await import("node:fs");
  const argv = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const filesFrom = getArg("--files-from");
  if (!filesFrom) {
    console.error("Uso: classify-pr-risk.ts --files-from <name-status.txt> [--lockfile-diff <f>] [--markdown-out <f>]");
    process.exit(2);
  }
  const files = parseNameStatus(readFileSync(filesFrom, "utf-8"));
  const lockfileDiffPath = getArg("--lockfile-diff");
  const lockfileDiff = lockfileDiffPath ? readFileSync(lockfileDiffPath, "utf-8") : "";

  const result = classifyRisk(files, { lockfileDiff });

  const mdOut = getArg("--markdown-out");
  if (mdOut) writeFileSync(mdOut, renderMarkdown(result), "utf-8");

  console.log(JSON.stringify(result, null, 2));
}

// Executa só quando rodado como CLI (não em import de teste).
const isCli =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  /classify-pr-risk\.(ts|js|mjs)$/.test(process.argv[1] ?? "");
if (isCli) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

/*
 * LIMITAÇÕES CONHECIDAS (v1)
 * --------------------------
 * 1. Classificação é por PATH/STATUS, não por semântica. "Constante com
 *    valores idênticos" NÃO é safe-auto em v1 — um classificador de path não
 *    prova identidade de valor. Graduar pra safe-auto exige um value-diff
 *    checker (v2). Até lá: needs-human (default-deny vence).
 * 2. "Refactor sem mudança de contrato" NÃO é safe-auto — os testes do repo
 *    são majoritariamente source-based (regex no fonte) e não pegam regressão
 *    de comportamento.
 * 3. Detector de major bump no lockfile é heurístico (multiset de majors).
 *    Fail-safe (over-flag), mas não substitui um semver-diff real. Por isso,
 *    e por precaução, AUTO-MERGE DE DEPS deve permanecer desligado até existir
 *    um guard de major dedicado.
 * 4. O classificador roda na lane de PR. Commits diretos no `main` (ex.:
 *    Lovable/gpt-engineer-app bot) NÃO passam por aqui — são cobertos pelo
 *    `main-watcher.yml`.
 */
