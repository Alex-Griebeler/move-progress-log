

# Historico de Cargas por Aluno no Card da Prescricao

## Objetivo

Permitir que o treinador, ao visualizar a prescricao (PrescriptionCard e Modo TV), clique na celula de intensidade (Carga/PSE) de qualquer exercicio e veja um popover com as **ultimas cargas registradas por cada aluno atribuido** a aquela prescricao, incluindo a data em que foram executadas.

---

## Como vai funcionar

1. O treinador ve a tabela de exercicios da prescricao (PrescriptionCard ou Modo TV)
2. Na coluna "Carga" ou "PSE", cada celula se torna **clicavel** (cursor pointer, com indicador visual sutil como um icone de historico)
3. Ao clicar, abre um **Popover** mostrando:

```text
+----------------------------------------------+
|  Agachamento frontal BB                      |
|  Historico de cargas                         |
+----------------------------------------------+
|  Alex Martins        50 kg    ha 3 dias      |
|  Marina Costa        45 kg    ha 7 dias      |
|  Pedro Silva         —        sem registro   |
+----------------------------------------------+
```

- Nome do aluno
- Ultima carga registrada (load_kg) e descricao (load_description)
- Tempo relativo desde a ultima execucao ("ha 3 dias", "ha 2 semanas")
- Se o aluno nunca executou o exercicio, mostra "sem registro"

---

## Detalhes Tecnicos

### 1. Novo hook: `src/hooks/useExerciseLoadHistory.ts`

- Recebe: `exerciseName: string`, `studentIds: string[]`
- Para cada aluno, busca na tabela `exercises` (JOIN com `workout_sessions`) o registro mais recente daquele exercicio
- Query: busca em `exercises` onde `exercise_name` corresponde ao nome do exercicio da prescricao, filtrando por `session_id` em sessoes dos alunos informados
- Retorna array de `{ studentId, studentName, lastLoadKg, lastLoadDescription, lastDate }`
- Usa `useQuery` com queryKey baseada no exercicio + lista de alunos
- Query so e executada quando o popover e aberto (enabled controlado por state)

### 2. Novo componente: `src/components/ExerciseLoadHistoryPopover.tsx`

- Componente que encapsula o Popover do Radix
- Props: `exerciseName`, `prescriptionId`, `children` (trigger), `currentValue` (o valor de PSE/Carga exibido)
- Internamente usa `usePrescriptionAssignments` para obter a lista de alunos atribuidos
- Usa o hook `useExerciseLoadHistory` para buscar os dados
- Exibe loading skeleton enquanto carrega
- Exibe lista de alunos com cargas formatadas
- Usa `formatDistanceToNow` do date-fns para mostrar tempo relativo ("ha 3 dias")

### 3. Modificar: `src/components/PrescriptionCard.tsx`

- Envolver a celula de intensidade (linhas 291-297) com o `ExerciseLoadHistoryPopover`
- O valor atual continua exibido normalmente; o popover abre ao clicar
- Passar `prescription.id` e `exercise.exercise_name` como props

### 4. Modificar: `src/components/PrescriptionTVMode.tsx`

- Mesmo tratamento na celula de intensidade (linhas 143-148)
- Popover adaptado ao tema escuro do Modo TV

### 5. Buscar alunos atribuidos

- Ja existe `usePrescriptionAssignments` que retorna os alunos vinculados a prescricao
- Usar essa lista para saber quais alunos consultar no historico

### Logica da query no hook

```sql
-- Para cada aluno, buscar o exercicio mais recente
SELECT DISTINCT ON (ws.student_id)
  ws.student_id,
  e.load_kg,
  e.load_description,
  ws.date
FROM exercises e
JOIN workout_sessions ws ON ws.id = e.session_id
WHERE ws.student_id = ANY($studentIds)
  AND e.exercise_name ILIKE $exerciseName
ORDER BY ws.student_id, ws.date DESC, ws."time" DESC
```

Esta query sera feita via cliente Supabase (nao SQL direto), usando encadeamento de queries.

---

## Experiencia do usuario

- **Indicador visual**: A celula de intensidade tera um pequeno icone de historico (History) que aparece ao passar o mouse, sinalizando que e clicavel
- **Carregamento lazy**: A query so executa quando o popover abre, evitando requests desnecessarios
- **Tempo relativo**: Datas exibidas como "ha 3 dias", "ha 2 semanas", "ha 1 mes" para decisao rapida
- **Alerta visual**: Se a ultima execucao foi ha mais de 30 dias, o texto aparece em cor de alerta (amarelo/laranja) para indicar que a referencia pode estar desatualizada
- **Sem registro**: Alunos sem historico aparecem com tracejado, sem confundir com carga zero

## Arquivos impactados

```text
Arquivo                                          Acao
──────────────────────────────────────────────────────────────
src/hooks/useExerciseLoadHistory.ts               Criar (novo hook)
src/components/ExerciseLoadHistoryPopover.tsx      Criar (novo componente)
src/components/PrescriptionCard.tsx                Modificar (envolver celula com popover)
src/components/PrescriptionTVMode.tsx              Modificar (envolver celula com popover)
```

Nenhuma alteracao de banco de dados necessaria -- os dados ja existem nas tabelas `exercises` e `workout_sessions`.
