

# Melhoria na busca de exercícios no ExerciseCombobox

## Problema

O `ExerciseCombobox` usa o filtro padrão do `cmdk` que faz match por score interno. Esse filtro nao lida bem com nomes compostos parciais (ex: buscar "agach uni" nao encontra "Agachamento Unilateral") e nao aplica a mesma logica tokenizada que ja implementamos para alunos.

## Solucao

Adicionar um `filter` customizado no componente `Command` do `ExerciseCombobox.tsx` usando logica tokenizada:

```ts
<Command filter={(value, search) => {
  const searchTokens = search.toLowerCase().split(/\s+/).filter(Boolean);
  const nameTokens = value.toLowerCase().split(/\s+/);
  return searchTokens.every(st => nameTokens.some(nt => nt.startsWith(st))) ? 1 : 0;
}}>
```

Cada palavra digitada precisa ser prefixo de alguma palavra do nome do exercicio. Exemplos:
- "agach uni" → encontra "Agachamento Unilateral"
- "sup rom" → encontra "Supino Romeno"
- "dead" → encontra "Dead Bug DD"

## Alteracao

### `src/components/ExerciseCombobox.tsx`
- Adicionar prop `filter` customizada ao `<Command>` com logica tokenizada por `startsWith`
- Nenhuma outra mudanca necessaria — o componente ja e usado em `SortableExerciseItem` e `ImportPrescriptionFromWordDialog`

