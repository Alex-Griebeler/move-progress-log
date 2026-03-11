

# Analise de Impacto: Filtragem Hierarquica de Nivel (Boyle 1-5)

## Problema Atual

A funcao `filterByLevel` na edge function `generate-group-session` usa mapeamento **da escala antiga 1-9**:

```text
iniciante    → numeric_level <= 3
intermediario → numeric_level <= 6
avancado     → numeric_level <= 9
```

Mas o banco agora usa **escala Boyle 1-5**. Resultado: **todos os exercicios passam no filtro** para qualquer nivel, tornando a filtragem inutil. Um aluno iniciante pode receber exercicios de nivel 5.

---

## Mapeamento Correto (Boyle 1-5, hierarquico)

```text
iniciante     → boyle_score <= 2  (niveis 1-2)
intermediario → boyle_score <= 3  (niveis 1-3)
avancado      → boyle_score <= 5  (niveis 1-5, tudo)
```

Hierarquico: avancado ve tudo, intermediario ve ate 3, iniciante ve ate 2. "Todos os niveis" (level text) continua passando sempre.

---

## Pontos de Impacto Mapeados

### 1. Edge Function `generate-group-session/index.ts` (CRITICO)
- **Linha 367-383**: `filterByLevel()` — mapeamento errado da escala
- **Linha 260-279**: `applyF4TeachableProgression()` — usa `numeric_level` para encontrar regressoes. Funciona corretamente ja que compara `<` relativo, nao absoluto
- **Linha 730-735**: Filtro de pliometria usa `numeric_level` com `maxPlyoLevel`. Precisa revisar se os limites sao Boyle ou antigos

### 2. Edge Function `suggest-exercise-alternatives/index.ts`
- Linha 34: Recebe `numeric_level` no schema. Passa para o LLM como contexto. Sem filtragem direta — impacto baixo

### 3. Edge Function `suggest-regressions/index.ts`
- Nao usa `numeric_level` para filtragem, so texto para o LLM. Sem impacto

### 4. Frontend `EditExerciseLibraryDialog.tsx` e `AddExerciseDialog.tsx`
- Salvam `numeric_level` e `boyle_score` com o mesmo valor (correto na escala 1-5). Sem mudanca necessaria

### 5. Frontend `ExercisesLibraryPage.tsx`
- Exibe `boyle_score` como badge. Sem filtragem por nivel na listagem. Sem impacto

### 6. Frontend `ExerciseReviewPage.tsx`
- Usa `LEVEL_OPTIONS` para editar o campo `level` (texto). Sem impacto direto

### 7. Constante `BOYLE_SCORE_SCALE` em `backToBasics.ts`
- Ja esta correto (1-5). Nenhuma mudanca

### 8. Edge Function `import-exercises/index.ts`
- Linha 665: Converte nivel importado para `boyle_score` com mapeamento proprio. Usa escala diferente internamente. Sem impacto nesta mudanca

---

## Plano de Correcao

### Arquivo 1: `supabase/functions/generate-group-session/index.ts`

**Correcao A — `filterByLevel` (linhas 367-383)**
Substituir o mapeamento antigo:
```typescript
function filterByLevel(exercises: Exercise[], groupLevel: string): Exercise[] {
  return exercises.filter((ex) => {
    // Boyle score (1-5): hierarchical filtering
    if (ex.numeric_level != null) {
      const maxBoyle = groupLevel === "iniciante" ? 2 
                     : groupLevel === "intermediario" ? 3 
                     : 5;
      return ex.numeric_level <= maxBoyle;
    }
    // Fallback: text level field
    if (!ex.level) return true;
    const levelOrder: Record<string, number> = { 
      iniciante: 1, intermediario: 2, avancado: 3 
    };
    const groupLevelValue = levelOrder[groupLevel] || 2;
    const levelMap: Record<string, number> = {
      Iniciante: 1, "Iniciante/Intermediário": 1.5, 
      Intermediário: 2, "Intermediário/Avançado": 2.5, 
      Avançado: 3, "Todos os níveis": 0,
    };
    const exLevelValue = levelMap[ex.level] || 2;
    return exLevelValue === 0 || exLevelValue <= groupLevelValue;
  });
}
```

**Correcao B — Filtro de pliometria (~linha 732)**
Verificar se `maxPlyoLevel` usa escala Boyle. Ajustar se necessario para consistencia.

### Arquivos nao alterados
- `suggest-regressions`, `suggest-exercise-alternatives`: sem filtragem por nivel
- Frontend: ja usa Boyle 1-5 corretamente
- `backToBasics.ts`: constantes ja corretas

### Escopo total: 1 arquivo, 1 funcao principal + 1 verificacao secundaria

