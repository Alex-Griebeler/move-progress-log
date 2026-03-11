import { describe, it, expect } from 'vitest';
import { expandLoadShorthand, compressLoadShorthand } from '../loadShorthand';

describe('expandLoadShorthand', () => {
  it('returns empty for empty input', () => {
    expect(expandLoadShorthand('')).toBe('');
    expect(expandLoadShorthand('  ')).toBe('  ');
  });

  it('PC → peso corporal', () => {
    expect(expandLoadShorthand('PC')).toBe('peso corporal');
    expect(expandLoadShorthand('pc')).toBe('peso corporal');
  });

  it('2x24 → 2 halteres 24kg', () => {
    expect(expandLoadShorthand('2x24')).toBe('2 halteres 24kg');
  });

  it('KB32 → kettlebell 32kg', () => {
    expect(expandLoadShorthand('KB32')).toBe('kettlebell 32kg');
  });

  it('2xKB24 → 2 kettlebells 24kg', () => {
    expect(expandLoadShorthand('2xKB24')).toBe('2 kettlebells 24kg');
  });

  it('10cl → 10kg de cada lado', () => {
    expect(expandLoadShorthand('10cl')).toBe('10kg de cada lado');
  });

  it('b20 → barra 20kg', () => {
    expect(expandLoadShorthand('b20')).toBe('barra 20kg');
  });

  it('35lb cl + 15kg b → 35lb de cada lado + barra 15kg', () => {
    const result = expandLoadShorthand('35lb cl + 15kg b');
    expect(result).toBe('35lb de cada lado + barra 15kg');
  });

  it('10cl + b15 → 10kg de cada lado + barra 15kg', () => {
    const result = expandLoadShorthand('10cl + b15');
    expect(result).toBe('10kg de cada lado + barra 15kg');
  });

  it('passthrough for unrecognized input', () => {
    expect(expandLoadShorthand('20kg')).toBe('20kg');
    expect(expandLoadShorthand('barra 20kg')).toBe('barra 20kg');
    expect(expandLoadShorthand('peso corporal')).toBe('peso corporal');
  });
});

describe('compressLoadShorthand', () => {
  it('peso corporal → PC', () => {
    expect(compressLoadShorthand('peso corporal')).toBe('PC');
  });

  it('barra 20kg → b20', () => {
    expect(compressLoadShorthand('barra 20kg')).toBe('b20');
  });

  it('2 kettlebells 16kg → 2xKB16', () => {
    expect(compressLoadShorthand('2 kettlebells 16kg')).toBe('2xKB16');
  });

  it('kettlebell 32kg → KB32', () => {
    expect(compressLoadShorthand('kettlebell 32kg')).toBe('KB32');
  });

  it('2 halteres 24kg → 2x24', () => {
    expect(compressLoadShorthand('2 halteres 24kg')).toBe('2x24');
  });

  it('10kg de cada lado → 10cl', () => {
    expect(compressLoadShorthand('10kg de cada lado')).toBe('10cl');
  });

  it('passthrough for unrecognized', () => {
    expect(compressLoadShorthand('elástico verde')).toBe('elástico verde');
  });
});

describe('roundtrip expand → compress', () => {
  const cases = [
    ['2x24', '2 halteres 24kg'],
    ['KB32', 'kettlebell 32kg'],
    ['2xKB24', '2 kettlebells 24kg'],
    ['10cl', '10kg de cada lado'],
    ['b20', 'barra 20kg'],
    ['PC', 'peso corporal'],
  ];

  it.each(cases)('expand(%s) → %s → compress back', (shorthand, expanded) => {
    expect(expandLoadShorthand(shorthand)).toBe(expanded);
    expect(compressLoadShorthand(expanded)).toBe(shorthand);
  });
});
