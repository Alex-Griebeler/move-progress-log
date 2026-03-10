

# Plano: Registro Manual "Exercise-First" para Small Group

## Resumo

Criar um novo componente `ExerciseFirstSessionEntry` que inverte a lógica atual (Aluno→Exercícios) para (Exercício→Alunos), com tabela inline, navegação por teclado, histórico de carga e atalhos de digitação. O componente atual `ManualSessionEntry` permanece como opção alternativa.

## Arquivos

### 1. Novo: `src/utils/loadShorthand.ts` (~60 linhas)

Parser de atalhos que traduz entradas rápidas para o formato canônico já suportado por `calculateLoadFromBreakdown`:

| Atalho | Traduz para |
|--------|------------|
| `2x24` | `2 halteres 24kg` |
| `KB 32` | `kettlebell 32kg` |
| `2xKB24` | `2 kettlebells 24kg` |
| `10cl b15` | `10kg de cada lado + barra 15kg` |
| `25lb+2cl b15` | `(25lb + 2kg) de cada lado + barra 15kg` |
| `PC` | `peso corporal` |
| `b20` | `barra 20kg` |

A função `expandLoadShorthand(input: string): string` retorna o formato expandido. Se o input não corresponder a nenhum atalho, retorna o valor original (passthrough para `calculateLoadFromBreakdown`).

### 2. Novo: `src/hooks/useExerciseLastSession.ts` (~50 linhas)

Hook que busca a última carga de cada aluno para todos os exercícios da prescrição de uma vez (batch), evitando N queries separadas do `useExerciseLoadHistory`. Retorna `Map<studentId_exerciseName, { load_kg, load_breakdown, reps, date }>`.

### 3. Novo: `src/components/ExerciseFirstSessionEntry.tsx` (~500 linhas)

Componente principal. Estrutura:

```text
┌──────────────────────────────────────────────────────┐
│  ◄ Exercício 3/12 ►   Agachamento Búlgaro           │
│  Prescrito: 4x8 · PSE 7 · Método: Simples           │
├──────┬───────────┬──────────┬───────┬──────┬─────────┤
│Aluno │ Exercício │Carga parc│ Total │ Reps │ Obs     │
├──────┼───────────┼──────────┼───────┼──────┼─────────┤
│Alex  │Búlgaro[⇄]│ 2x24     │ 48.0  │  8   │         │
│      │ últ: 44kg x8 há 3d                            │
│Marco │Búlgaro[⇄]│          │       │      │         │
│      │ últ: 40kg x8 há 3d                            │
│Jana  │Afundo  [⇄]│ 16      │ 16.0  │ 10   │ dor L   │
├──────┴───────────┴──────────┴───────┴──────┴─────────┤
│ [Aplicar carga p/ todos]              [Salvar Exer.] │
└──────────────────────────────────────────────────────┘
```

**Estado interno:**
- `exerciseIndex` — exercício atual na navegação
- `data: Record<studentId, Record<exerciseIndex, { exercise_name, load_breakdown, load_kg, reps, sets, observations }>>` — dados por aluno por exercício
- Cada aluno pode ter um `exercise_name` diferente (substituição individual)

**Funcionalidades:**
- **Navegação por exercício**: ◄/► avança entre exercícios da prescrição
- **Tabela inline**: Todos os alunos em linhas, campos editáveis inline
- **Keyboard flow**: Enter no input de carga → foco em reps → Enter → próximo aluno carga. Implementado via `onKeyDown` com `refs` array
- **Carga parcial → total**: No `onBlur` do campo de carga, expande via `expandLoadShorthand` → calcula via `calculateLoadFromBreakdown` → preenche `load_kg` automaticamente
- **Substituição individual**: Botão [⇄] na coluna exercício abre `ExerciseSelectionDialog` para aquele aluno/exercício específico
- **Histórico**: Linha discreta abaixo de cada aluno mostrando última carga/reps/data via `useExerciseLastSession`
- **"Aplicar para todos"**: Copia `load_breakdown` e `load_kg` da primeira linha preenchida para todas as outras linhas vazias
- **Warning de desvio**: Se carga atual diverge >30% do histórico, borda amarela no campo
- **Validação**: Mesmas regras do `ManualSessionEntry` (nome, sets>0, reps>0, load_breakdown)

**Saída (onSave):** Converte o estado interno para o mesmo formato `studentExercises[]` que o `ManualSessionEntry.onSave` espera. Zero mudança no backend.

### 4. Editado: `src/components/RecordGroupSessionDialog.tsx`

No estado `manual-entry`, adicionar toggle antes do componente:

```tsx
<div className="flex gap-2 mb-4">
  <Button variant={entryMode === 'by-exercise' ? 'default' : 'outline'} 
          onClick={() => setEntryMode('by-exercise')}>
    Por Exercício
  </Button>
  <Button variant={entryMode === 'by-student' ? 'default' : 'outline'}
          onClick={() => setEntryMode('by-student')}>
    Por Aluno
  </Button>
</div>
```

- `entryMode === 'by-exercise'` → renderiza `ExerciseFirstSessionEntry`
- `entryMode === 'by-student'` → renderiza `ManualSessionEntry` (atual)
- Default: `'by-exercise'`

Ambos recebem as mesmas props e chamam o mesmo `onSave`.

### O que NÃO muda

- `loadCalculation.ts` — nenhuma alteração na lógica de cálculo
- `ManualSessionEntry.tsx` — mantido intacto como opção alternativa
- Schema do banco — mesmas tabelas `workout_sessions` + `exercises`
- Lógica de salvamento no `RecordGroupSessionDialog`
- Edge Function `process-voice-session`

