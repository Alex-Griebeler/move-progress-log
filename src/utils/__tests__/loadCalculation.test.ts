import { describe, it, expect } from 'vitest';
import { calculateLoadFromBreakdown } from '../loadCalculation';

describe('calculateLoadFromBreakdown', () => {
  // Null / empty cases
  it('returns null for empty string', () => {
    expect(calculateLoadFromBreakdown('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(calculateLoadFromBreakdown('   ')).toBeNull();
  });

  it('returns null for undefined-like input', () => {
    expect(calculateLoadFromBreakdown(null as any)).toBeNull();
  });

  // Body weight
  it('returns explicit body weight value', () => {
    expect(calculateLoadFromBreakdown('Peso corporal = 75 kg')).toBe(75);
  });

  it('returns student weight for "peso corporal" without value', () => {
    expect(calculateLoadFromBreakdown('Peso corporal', 80)).toBe(80);
  });

  it('returns null for "peso corporal" without student weight', () => {
    expect(calculateLoadFromBreakdown('Peso corporal')).toBeNull();
  });

  // Elastic / bands
  it('returns null for elastic bands', () => {
    expect(calculateLoadFromBreakdown('elástico verde')).toBeNull();
  });

  it('returns null for bands', () => {
    expect(calculateLoadFromBreakdown('banda leve')).toBeNull();
  });

  // Simple weights
  it('parses simple kg value', () => {
    expect(calculateLoadFromBreakdown('20 kg')).toBe(20);
  });

  it('parses simple lb value', () => {
    const result = calculateLoadFromBreakdown('10 lb');
    expect(result).toBeCloseTo(4.5, 1);
  });

  // "De cada lado" pattern
  it('handles "(2kg + 5lb) de cada lado"', () => {
    const result = calculateLoadFromBreakdown('(2kg + 5lb) de cada lado');
    // 2*2 + 5*0.4536*2 = 4 + 4.536 = 8.536 → 8.5
    expect(result).toBeCloseTo(8.5, 0);
  });

  it('handles "10kg de cada lado"', () => {
    // Without parentheses: 10*2 = 20
    expect(calculateLoadFromBreakdown('10kg de cada lado')).toBe(20);
  });

  it('handles "barra 20kg + 10kg de cada lado"', () => {
    // barra=20 + 10*2=20 → 40
    expect(calculateLoadFromBreakdown('barra 20kg + 10kg de cada lado')).toBe(40);
  });

  it('handles "15lb + 2kg de cada lado + barra 10kg"', () => {
    // barra=10 + (15lb*2 + 2kg*2) = 10 + 13.6 + 4 = 27.6
    const result = calculateLoadFromBreakdown('15lb + 2kg de cada lado + barra 10kg');
    expect(result).toBeCloseTo(27.6, 0);
  });

  // Kettlebells / dumbbells
  it('handles "2 kettlebells 16kg"', () => {
    expect(calculateLoadFromBreakdown('2 kettlebells 16kg')).toBe(32);
  });

  it('handles "2 halteres 10kg"', () => {
    expect(calculateLoadFromBreakdown('2 halteres 10kg')).toBe(20);
  });

  // Bar only
  it('handles "barra 20 kg"', () => {
    expect(calculateLoadFromBreakdown('barra 20 kg')).toBe(20);
  });

  // Bar should NOT be double-counted (BUG-007)
  it('does not double-count bar weight with simple kg', () => {
    // "barra 20kg + 10kg" → 20 + 10 = 30 (NOT 40)
    expect(calculateLoadFromBreakdown('barra 20kg + 10kg')).toBe(30);
  });

  // Decimal values
  it('handles decimal values', () => {
    expect(calculateLoadFromBreakdown('12.5 kg')).toBe(12.5);
  });

  it('handles comma decimal values', () => {
    expect(calculateLoadFromBreakdown('12,5 kg')).toBe(12.5);
  });
});
