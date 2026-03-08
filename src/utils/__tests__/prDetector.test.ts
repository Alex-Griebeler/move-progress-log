import { describe, it, expect } from 'vitest';
import { isPR, buildRecordKey, exerciseChecks } from '../prDetectorLogic';

describe('buildRecordKey', () => {
  it('combines exercise name and record type', () => {
    expect(buildRecordKey('Agachamento', 'max_load')).toBe('Agachamento:max_load');
  });

  it('handles names with spaces', () => {
    expect(buildRecordKey('Supino Reto', 'max_volume')).toBe('Supino Reto:max_volume');
  });
});

describe('isPR', () => {
  it('detects PR when current value exceeds previous record', () => {
    const map = new Map([['Agachamento:max_load', 100]]);
    expect(isPR(105, map, 'Agachamento:max_load')).toBe(true);
  });

  it('does not detect PR when current equals previous record', () => {
    const map = new Map([['Agachamento:max_load', 100]]);
    expect(isPR(100, map, 'Agachamento:max_load')).toBe(false);
  });

  it('does not detect PR when current is below previous record', () => {
    const map = new Map([['Agachamento:max_load', 100]]);
    expect(isPR(95, map, 'Agachamento:max_load')).toBe(false);
  });

  it('detects PR when no previous record exists (first occurrence)', () => {
    const map = new Map<string, number>();
    expect(isPR(80, map, 'Levantamento Terra:max_load')).toBe(true);
  });

  it('does not count zero as a PR', () => {
    const map = new Map<string, number>();
    expect(isPR(0, map, 'Agachamento:max_load')).toBe(false);
  });

  it('does not count negative values as PRs', () => {
    const map = new Map<string, number>();
    expect(isPR(-5, map, 'Agachamento:max_load')).toBe(false);
  });

  it('tracks max_load and max_volume independently', () => {
    const map = new Map([
      ['Rosca Direta:max_load', 20],
      ['Rosca Direta:max_volume', 400],
    ]);
    // load PR but not volume PR
    expect(isPR(25, map, 'Rosca Direta:max_load')).toBe(true);
    expect(isPR(350, map, 'Rosca Direta:max_volume')).toBe(false);
  });
});

describe('exerciseChecks', () => {
  it('returns max_load equal to load_kg', () => {
    const checks = exerciseChecks(80, 5);
    const loadCheck = checks.find(([type]) => type === 'max_load');
    expect(loadCheck?.[1]).toBe(80);
  });

  it('returns max_volume as load × reps', () => {
    const checks = exerciseChecks(80, 5);
    const volCheck = checks.find(([type]) => type === 'max_volume');
    expect(volCheck?.[1]).toBe(400);
  });

  it('always returns exactly two checks', () => {
    expect(exerciseChecks(100, 3)).toHaveLength(2);
  });
});
