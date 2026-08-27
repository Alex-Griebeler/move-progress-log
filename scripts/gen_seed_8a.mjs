#!/usr/bin/env node
/**
 * Gerador do seed científico PR-8a (vo2_reference_ranges + handgrip_reference_ranges).
 *
 * FONTES (dados verbatim, transcritos dos papers):
 *  • VO₂: Kaminsky et al. 2015, Mayo Clin Proc 90(11):1515-23 (FRIEND registry,
 *    esteira, CPX). Tabela 3 — percentis 5/10/25/50/75/90/95 por sexo/década.
 *    DOI 10.1016/j.mayocp.2015.07.026. É a base da tabela do ACSM GETP 10ª ed (2018).
 *  • Handgrip: Mathiowetz et al. 1985, Arch Phys Med Rehabil 66:69-74.
 *    Tabela 2 — grip mão DIREITA, média±DP em LIBRAS, por sexo/faixa de 5 anos.
 *
 * DERIVAÇÕES DECLARADAS (sujeitas a ratificação do Alex):
 *  • VO₂ 6 classes a partir dos percentis publicados:
 *    Muito Fraco <p10 · Fraco p10–p25 · Regular p25–p50 · Bom p50–p75 ·
 *    Excelente p75–p95 · Superior ≥p95. Teto 120 ml/kg/min.
 *  • Handgrip 5 classes por z-score sobre média±DP da mão direita
 *    (93% da amostra destra; comparador = MÉDIA das 3 tentativas da mão direita):
 *    Muito Baixo <−2DP · Baixo −2DP..<−1DP · Médio −1DP..<+1DP ·
 *    Alto +1DP..<+2DP · Muito Alto >=+2DP. Conversão lb→kg ×0.45359237,
 *    fronteiras arredondadas a 1 decimal. Teto 150 kg (= teto do input no app).
 *  • Fronteira pertence à banda SUPERIOR (ex.: valor exatamente em −2DP é
 *    "Baixo"). Bandas contíguas com passo 0.01 — colunas numeric(5,2) garantem
 *    que nenhum valor armazenado cai no vão.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

/**
 * UUID determinístico (estilo v5, via SHA-1) derivado da chave semântica.
 * Reproduzível: rodar o gerador de novo produz exatamente os mesmos ids,
 * então SQL e fixture nunca dessincronizam.
 */
const seedUuid = (table, sex, ageMin, ageMax, classification) => {
  const h = createHash("sha1")
    .update(`fabrik-p12-seed:${table}:${sex}:${ageMin}:${ageMax}:${classification}`)
    .digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "5" + h.slice(13, 16), // versão 5
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20), // variante RFC
    h.slice(20, 32),
  ].join("-");
};

// ── FRIEND 2015, Tabela 3 (ml/kg/min) — verbatim ───────────────────────────
const FRIEND = {
  M: {
    "20-29": { p5: 29.0, p10: 32.1, p25: 40.1, p50: 48.0, p75: 55.2, p90: 61.8, p95: 66.3 },
    "30-39": { p5: 27.2, p10: 30.2, p25: 35.9, p50: 42.4, p75: 49.2, p90: 56.5, p95: 59.8 },
    "40-49": { p5: 24.2, p10: 26.8, p25: 31.9, p50: 37.8, p75: 45.0, p90: 52.1, p95: 55.6 },
    "50-59": { p5: 20.9, p10: 22.8, p25: 27.1, p50: 32.6, p75: 39.7, p90: 45.6, p95: 50.7 },
    "60-69": { p5: 17.4, p10: 19.8, p25: 23.7, p50: 28.2, p75: 34.5, p90: 40.3, p95: 43.0 },
    "70-79": { p5: 16.3, p10: 17.1, p25: 20.4, p50: 24.4, p75: 30.4, p90: 36.6, p95: 39.7 },
  },
  F: {
    "20-29": { p5: 21.7, p10: 23.9, p25: 30.5, p50: 37.6, p75: 44.7, p90: 51.3, p95: 56.0 },
    "30-39": { p5: 19.0, p10: 20.9, p25: 25.3, p50: 30.2, p75: 36.1, p90: 41.4, p95: 45.8 },
    "40-49": { p5: 17.0, p10: 18.8, p25: 22.1, p50: 26.7, p75: 32.4, p90: 38.4, p95: 41.7 },
    "50-59": { p5: 16.0, p10: 17.3, p25: 19.9, p50: 23.4, p75: 27.6, p90: 32.0, p95: 35.9 },
    "60-69": { p5: 13.4, p10: 14.6, p25: 17.2, p50: 20.0, p75: 23.8, p90: 27.0, p95: 29.4 },
    "70-79": { p5: 13.1, p10: 13.6, p25: 15.6, p50: 18.3, p75: 20.8, p90: 23.1, p95: 24.1 },
  },
};

// ── Mathiowetz 1985, Tabela 2 — grip mão DIREITA (libras), média/DP — verbatim
const MATHIOWETZ_R = {
  M: {
    "20-24": { mean: 121.0, sd: 20.6 },
    "25-29": { mean: 120.8, sd: 23.0 },
    "30-34": { mean: 121.8, sd: 22.4 },
    "35-39": { mean: 119.7, sd: 24.0 },
    "40-44": { mean: 116.8, sd: 20.7 },
    "45-49": { mean: 109.9, sd: 23.0 },
    "50-54": { mean: 113.6, sd: 18.1 },
    "55-59": { mean: 101.1, sd: 26.7 },
    "60-64": { mean: 89.7, sd: 20.4 },
    "65-69": { mean: 91.1, sd: 20.6 },
    "70-74": { mean: 75.3, sd: 21.5 },
    "75-99": { mean: 65.7, sd: 21.0 }, // "75+" no paper (amostra até 94 anos)
  },
  F: {
    "20-24": { mean: 70.4, sd: 14.5 },
    "25-29": { mean: 74.5, sd: 13.9 },
    "30-34": { mean: 78.7, sd: 19.2 },
    "35-39": { mean: 74.1, sd: 10.8 },
    "40-44": { mean: 70.4, sd: 13.5 },
    "45-49": { mean: 62.2, sd: 15.1 },
    "50-54": { mean: 65.8, sd: 11.6 },
    "55-59": { mean: 57.3, sd: 12.5 },
    "60-64": { mean: 55.1, sd: 10.1 },
    "65-69": { mean: 49.6, sd: 9.7 },
    "70-74": { mean: 49.6, sd: 11.7 },
    "75-99": { mean: 42.6, sd: 11.0 },
  },
};

const LB_TO_KG = 0.45359237;
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

// "Derivação Fabrik": as CLASSES não são publicadas pelos autores — os dados
// (percentis / média±DP) são deles; o mapeamento em bandas é regra nossa.
const VO2_SOURCE = "Derivação Fabrik sobre FRIEND 2015 (Kaminsky, Mayo Clin Proc, DOI 10.1016/j.mayocp.2015.07.026; esteira/CPX máximo)";
const HG_SOURCE = "Derivação Fabrik (bandas z-score) sobre Mathiowetz 1985 (Arch Phys Med Rehabil 66:69-74; mão DIREITA, média de 3 tentativas)";

// ── Montagem das bandas ────────────────────────────────────────────────────
const vo2Rows = [];
for (const sex of ["M", "F"]) {
  for (const [band, p] of Object.entries(FRIEND[sex])) {
    const [ageMin, ageMax] = band.split("-").map(Number);
    const cuts = [p.p10, p.p25, p.p50, p.p75, p.p95];
    if (!cuts.every((c, i) => i === 0 || c > cuts[i - 1])) throw new Error(`cortes não-monotônicos ${sex} ${band}`);
    const classes = ["Muito Fraco", "Fraco", "Regular", "Bom", "Excelente", "Superior"];
    const mins = [0, ...cuts];
    const maxs = [...cuts.map((c) => r2(c - 0.01)), 120];
    classes.forEach((classification, i) => {
      vo2Rows.push({
        id: seedUuid("vo2", sex, ageMin, ageMax, classification), sex, age_min: ageMin, age_max: ageMax,
        classification, vo2_min: mins[i], vo2_max: maxs[i], source: VO2_SOURCE,
      });
    });
  }
}

const hgRows = [];
for (const sex of ["M", "F"]) {
  for (const [band, { mean, sd }] of Object.entries(MATHIOWETZ_R[sex])) {
    const [ageMin, ageMax] = band.split("-").map(Number);
    const kg = (lb) => r1(lb * LB_TO_KG);
    const cuts = [kg(mean - 2 * sd), kg(mean - sd), kg(mean + sd), kg(mean + 2 * sd)];
    if (!cuts.every((c, i) => c > 0 && (i === 0 || c > cuts[i - 1]))) throw new Error(`cortes inválidos ${sex} ${band}: ${cuts}`);
    const classes = ["Muito Baixo", "Baixo", "Médio", "Alto", "Muito Alto"];
    const mins = [0, ...cuts];
    const maxs = [...cuts.map((c) => r2(c - 0.01)), 150];
    classes.forEach((classification, i) => {
      hgRows.push({
        id: seedUuid("handgrip", sex, ageMin, ageMax, classification), sex, age_min: ageMin, age_max: ageMax,
        classification, kg_min: mins[i], kg_max: maxs[i], source: HG_SOURCE,
      });
    });
  }
}

// ── SQL ────────────────────────────────────────────────────────────────────
const esc = (s) => s.replace(/'/g, "''");
const vo2Values = vo2Rows.map((r) =>
  `  ('${r.id}', '${r.sex}', ${r.age_min}, ${r.age_max}, '${esc(r.classification)}', ${r.vo2_min.toFixed(2)}, ${r.vo2_max.toFixed(2)}, '${esc(r.source)}')`,
).join(",\n");
const hgValues = hgRows.map((r) =>
  `  ('${r.id}', '${r.sex}', ${r.age_min}, ${r.age_max}, '${esc(r.classification)}', ${r.kg_min.toFixed(2)}, ${r.kg_max.toFixed(2)}, '${esc(r.source)}')`,
).join(",\n");

const sql = `-- ============================================================================
-- PR-8a — Seed científico das tabelas de referência (Precision 12)
--
-- vo2_reference_ranges: ${vo2Rows.length} linhas — FRIEND 2015 (Kaminsky et al.,
--   Mayo Clin Proc 90(11):1515-23, DOI 10.1016/j.mayocp.2015.07.026), Tabela 3,
--   percentis por sexo/década (esteira, CPX). Base da tabela ACSM GETP 10a ed.
--   Mapeamento (DERIVAÇÃO FABRIK, não classificação publicada pelos autores):
--   Muito Fraco <p10 · Fraco p10–<p25 · Regular p25–<p50 · Bom p50–<p75
--   · Excelente p75–<p95 · Superior >=p95. Idades 20–79; fora disso => sem
--   classificação (comportamento já tratado no app). Teto 120 ml/kg/min.
--   APLICABILIDADE: normas de teste MÁXIMO em ESTEIRA com CPX. Uso pra VO₂
--   estimado (bike/submáximo) é decisão operacional Fabrik ratificada pelo
--   Alex, com viés conhecido (estimativas de bike tendem a subestimar).
--
-- handgrip_reference_ranges: ${hgRows.length} linhas — Mathiowetz et al. 1985 (Arch
--   Phys Med Rehabil 66:69-74), Tabela 2, mão DIREITA, média±DP em libras,
--   convertido ×0.45359237 (fronteiras arredondadas a 1 decimal).
--   Bandas z-score (DERIVAÇÃO FABRIK): Muito Baixo <−2DP · Baixo −2DP..<−1DP
--   · Médio −1DP..<+1DP · Alto +1DP..<+2DP · Muito Alto >=+2DP.
--   Faixa "75+" do paper => age_max 99 (amostra real ia até 94 anos;
--   95–99 é extrapolação operacional documentada). Teto 150 kg (= teto de
--   input do app). Idades <20 => sem classificação.
--   COMPARADOR: normas são da mão DIREITA, protocolo = MÉDIA das 3 tentativas
--   — classificar mean(right_kg_attempts) contra elas
--   (válido independente de dominância: Mathiowetz mostrou diferença mínima
--   entre destros e canhotos por MÃO). NÃO classificar best_kg das duas mãos.
--
-- Fronteira pertence à banda SUPERIOR. Bandas contíguas com passo 0.01;
-- colunas de valor são numeric(5,2), então nenhum valor armazenado cai no vão.
--
-- IDEMPOTÊNCIA: UUIDs fixos + ON CONFLICT (id) DO NOTHING.
-- PRECHECK FATAL: aborta se existir linha com a mesma chave semântica
--   (sex, age_min, age_max, classification) e id DIFERENTE — evita duplicata
--   semântica se alguém já tiver seedado por outra via.
--
-- ROLLBACK (apaga exatamente o que este seed criou, mesmo se editado depois):
--   delete from public.vo2_reference_ranges where id in (lista de UUIDs abaixo);
--   delete from public.handgrip_reference_ranges where id in (lista de UUIDs abaixo);
-- ============================================================================

do $$
declare
  dup_count int;
begin
  select count(*) into dup_count
  from public.vo2_reference_ranges t
  join (values
${vo2Rows.map((r) => `    ('${r.id}'::uuid, '${r.sex}', ${r.age_min}, ${r.age_max}, '${esc(r.classification)}')`).join(",\n")}
  ) as seed(id, sex, age_min, age_max, classification)
    on t.sex = seed.sex and t.age_min = seed.age_min
   and t.age_max = seed.age_max and t.classification = seed.classification
   and t.id <> seed.id;
  if dup_count > 0 then
    raise exception 'PRECHECK FATAL: % linha(s) em vo2_reference_ranges com mesma chave semântica e id diferente — investigar antes de seedar', dup_count;
  end if;

  select count(*) into dup_count
  from public.handgrip_reference_ranges t
  join (values
${hgRows.map((r) => `    ('${r.id}'::uuid, '${r.sex}', ${r.age_min}, ${r.age_max}, '${esc(r.classification)}')`).join(",\n")}
  ) as seed(id, sex, age_min, age_max, classification)
    on t.sex = seed.sex and t.age_min = seed.age_min
   and t.age_max = seed.age_max and t.classification = seed.classification
   and t.id <> seed.id;
  if dup_count > 0 then
    raise exception 'PRECHECK FATAL: % linha(s) em handgrip_reference_ranges com mesma chave semântica e id diferente — investigar antes de seedar', dup_count;
  end if;
end $$;

insert into public.vo2_reference_ranges
  (id, sex, age_min, age_max, classification, vo2_min, vo2_max, source)
values
${vo2Values}
on conflict (id) do nothing;

insert into public.handgrip_reference_ranges
  (id, sex, age_min, age_max, classification, kg_min, kg_max, source)
values
${hgValues}
on conflict (id) do nothing;

-- Verificação pós-insert: compara TODAS as colunas de TODAS as linhas do seed
-- contra o banco. Pega aplicação parcial E linha pré-existente com o mesmo id
-- mas valores divergentes (que o ON CONFLICT DO NOTHING teria preservado em
-- silêncio). Reaplicar só declara "Seed OK" se o banco bater 100% com o seed.
do $$
declare
  vo2_ok int;
  hg_ok int;
begin
  select count(*) into vo2_ok
  from public.vo2_reference_ranges t
  join (values
${vo2Rows.map((r) => `    ('${r.id}'::uuid, '${r.sex}', ${r.age_min}, ${r.age_max}, '${esc(r.classification)}', ${r.vo2_min.toFixed(2)}::numeric, ${r.vo2_max.toFixed(2)}::numeric)`).join(",\n")}
  ) as seed(id, sex, age_min, age_max, classification, vo2_min, vo2_max)
    on t.id = seed.id and t.sex = seed.sex and t.age_min = seed.age_min
   and t.age_max = seed.age_max and t.classification = seed.classification
   and t.vo2_min = seed.vo2_min and t.vo2_max = seed.vo2_max;

  select count(*) into hg_ok
  from public.handgrip_reference_ranges t
  join (values
${hgRows.map((r) => `    ('${r.id}'::uuid, '${r.sex}', ${r.age_min}, ${r.age_max}, '${esc(r.classification)}', ${r.kg_min.toFixed(2)}::numeric, ${r.kg_max.toFixed(2)}::numeric)`).join(",\n")}
  ) as seed(id, sex, age_min, age_max, classification, kg_min, kg_max)
    on t.id = seed.id and t.sex = seed.sex and t.age_min = seed.age_min
   and t.age_max = seed.age_max and t.classification = seed.classification
   and t.kg_min = seed.kg_min and t.kg_max = seed.kg_max;

  if vo2_ok <> ${vo2Rows.length} or hg_ok <> ${hgRows.length} then
    raise exception 'POSCHECK FATAL: banco diverge do seed — vo2 %/${vo2Rows.length}, handgrip %/${hgRows.length} linhas idênticas. Alguma linha está faltando ou existe com valores diferentes (ON CONFLICT preservou); comparar pelos ids do cabeçalho.', vo2_ok, hg_ok;
  end if;
  raise notice 'Seed OK: % linhas vo2 + % linhas handgrip conferidas coluna a coluna', vo2_ok, hg_ok;
end $$;
`;

// ── Fixture TS pros testes de sanidade ─────────────────────────────────────
const fixture = `/**
 * Fixture do seed científico PR-8a — GERADO por scripts/gen_seed_8a.mjs a
 * partir dos dados verbatim de FRIEND 2015 (Tabela 3) e Mathiowetz 1985
 * (Tabela 2, mão direita). NÃO editar à mão: espelha exatamente a migração
 * 20260827_seed_reference_ranges.sql (mesmos UUIDs e valores).
 */
import type { Vo2ReferenceRange, HandgripReferenceRange } from "@/utils/classification";

export interface SeededVo2Row extends Vo2ReferenceRange { id: string; source: string }
export interface SeededHandgripRow extends HandgripReferenceRange { id: string; source: string }

export const VO2_SEED: SeededVo2Row[] = ${JSON.stringify(vo2Rows, null, 2)};

export const HANDGRIP_SEED: SeededHandgripRow[] = ${JSON.stringify(hgRows, null, 2)};
`;

writeFileSync(process.argv[2] ?? "seed_8a.sql", sql);
writeFileSync(process.argv[3] ?? "referenceRangesSeed.fixture.ts", fixture);

console.log(`vo2 rows: ${vo2Rows.length} | handgrip rows: ${hgRows.length}`);
console.log("spot-checks:");
console.log("  M 50-59 VO2 Bom min (=p50 32.6):", vo2Rows.find((r) => r.sex === "M" && r.age_min === 50 && r.classification === "Bom").vo2_min);
console.log("  F 30-39 grip Médio:", JSON.stringify(hgRows.find((r) => r.sex === "F" && r.age_min === 30 && r.classification === "Médio")));
console.log("  M 75+ grip Muito Baixo max (<mean-2DP de 65.7-42lb=23.7lb→10.7kg):", hgRows.find((r) => r.sex === "M" && r.age_min === 75 && r.classification === "Muito Baixo").kg_max);
