

# Plano: Repetir carga anterior com formato abreviado e observações

## Problema atual
1. `handleRepeatLastLoad` preenche o `load_breakdown` no formato canônico expandido (ex: "2 kettlebells 16kg") — ocupa espaço e não é prático
2. Observações da última sessão do aluno para aquele exercício não são trazidas
3. O hook `useExerciseLastSession` não busca o campo `observations` da tabela `exercises`

## Alterações

### 1. Novo: função `compressLoadShorthand` em `src/utils/loadShorthand.ts`
Função inversa do `expandLoadShorthand` — converte formato canônico para abreviado:

| Canônico | Abreviado |
|----------|-----------|
| `2 kettlebells 16kg` | `2xKB16` |
| `kettlebell 32kg` | `KB32` |
| `2 halteres 24kg` | `2x24` |
| `10kg de cada lado + barra 15kg` | `10cl b15` |
| `peso corporal` | `PC` |
| `barra 20kg` | `b20` |

Se não reconhecer o padrão, retorna o original (passthrough seguro).

### 2. Editado: `src/hooks/useExerciseLastSession.ts`
- Adicionar `observations` ao tipo `LastSessionData`
- Incluir `observations` no `.select()` da query de exercises

### 3. Editado: `src/components/ExerciseFirstSessionEntry.tsx`
- Em `handleRepeatLastLoad`: aplicar `compressLoadShorthand()` ao `load_breakdown` antes de preencher, e também preencher `observations` do último registro
- Na linha de histórico do aluno: exibir observação anterior (se existir) em texto discreto, ex: "*dor lombar*"

## O que NÃO muda
- `calculateLoadFromBreakdown` — intocado
- `expandLoadShorthand` — continua fazendo a expansão no `onBlur`
- Fluxo: ao sair do campo, o shorthand é expandido e recalculado normalmente

