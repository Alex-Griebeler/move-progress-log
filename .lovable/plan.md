# Corrigir Popover de Historico de Cargas: Usar Alunos Atribuidos

## Problema atual

O hook `useExerciseLoadHistory` busca alunos a partir de `workout_sessions` filtrados por `prescription_id`. Isso so mostra alunos que **ja registraram sessoes** nessa prescricao. O correto e mostrar os alunos **atribuidos** a prescricao (tabela `prescription_assignments`), e entao buscar o historico completo de cada um deles em **todas** as sessoes do banco.

## Solucao

### Modificar `src/hooks/useExerciseLoadHistory.ts`

Trocar a logica de busca de alunos:

**Antes:** Buscar `student_id` de `workout_sessions` WHERE `prescription_id = X`
**Depois:** Buscar `student_id` + `student_name` de `prescription_assignments` JOIN `students` WHERE `prescription_id = X`

Manter a busca de historico em **todas** as sessoes de cada aluno (nao filtrar por prescricao), para encontrar a carga mais recente daquele exercicio independente de qual prescricao foi usada.

Fluxo corrigido:

1. Buscar alunos atribuidos via `prescription_assignments` + join com `students` para obter nomes
2. Buscar todas as `workout_sessions` desses alunos (sem filtro de prescricao)
3. Buscar `exercises` que correspondam ao nome do exercicio nessas sessoes
4. Para cada aluno, retornar a carga, data e observações técnicas e alertas mais recentes. por exemplo: dor lombar

### Modificar `src/components/ExerciseLoadHistoryPopover.tsx`

Ajustar a mensagem de estado vazio de "Nenhuma sessao registrada" para "Nenhum aluno atribuido" (ja que agora os alunos vem das atribuicoes).

## Detalhes tecnicos

A mudanca e pontual: apenas as primeiras queries do hook mudam (de `workout_sessions` para `prescription_assignments`). O restante da logica (buscar sessoes, buscar exercicios, consolidar por aluno) permanece identico.

Nao ha necessidade de alterar banco de dados -- a tabela `prescription_assignments` ja existe com os dados necessarios.

## Arquivos impactados


| Arquivo                                         | Acao                               |
| ----------------------------------------------- | ---------------------------------- |
| `src/hooks/useExerciseLoadHistory.ts`           | Modificar (trocar fonte de alunos) |
| `src/components/ExerciseLoadHistoryPopover.tsx` | Ajuste menor na mensagem vazia     |
