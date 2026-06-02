/**
 * Testes do classificador de risco de PR (scaffolding v1 endurecido).
 * Servem também como EXEMPLOS DE CLASSIFICAÇÃO executáveis (deliverable).
 */
import { describe, expect, it } from "vitest";
import {
  classifyRisk,
  detectLockfileMajorBump,
  type ChangedFile,
} from "../classify-pr-risk";

const f = (path: string, status = "M"): ChangedFile => ({ path, status });

describe("classify-pr-risk — default-deny", () => {
  it("path não reconhecido → needs-human (default-deny)", () => {
    expect(classifyRisk([f("src/components/Foo.tsx")]).risk).toBe("needs-human");
    expect(classifyRisk([f("algum/caminho/aleatorio.xyz")]).risk).toBe("needs-human");
  });

  it("diff vazio → needs-human (fail-safe)", () => {
    expect(classifyRisk([]).risk).toBe("needs-human");
  });
});

describe("classify-pr-risk — safe-auto (allowlist estreita)", () => {
  it("doc markdown → safe-auto", () => {
    expect(classifyRisk([f("README.md")]).risk).toBe("safe-auto");
    expect(classifyRisk([f("docs/guia.md", "A")]).risk).toBe("safe-auto");
  });

  it("teste NOVO (adicionado) → safe-auto", () => {
    expect(classifyRisk([f("src/utils/__tests__/foo.coverage.test.ts", "A")]).risk).toBe("safe-auto");
    expect(classifyRisk([f("scripts/__tests__/bar.test.ts", "A")]).risk).toBe("safe-auto");
  });

  it("teste MODIFICADO → needs-human (pode enfraquecer cobertura)", () => {
    expect(classifyRisk([f("src/utils/__tests__/foo.coverage.test.ts", "M")]).risk).toBe("needs-human");
  });

  it("package-lock.json sozinho → safe-auto", () => {
    const r = classifyRisk([f("package-lock.json", "M")]);
    expect(r.risk).toBe("safe-auto");
    expect(r.autoMergeEligible).toBe(true);
  });
});

describe("classify-pr-risk — needs-human (alto risco)", () => {
  it.each([
    ["supabase/migrations/20260101_x.sql", "migration"],
    ["supabase/functions/oura-callback/index.ts", "edge function"],
    ["src/integrations/supabase/types.ts", "supabase types"],
    ["package.json", "deps declaradas"],
    ["src/components/AddExerciseDialog.tsx", "componente app (default-deny)"],
    ["supabase/functions/_shared/rls-policy.sql", "rls"],
    ["src/hooks/useOuraConnection.ts", "oura"],
  ])("%s → needs-human", (path) => {
    expect(classifyRisk([f(path)]).risk).toBe("needs-human");
  });

  it("deleção de qualquer arquivo → needs-human", () => {
    expect(classifyRisk([f("docs/old.md", "D")]).risk).toBe("needs-human");
    expect(classifyRisk([f("README.md", "D")]).risk).toBe("needs-human");
  });
});

describe("classify-pr-risk — blocked (replanejar)", () => {
  it.each([
    [".env"],
    ["config/.env.production"],
    ["src/secrets/keys.ts"],
    ["infra/vault-setup.sql"],
    ["deploy/server.pem"],
  ])("%s → blocked", (path) => {
    expect(classifyRisk([f(path)]).risk).toBe("blocked");
  });
});

describe("classify-pr-risk — PR misto nunca é safe-auto", () => {
  it("doc safe + migration de risco → needs-human", () => {
    const r = classifyRisk([f("README.md", "A"), f("supabase/migrations/x.sql", "A")]);
    expect(r.risk).toBe("needs-human");
    expect(r.autoMergeEligible).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/MISTO/i);
  });

  it("teste safe + secret bloqueado → blocked (prioridade máxima)", () => {
    expect(classifyRisk([f("a.test.ts", "A"), f(".env", "A")]).risk).toBe("blocked");
  });
});

describe("detectLockfileMajorBump — fail-safe", () => {
  it("sem diff → não suspeita", () => {
    expect(detectLockfileMajorBump("").suspected).toBe(false);
  });

  it("bump de patch balanceado (4.0.18→4.1.8) → não suspeita major", () => {
    const diff = `-      "version": "4.0.18"\n+      "version": "4.1.8"`;
    expect(detectLockfileMajorBump(diff).suspected).toBe(false);
  });

  it("major desbalanceado (1.x→2.x) → suspeita e força needs-human", () => {
    const diff = `-      "version": "1.7.0"\n+      "version": "2.1.0"`;
    expect(detectLockfileMajorBump(diff).suspected).toBe(true);
    const r = classifyRisk([f("package-lock.json", "M")], { lockfileDiff: diff });
    expect(r.risk).toBe("needs-human");
    expect(r.advisories.join(" ")).toMatch(/major/i);
  });
});
