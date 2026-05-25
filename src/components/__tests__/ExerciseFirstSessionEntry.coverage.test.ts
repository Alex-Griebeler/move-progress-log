import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourcePath = resolve(__dirname, '../ExerciseFirstSessionEntry.tsx');
const source = readFileSync(sourcePath, 'utf-8');

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*\n/g, '');

const code = stripComments(source);

describe('ExerciseFirstSessionEntry — cockpit de carga por exercício', () => {
  it('mantém Carga parcial como origem do cálculo automático no blur', () => {
    expect(code).toContain('const handleLoadBlur = useCallback');
    expect(code).toContain('const expanded = expandLoadShorthand(entry.load_breakdown);');
    // Calculator agora recebe `exerciseName` como contexto pra ativar
    // heurísticas de landmine / barra bilateral. A chamada quebra em
    // múltiplas linhas; checamos os 3 argumentos.
    expect(code).toMatch(
      /const loadKg = calculateLoadFromBreakdown\(\s*expanded,\s*student\?\.weight_kg,\s*\{\s*\n?\s*exerciseName:\s*entry\.exercise_name\s*\?\?\s*null,?\s*\n?\s*\}\s*\);/,
    );
    expect(code).toMatch(/load_breakdown:\s*expanded,[\s\S]*load_kg:\s*loadKg,[\s\S]*load_kg_manual_override:\s*false/);
  });

  it('torna Total editável no modo por exercício sem remover o cálculo automático', () => {
    expect(code).toContain('const handleManualLoadKgChange = useCallback');
    // Apos a refatoracao de UX, o layout passou a ser card em todos os
    // viewports — nao ha mais <TableHead>. O contrato preservado e:
    // existe um label "Total" no card, com Input numerico editavel
    // ligado a handleManualLoadKgChange e flag de override.
    expect(code).toMatch(/<label[^>]*>\s*Total\s*<\/label>/);
    expect(code).toMatch(/type="number"[\s\S]*step="0\.1"[\s\S]*value=\{entry\.load_kg \?\? ""\}[\s\S]*handleManualLoadKgChange\(student\.id, exerciseIndex, e\.target\.value\)/);
    expect(code).toMatch(/load_kg_manual_override:\s*true/);
  });

  it('aceita decimal com vírgula no override manual de Total', () => {
    expect(code).toContain('const parseManualLoadKg = (value: string): number | null => {');
    expect(code).toContain('value.trim().replace(",", ".")');
  });

  it('mantém o override manual fora do payload salvo', () => {
    const submitBlock = code.match(/const handleSubmit = async \(\) => \{[\s\S]*?await onSave\(\{ studentExercises \}\);/);
    expect(submitBlock?.[0]).toBeTruthy();
    expect(submitBlock?.[0]).not.toContain('load_kg_manual_override');
  });

  it('mostra a última carga como bloco próprio dentro do card', () => {
    // Apos a refatoracao de UX, nao existe mais coluna de tabela — a
    // ultima carga aparece num bloco dedicado no card (rounded-lg
    // bg-muted) com botao "Repetir" que chama handleRepeatLastLoad.
    expect(code).toContain('last.load_breakdown ? compressLoadShorthand(last.load_breakdown) : "—"');
    expect(code).toMatch(/Última:\s*\{last\.load_breakdown/);
    expect(code).toMatch(/handleRepeatLastLoad\(student\.id\)/);
  });

  it('copiar carga anterior e aplicar para todos preserva a marcação de override sem persistir metadado novo', () => {
    expect(code).toMatch(/load_kg_manual_override:\s*false/);
    expect(code).toMatch(/load_kg_manual_override:\s*source\.load_kg_manual_override/);
    expect(code).not.toMatch(/\.from\("exercises"\)|\.from\('exercises'\)|supabase\.|functions\.invoke|\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  });
});
