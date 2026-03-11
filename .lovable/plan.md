

# Auditoria Completa: Sistema de Calculo de Carga

## Bugs Encontrados

### BUG-1: Race condition em ManualSessionEntry.calculateLoadFromDescription (CRITICO)
A funcao chama `updateExercise` duas vezes em sequencia (linhas 211-217): uma para `load_breakdown` (expanded) e outra para `load_kg`. A segunda chamada usa o estado anterior ao primeiro update, sobrescrevendo o `load_breakdown` expandido de volta ao valor antigo. Resultado: o shorthand nunca e salvo no formato expandido.

### BUG-2: ManualSessionEntry nao auto-calcula no blur (UX)
Diferente do `ExerciseFirstSessionEntry` (que calcula no `onBlur`), o ManualSessionEntry exige que o usuario clique no botao Calculator. Inconsistencia de UX entre os dois modos de registro.

### BUG-3: updateExercise auto-calc parcial e fragil (ManualSessionEntry linhas 175-183)
O `updateExercise` so tenta auto-calcular para "peso corporal" usando `value.toLowerCase().includes('corporal')`, que pode dar match em textos nao relacionados. Alem disso, nao chama `expandLoadShorthand` nem `calculateLoadFromBreakdown` — so seta o `weight_kg` do aluno diretamente.

### BUG-4: Sem testes para loadShorthand.ts
Nao existe nenhum arquivo de teste para `expandLoadShorthand` nem `compressLoadShorthand`. Qualquer regressao passa despercebida.

### BUG-5: hasShorthand detection fragil (loadShorthand.ts linha 34)
A regex `/\b(cl|kb|^\d+x\d)/i` mistura `\b` com `^` dentro de alternation — funciona por acaso mas e confusa e fragil. Nao detecta inputs como "20" (numero simples sem unidade) que poderiam ter `kg` inferido.

---

## Plano de Correcao

### 1. ManualSessionEntry — auto-calc no blur + fix race condition
- Remover o botao Calculator separado
- Adicionar `onBlur` no campo `load_breakdown` que: (a) expande shorthand, (b) calcula load_kg, (c) atualiza ambos numa unica chamada setState
- Remover a logica parcial de "peso corporal" do `updateExercise` (linhas 175-183) — o blur handler centralizado cobre todos os casos
- Manter campo `load_kg` editavel manualmente como fallback

### 2. ExerciseFirstSessionEntry — auditar handleLoadBlur
- Ja funciona corretamente no blur. Sem mudancas necessarias.

### 3. loadShorthand.ts — limpar hasShorthand regex
- Simplificar a regex de deteccao para ser mais explicita e legivel
- Sem mudanca de comportamento, apenas clareza

### 4. Testes para loadShorthand.ts
- Criar `src/utils/__tests__/loadShorthand.test.ts` cobrindo:
  - expand: PC, 2x24, KB32, 2xKB24, 10cl, 10cl b15, 35lb cl + 15kg b, b20, passthrough
  - compress: peso corporal, 2 kettlebells 16kg, barra 20kg, Xcl, passthrough
  - roundtrip: expand → compress e vice-versa

### Arquivos alterados:
- `src/components/ManualSessionEntry.tsx` — auto-calc no blur, remover Calculator button, fix race condition
- `src/utils/loadShorthand.ts` — limpar regex hasShorthand
- `src/utils/__tests__/loadShorthand.test.ts` — novo arquivo de testes

