

# Plano: Refatorar Dialogs de Registro de Sessão

## Objetivo

Extrair lógica e UI duplicados entre `RecordGroupSessionDialog` (1933 linhas) e `RecordIndividualSessionDialog` (1200 linhas) em hooks e componentes reutilizáveis, reduzindo cada dialog para ~300-500 linhas.

## Lógica Duplicada Identificada

| Funcionalidade | Group (linhas) | Individual (linhas) |
|---|---|---|
| Merge de gravações (dedup exercícios + observações) | 296-391 | 205-262 |
| Validação de exercícios (reps, carga, nome) | 393-487, 534-550 | 493-534 |
| Edição de exercícios (formulário inline) | 1674-1834 | 886-1044 |
| Edição de observações clínicas | 1604-1672 | 796-861 |
| Seleção/substituição de exercício | 748-768 | 536-556 |
| handleAddAnotherRecording | 719-729 | 472-482 |
| handleError | 585-591 | 330-336 |
| areSimilarObservations | 296-307 | 205-216 |
| getSeverityVariant | 309-316 | 700-707 (inline) |
| Preview de exercícios (cards com sets/reps/carga) | 1500-1598 | 728-772 |

## Estrutura Proposta

```text
src/
├── hooks/
│   ├── useSessionRecording.ts     ← merge, acumulação, MAX_RECORDINGS
│   ├── useSessionValidation.ts    ← validação de exercícios e observações
│   └── useExerciseReplacement.ts  ← seleção/substituição de exercício
├── components/
│   ├── session/
│   │   ├── ExerciseEditor.tsx      ← formulário de edição inline de exercícios
│   │   ├── ObservationEditor.tsx   ← formulário de edição de observações
│   │   ├── ExercisePreviewCard.tsx ← card de preview de exercício
│   │   ├── ObservationPreview.tsx  ← preview de observações
│   │   ├── ValidationAlerts.tsx    ← erros e warnings
│   │   ├── RecordingHeader.tsx     ← badge de alunos + contador de gravações
│   │   └── PrescriptionSidebar.tsx ← coluna lateral com exercícios prescritos
│   ├── RecordGroupSessionDialog.tsx    ← orquestrador (reduzido)
│   └── RecordIndividualSessionDialog.tsx ← orquestrador (reduzido)
```

## Detalhamento das Extrações

### 1. Hook `useSessionRecording`
Consolida:
- `accumulatedRecordings`, `currentRecordingNumber` state
- `mergeAllRecordings()` (parametrizado para 1 ou N alunos)
- `areSimilarObservations()`
- `handleAddAnotherRecording()`
- `handleError()`
- Constante `MAX_RECORDINGS`

### 2. Hook `useSessionValidation`
Consolida:
- `validateMergedData()` (grupo)
- `validateExercisesBeforeSave()` (individual)
- `validateExerciseData()` 
- `validationIssues` state

### 3. Hook `useExerciseReplacement`
Consolida:
- `exerciseSelectionOpen`, `selectedExerciseForReplacement` state
- `openExerciseSelection()`
- `handleExerciseSelected()`

### 4. Componente `ExerciseEditor`
UI compartilhada para edição inline de exercícios (nome + substituição, séries, reps, carga, breakdown com cálculo, observações, best set, botão deletar). Usado nos estados `edit` de ambos os dialogs.

### 5. Componente `ObservationEditor`
UI compartilhada para edição de observações clínicas (texto, severidade, categorias, botão deletar, botão adicionar).

### 6. Componente `ExercisePreviewCard`
UI compartilhada para renderizar exercício no estado `preview` (badge "Preencher Manualmente", sets/reps/carga, observações).

### 7. Componente `ValidationAlerts`
UI compartilhada para erros e warnings, incluindo botão "Adicionar Exercícios Não Mencionados".

### 8. Componente `PrescriptionSidebar`
A coluna lateral com exercícios prescritos (atualmente inline no grupo, linhas 1189-1232).

## Ordem de Implementação

1. Criar os 3 hooks (`useSessionRecording`, `useSessionValidation`, `useExerciseReplacement`)
2. Criar os componentes de UI (`ExerciseEditor`, `ObservationEditor`, `ExercisePreviewCard`, `ValidationAlerts`, `PrescriptionSidebar`)
3. Refatorar `RecordGroupSessionDialog` para usar hooks e componentes extraídos
4. Refatorar `RecordIndividualSessionDialog` para usar hooks e componentes extraídos
5. Verificar que o comportamento permanece idêntico

## O que NÃO muda

- Nenhuma funcionalidade é alterada
- Fluxo de estados (setup → recording → preview → edit → save) permanece igual
- Lógica de salvamento (diferente entre grupo e individual) permanece nos respectivos dialogs
- `SessionSetupForm`, `SessionContextForm`, `ManualSessionEntry`, `MultiSegmentRecorder` não são alterados
- Nenhuma migração de banco necessária

## Riscos

- **Risco baixo**: refatoração puramente estrutural, sem mudança de lógica
- **Atenção**: tipos de observação diferem entre grupo (`categories: string[]`) e individual (`category: string`) — os hooks precisam ser genéricos o suficiente para ambos

