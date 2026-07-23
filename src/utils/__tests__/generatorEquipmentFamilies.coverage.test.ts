/**
 * Source-based coverage do matching de equipamento por FAMÍLIA no
 * generate-group-session.
 *
 * Bug histórico (auditoria 2026-07-23): equipment_inventory guarda itens por
 * peso ("kettlebell 8kg") e equipment_required usa tokens genéricos ("kb",
 * "nenhum") — o match por igualdade exata deixava só ~112/909 exercícios no
 * pool e o gerador produzia sessões anêmicas (BP sem upper, sem BP2, sem carry).
 */
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  resolve(__dirname, "../../../supabase/functions/generate-group-session/index.ts"),
  "utf-8",
);

describe("generate-group-session — equipamento por família", () => {
  it("trata peso corporal como sempre disponível (tokens nenhum/peso_corporal)", () => {
    expect(src).toMatch(/BODYWEIGHT_TOKENS\s*=\s*new Set\(\[\s*"nenhum",\s*"peso_corporal"/);
    expect(src).toMatch(/if \(fam === null\) return true;/);
  });

  it("normaliza inventário por família (strip de peso kg + aliases kb/db/barra)", () => {
    expect(src).toMatch(/function inventoryFamily\(/);
    expect(src).toMatch(/kb:\s*"kettlebell"/);
    expect(src).toMatch(/db:\s*"halter"/);
    expect(src).toMatch(/\\d\+\(\[\.,\]\\d\+\)\?\\s\*kg|\d\+.*kg/); // regex de strip de peso presente
  });

  it("é fail-open para família fora do dicionário (inventário incompleto não filtra)", () => {
    expect(src).toMatch(/return !knownFamilies\.has\(fam\);/);
  });

  it("avisa quando o filtro derruba mais de 30% do pool (anti-silêncio)", () => {
    expect(src).toMatch(/beforeEquipmentFilter/);
    expect(src).toMatch(/< 0\.7/);
  });
});
