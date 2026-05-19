import { describe, it, expect } from 'vitest';
import { calculateLoadFromBreakdown } from '../loadCalculation';

describe('calculateLoadFromBreakdown', () => {
  // ── Null / empty cases ────────────────────────────────────────────────
  it('returns null for empty string', () => {
    expect(calculateLoadFromBreakdown('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(calculateLoadFromBreakdown('   ')).toBeNull();
  });

  it('returns null for undefined-like input', () => {
    expect(calculateLoadFromBreakdown(null as unknown as string)).toBeNull();
  });

  // ── Body weight (comportamento atual preservado — NÃO mudar neste PR) ──
  it('returns explicit body weight value', () => {
    expect(calculateLoadFromBreakdown('Peso corporal = 75 kg')).toBe(75);
  });

  it('returns student weight for "peso corporal" without value', () => {
    expect(calculateLoadFromBreakdown('Peso corporal', 80)).toBe(80);
  });

  it('returns null for "peso corporal" without student weight', () => {
    expect(calculateLoadFromBreakdown('Peso corporal')).toBeNull();
  });

  // ── Elastic / bands ───────────────────────────────────────────────────
  it('returns null for elastic bands', () => {
    expect(calculateLoadFromBreakdown('elástico verde')).toBeNull();
  });

  it('returns null for "elástico roxo"', () => {
    expect(calculateLoadFromBreakdown('elástico roxo')).toBeNull();
  });

  it('returns null for bands', () => {
    expect(calculateLoadFromBreakdown('banda leve')).toBeNull();
  });

  // ── Placa sem unidade (regra nova: placa não tem peso padrão) ─────────
  it('"placa 8" sem unidade → null (peso da placa é desconhecido)', () => {
    expect(calculateLoadFromBreakdown('placa 8')).toBeNull();
  });

  it('"placa 8kg" COM unidade → 8 (peso simples)', () => {
    expect(calculateLoadFromBreakdown('placa 8kg')).toBe(8);
  });

  // ── Simple weights ────────────────────────────────────────────────────
  it('parses simple kg value', () => {
    expect(calculateLoadFromBreakdown('20 kg')).toBe(20);
  });

  it('parses simple lb value', () => {
    const result = calculateLoadFromBreakdown('10 lb');
    expect(result).toBeCloseTo(4.5, 1);
  });

  it('decimal com vírgula BR', () => {
    expect(calculateLoadFromBreakdown('12,5 kg')).toBe(12.5);
  });

  it('decimal com ponto', () => {
    expect(calculateLoadFromBreakdown('12.5 kg')).toBe(12.5);
  });

  // ── Variantes de unidade (PT-BR / EN) ─────────────────────────────────
  it('aceita "libras" (plural PT)', () => {
    // 10 libras = 4.536 → 4.5
    expect(calculateLoadFromBreakdown('10 libras')).toBe(4.5);
  });

  it('aceita "libra" (singular PT)', () => {
    expect(calculateLoadFromBreakdown('10 libra')).toBe(4.5);
  });

  it('aceita "pounds" (EN)', () => {
    expect(calculateLoadFromBreakdown('10 pounds')).toBe(4.5);
  });

  it('aceita "pound" (EN singular)', () => {
    expect(calculateLoadFromBreakdown('10 pound')).toBe(4.5);
  });

  it('aceita "lbs" plural curto', () => {
    expect(calculateLoadFromBreakdown('10 lbs')).toBe(4.5);
  });

  it('aceita "kgs" plural curto', () => {
    expect(calculateLoadFromBreakdown('20 kgs')).toBe(20);
  });

  it('aceita "quilos" PT-BR', () => {
    expect(calculateLoadFromBreakdown('20 quilos')).toBe(20);
  });

  it('aceita "quilo" PT-BR singular', () => {
    expect(calculateLoadFromBreakdown('20 quilo')).toBe(20);
  });

  it('aceita "quilogramas" PT-BR formal', () => {
    expect(calculateLoadFromBreakdown('20 quilogramas')).toBe(20);
  });

  // ── "De cada lado" pattern — variantes obrigatórias ───────────────────
  it('"(2kg + 5lb) de cada lado"', () => {
    // 2*2 + 5*0.4536*2 = 4 + 4.536 = 8.536 → 8.5
    expect(calculateLoadFromBreakdown('(2kg + 5lb) de cada lado')).toBe(8.5);
  });

  it('"10kg de cada lado" sem parens', () => {
    expect(calculateLoadFromBreakdown('10kg de cada lado')).toBe(20);
  });

  it('"barra 20kg + 10kg de cada lado"', () => {
    expect(calculateLoadFromBreakdown('barra 20kg + 10kg de cada lado')).toBe(40);
  });

  it('"15lb + 2kg de cada lado + barra 10kg"', () => {
    // barra=10 + (15lb*0.4536*2 + 2kg*2) = 10 + 13.608 + 4 = 27.6
    expect(calculateLoadFromBreakdown('15lb + 2kg de cada lado + barra 10kg')).toBe(27.6);
  });

  it('"15lb + 2kg cada lado + barra 10kg" (sem "de")', () => {
    expect(calculateLoadFromBreakdown('15lb + 2kg cada lado + barra 10kg')).toBe(27.6);
  });

  it('"25 lb + 5 kg cada lado + barra 20kg"', () => {
    expect(calculateLoadFromBreakdown('25 lb + 5 kg cada lado + barra 20kg')).toBe(52.7);
  });

  // ── Casos OBRIGATÓRIOS do prompt — regression guards ──────────────────
  it('REGRESSION: "70 lb cada lado + barra 15kg" → 78.5', () => {
    expect(calculateLoadFromBreakdown('70 lb cada lado + barra 15kg')).toBe(78.5);
  });

  it('REGRESSION: "70 lb de cada lado + barra 15kg" → 78.5', () => {
    expect(calculateLoadFromBreakdown('70 lb de cada lado + barra 15kg')).toBe(78.5);
  });

  it('REGRESSION: "70lb cada lado barra 15kg" (sem +) → 78.5', () => {
    expect(calculateLoadFromBreakdown('70lb cada lado barra 15kg')).toBe(78.5);
  });

  it('REGRESSION: "(70lb + 2kg) cada lado + barra 15kg" → 82.5', () => {
    expect(calculateLoadFromBreakdown('(70lb + 2kg) cada lado + barra 15kg')).toBe(82.5);
  });

  it('REGRESSION: "(70lb + 2kg) de cada lado + barra 15kg" → 82.5', () => {
    expect(calculateLoadFromBreakdown('(70lb + 2kg) de cada lado + barra 15kg')).toBe(82.5);
  });

  it('REGRESSION: "(70 lb) cada lado + barra 15kg" → 78.5', () => {
    expect(calculateLoadFromBreakdown('(70 lb) cada lado + barra 15kg')).toBe(78.5);
  });

  it('REGRESSION: "(70 lb) de cada lado + barra 15kg" → 78.5', () => {
    expect(calculateLoadFromBreakdown('(70 lb) de cada lado + barra 15kg')).toBe(78.5);
  });

  it('REGRESSION: "70 lb + barra 15kg" (sem cada lado) → 46.8', () => {
    expect(calculateLoadFromBreakdown('70 lb + barra 15kg')).toBe(46.8);
  });

  it('REGRESSION: "(20kg + 10lb) cada lado + barra 15kg" → 64.1', () => {
    expect(calculateLoadFromBreakdown('(20kg + 10lb) cada lado + barra 15kg')).toBe(64.1);
  });

  // ── Multiplicador explícito Nx fora de cada lado ──────────────────────
  it('"(2x70lb+2kg)+ barra 15kg" → 80.5', () => {
    // 2x70lb absoluto = 63.504; +2kg + barra 15 = 80.504 → 80.5
    expect(calculateLoadFromBreakdown('(2x70lb+2kg)+ barra 15kg')).toBe(80.5);
  });

  it('"2x70lb + 2kg + barra 15kg" → 80.5', () => {
    expect(calculateLoadFromBreakdown('2x70lb + 2kg + barra 15kg')).toBe(80.5);
  });

  it('"2x70lb + 2x2kg + barra 15kg" → 82.5', () => {
    // 63.504 + 4 + 15 = 82.504 → 82.5
    expect(calculateLoadFromBreakdown('2x70lb + 2x2kg + barra 15kg')).toBe(82.5);
  });

  it('multiplicador com × (sinal unicode): "(2×70lb + 2kg)+ barra 15kg" → 80.5', () => {
    expect(calculateLoadFromBreakdown('(2×70lb + 2kg)+ barra 15kg')).toBe(80.5);
  });

  it('multiplicador com asterisco: "(2*70lb + 2kg)+ barra 15kg" → 80.5', () => {
    expect(calculateLoadFromBreakdown('(2*70lb + 2kg)+ barra 15kg')).toBe(80.5);
  });

  // ── Multiplicador Nx DENTRO de cada lado ──────────────────────────────
  it('"(2x70lb+2kg) cada lado + barra 15kg" → 82.5', () => {
    // 2x70lb absoluto = 63.504 (NÃO ×2 do cada lado)
    // 2kg cada lado = 2×2 = 4
    // barra = 15
    // total = 63.504 + 4 + 15 = 82.504 → 82.5
    expect(calculateLoadFromBreakdown('(2x70lb+2kg) cada lado + barra 15kg')).toBe(82.5);
  });

  it('"(2x70lb+2kg) cada lado) + barra 15kg" (parêntese órfão) → 82.5', () => {
    // O ) extra é tolerado pela normalização.
    expect(calculateLoadFromBreakdown('(2x70lb+2kg) cada lado) + barra 15kg')).toBe(82.5);
  });

  // ── Halteres / kettlebells / variantes ────────────────────────────────
  it('"2 halteres 24kg" → 48', () => {
    expect(calculateLoadFromBreakdown('2 halteres 24kg')).toBe(48);
  });

  it('"dois halteres 24kg" → 48', () => {
    expect(calculateLoadFromBreakdown('dois halteres 24kg')).toBe(48);
  });

  it('"par de halteres 24kg" → 48', () => {
    expect(calculateLoadFromBreakdown('par de halteres 24kg')).toBe(48);
  });

  it('"2 kettlebells 32kg" → 64', () => {
    expect(calculateLoadFromBreakdown('2 kettlebells 32kg')).toBe(64);
  });

  it('"2 kettlebells 16kg" → 32', () => {
    expect(calculateLoadFromBreakdown('2 kettlebells 16kg')).toBe(32);
  });

  it('"2 kettlebells 24kg" → 48', () => {
    expect(calculateLoadFromBreakdown('2 kettlebells 24kg')).toBe(48);
  });

  it('"2 halteres 10kg" → 20', () => {
    expect(calculateLoadFromBreakdown('2 halteres 10kg')).toBe(20);
  });

  it('"2 halteres 15kg" → 30', () => {
    expect(calculateLoadFromBreakdown('2 halteres 15kg')).toBe(30);
  });

  it('"2 dumbbells 24kg" → 48 (sinônimo en)', () => {
    expect(calculateLoadFromBreakdown('2 dumbbells 24kg')).toBe(48);
  });

  it('"2 DB 24kg" → 48 (abreviação)', () => {
    expect(calculateLoadFromBreakdown('2 DB 24kg')).toBe(48);
  });

  // ── Sandbag / colete / medicine ball / cabo / máquina ─────────────────
  it('"sandbag 30kg" → 30', () => {
    expect(calculateLoadFromBreakdown('sandbag 30kg')).toBe(30);
  });

  it('"colete 10kg" → 10', () => {
    expect(calculateLoadFromBreakdown('colete 10kg')).toBe(10);
  });

  it('"medicine ball 8kg" → 8', () => {
    expect(calculateLoadFromBreakdown('medicine ball 8kg')).toBe(8);
  });

  it('"MB 8kg" → 8', () => {
    expect(calculateLoadFromBreakdown('MB 8kg')).toBe(8);
  });

  it('"saco 30kg" → 30 (sinônimo de sandbag)', () => {
    expect(calculateLoadFromBreakdown('saco 30kg')).toBe(30);
  });

  it('"máquina 40kg" → 40', () => {
    expect(calculateLoadFromBreakdown('máquina 40kg')).toBe(40);
  });

  it('"cabo 30kg" → 30', () => {
    expect(calculateLoadFromBreakdown('cabo 30kg')).toBe(30);
  });

  it('"polia 25kg" → 25', () => {
    expect(calculateLoadFromBreakdown('polia 25kg')).toBe(25);
  });

  // ── Landmine — modo contexto (exerciseName) e palavra-chave ───────────
  it('"landmine 35lb" (texto explícito) → 15.9', () => {
    // 35 lb = 15.876 → 15.9 (sem multiplicar por 2, sem barra)
    expect(calculateLoadFromBreakdown('landmine 35lb')).toBe(15.9);
  });

  it('"landmine 35lb + barra 20kg" → 35.9', () => {
    // 35lb = 15.876; barra = 20 → 35.876 → 35.9
    expect(calculateLoadFromBreakdown('landmine 35lb + barra 20kg')).toBe(35.9);
  });

  it('"landmine 35lb + barra de 20kg" → 35.9 ("de" tolerado)', () => {
    expect(calculateLoadFromBreakdown('landmine 35lb + barra de 20kg')).toBe(35.9);
  });

  it('contexto exerciseName=Landmine press: "35lb + barra 20kg" → 35.9', () => {
    expect(
      calculateLoadFromBreakdown('35lb + barra 20kg', null, {
        exerciseName: 'Landmine press',
      }),
    ).toBe(35.9);
  });

  it('contexto exerciseName=Landmine (curto): "35lb + barra de 20kg" → 35.9', () => {
    expect(
      calculateLoadFromBreakdown('35lb + barra de 20kg', null, {
        exerciseName: 'Landmine',
      }),
    ).toBe(35.9);
  });

  it('landmine + "cada lado" NÃO multiplica por 2 (modo landmine prevalece)', () => {
    // 35lb cada lado em modo landmine = 35lb solo + barra
    // 35lb = 15.876; barra 20 = 20 → 35.876 → 35.9
    expect(
      calculateLoadFromBreakdown('35lb cada lado + barra 20kg', null, {
        exerciseName: 'Landmine press',
      }),
    ).toBe(35.9);
  });

  // ── Barra bilateral — só ativa COM exerciseName explícito ─────────────
  it('contexto exerciseName=Supino com barra: "35lb + barra 20kg" → 51.8', () => {
    // Heurística: barra + 1 plate solo sem quantity → ×2
    // 35lb × 2 = 31.752; barra = 20 → 51.752 → 51.8
    expect(
      calculateLoadFromBreakdown('35lb + barra 20kg', null, {
        exerciseName: 'Supino com barra',
      }),
    ).toBe(51.8);
  });

  it('SEM exerciseName, "35lb + barra 20kg" NÃO infere bilateral → 35.9 (peso direto + barra)', () => {
    // Conservador: sem contexto, soma direta. NUNCA inferir × 2 silenciosamente.
    // 35lb = 15.876; barra 20 → 35.876 → 35.9
    expect(calculateLoadFromBreakdown('35lb + barra 20kg')).toBe(35.9);
  });

  it('bilateral com 2 plates avulsos NÃO multiplica (ambíguo demais)', () => {
    // "10kg + 5kg + barra 20kg" em Supino → soma direta (não tenta × 2)
    expect(
      calculateLoadFromBreakdown('10kg + 5kg + barra 20kg', null, {
        exerciseName: 'Supino com barra',
      }),
    ).toBe(35);
  });

  it('bilateral mas com "cada lado" explícito usa cada lado (não dobra de novo)', () => {
    // "10kg cada lado + barra 20kg" em Supino: cada lado já vale ×2.
    // 10kg × 2 + barra 20 = 40
    expect(
      calculateLoadFromBreakdown('10kg cada lado + barra 20kg', null, {
        exerciseName: 'Supino com barra',
      }),
    ).toBe(40);
  });

  it('unilateral hint inibe heurística bilateral mesmo em supino', () => {
    expect(
      calculateLoadFromBreakdown('35lb + barra 20kg', null, {
        exerciseName: 'Supino unilateral com barra',
      }),
    ).toBe(35.9);
  });

  // ── Barra sem unidade / "de" tolerado / ordem invertida ───────────────
  it('"barra 20" sem unidade → trata como kg', () => {
    expect(calculateLoadFromBreakdown('barra 20')).toBe(20);
  });

  it('"barra de 20kg" → 20 (tolera "de")', () => {
    expect(calculateLoadFromBreakdown('barra de 20kg')).toBe(20);
  });

  it('"barra de 20" sem unidade → 20', () => {
    expect(calculateLoadFromBreakdown('barra de 20')).toBe(20);
  });

  it('ordem invertida: "barra 20 + 35lb" → 35.9 (sem contexto bilateral)', () => {
    expect(calculateLoadFromBreakdown('barra 20 + 35lb')).toBe(35.9);
  });

  it('ordem invertida: "35lb barra 20" sem + → soma ambos', () => {
    expect(calculateLoadFromBreakdown('35lb barra 20')).toBe(35.9);
  });

  // ── Bar only ──────────────────────────────────────────────────────────
  it('"barra 20 kg" → 20', () => {
    expect(calculateLoadFromBreakdown('barra 20 kg')).toBe(20);
  });

  // ── Barra não é contada duas vezes com peso solto ─────────────────────
  it('"barra 20kg + 10kg" → 30 (NÃO 40 — sem contexto bilateral)', () => {
    expect(calculateLoadFromBreakdown('barra 20kg + 10kg')).toBe(30);
  });

  // ── Lados explícitos / assimetria ─────────────────────────────────────
  it('"lado direito 20kg + lado esquerdo 15kg + barra 10kg" → 45', () => {
    // Sem cada lado, sem multiplicar: soma direta.
    expect(
      calculateLoadFromBreakdown('lado direito 20kg + lado esquerdo 15kg + barra 10kg'),
    ).toBe(45);
  });

  // ── FINDING (não alterado neste PR): peso corporal preserva comportamento ──
  it('peso corporal + studentWeight retorna studentWeight (comportamento atual)', () => {
    expect(calculateLoadFromBreakdown('peso corporal', 80)).toBe(80);
  });
});
