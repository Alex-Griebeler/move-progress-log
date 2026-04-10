# Auditoria Fase 1 — Execução (2026-04-09)

## Escopo
Objetivo: melhorar segurança, confiabilidade e qualidade sem regressão funcional.

## Status Geral
- `lint`: PASS
- `test` (local, sem rede): PASS (`72 passed`, `9 skipped` de integração externa)
- `build`: PASS

## Entregas Concluídas

### 1) Segurança/RLS (alto impacto)
- Migration adicionada:
  - `supabase/migrations/20260409173000_rls_gap_hardening.sql`
- Cobertura adicionada para tabelas de assessment e catálogos sensíveis:
  - `assessments`
  - `professional_students`
  - `assessment_protocols`
  - `anamnesis_responses`
  - `functional_findings`
  - `global_test_results`
  - `segmental_test_results`
  - `assessment_progress_logs`
  - `assessment_exercises`
  - `breathing_protocols`
  - `equipment_inventory`
  - `session_templates`

### 2) Relatórios (regras de negócio)
- `supabase/functions/generate-student-report/index.ts`
  - Rejeita exercícios fora de força/hipertrofia.
  - Rejeita exercícios selecionados que não foram executados no período.
  - Mensagens de erro mais específicas.
- `src/hooks/useStudentReports.ts`
  - Parse robusto de erro HTTP da edge function para mostrar feedback útil no front.
- `src/components/GenerateReportDialog.tsx`
  - Bloqueio de envio enquanto carrega exercícios do período.
  - Estado vazio explícito para ausência de exercícios elegíveis.
  - Validação adicional de período inválido.

### 3) Importação XLSX (confiabilidade)
- `src/components/ImportSessionsDialog.tsx`
  - Não reporta sucesso quando `processed = 0`.
  - Remove fallback perigoso de data inválida para “hoje”.
  - Linhas com data inválida são ignoradas com feedback no erro final.

### 4) Refactor e testes (limpeza sem regressão)
- Util extraído:
  - `src/utils/importSessionsParsing.ts`
- Reuso no admin:
  - `src/pages/AdminDiagnosticsPage.tsx`
- Testes adicionados:
  - `src/utils/__tests__/importSessionsParsing.test.ts`

### 5) Performance de consulta (DB)
- Migration adicionada:
  - `supabase/migrations/20260409181500_query_performance_indexes.sql`
- Índices para consultas frequentes:
  - `exercises(session_id, created_at)`
  - `exercises(session_id, exercise_name)`
  - `student_reports(student_id, period_end desc)`
  - `student_reports(student_id, trainer_id, status, period_start, period_end)`
  - `report_tracked_exercises(report_id, load_variation_percentage desc)`

### 6) CI operacional (menos bloqueio por segredo ausente)
- `.github/workflows/staging-edge-gate.yml`
  - Smoke pode marcar `SKIP` com relatório quando `SUPABASE_URL` estiver ausente.
- `scripts/ci-smoke-edge-auth.sh`
  - `SUPABASE_ANON_KEY` ausente não quebra tudo: cenários anon viram `SKIP`.
  - `service_role` ausente com teste opcional ligado vira `SKIP` (não `FAIL` global).

### 7) Higiene de query (round 2, sem regressão funcional)
- Wildcards removidos de hooks e fluxos críticos de sessão/relatórios:
  - `src/hooks/useStudentReports.ts`
  - `src/hooks/useSessionDetail.ts`
  - `src/components/RecordIndividualSessionDialog.tsx`
  - `src/hooks/useStudents.ts`
  - `src/hooks/useExercisesLibrary.ts`
  - `src/hooks/usePrescriptions.ts`
- Resultado:
  - Menor acoplamento com schema.
  - Menor transferência de payload.
  - Base mais previsível para refactor incremental.

### 8) Higiene de query (round 3, fechamento do ciclo `select("*")`)
- Wildcards removidos dos últimos pontos em frontend e edge functions:
  - `src/hooks/*` (oura, protocolos, observações, histórico)
  - `src/features/ai-builder/useAIBuilderChat.ts`
  - `src/pages/AdminUsersPage.tsx`
  - `src/components/StudentObservationsCard.tsx`
  - `supabase/functions/check-rate-limit/index.ts`
  - `supabase/functions/generate-protocol-recommendations/index.ts`
  - `supabase/functions/ai-coach/index.ts`
- Verificação final:
  - `rg "select(\"*\")|select('*')" src supabase/functions` → **0 ocorrências**

### 9) Baseline dos módulos críticos (próximo foco)
- Tamanho atual dos módulos com maior risco de regressão:
  - `src/components/RecordGroupSessionDialog.tsx` → **911 linhas**
  - `supabase/functions/generate-group-session/index.ts` → **1489 linhas**
  - `supabase/functions/process-voice-session/index.ts` → **775 linhas**
  - `src/components/RecordIndividualSessionDialog.tsx` → **579 linhas**
- Sinais de acoplamento:
  - `RecordGroupSessionDialog`: 17 `useState`, 15 handlers, 8 hooks reativos.
  - Fluxos misturam UI + validação + persistência no mesmo arquivo.
- Critério de saída para esta etapa:
  - separar estado/efeitos/IO em módulos menores sem alterar payload/contrato.

### 10) Refactor seguro do fluxo de sessão em grupo (primeira fatia)
- Nova extração de regras puras para utilitário dedicado:
  - `src/components/session/groupSessionDataUtils.ts`
- `RecordGroupSessionDialog` agora delega para funções puras:
  - merge de gravações (`mergeAllRecordings`)
  - validação de dados mesclados (`validateMergedData`)
  - inclusão de prescritos não mencionados (`addUnmentionedPrescribedExercises`)
  - mapeamento de segmentos de áudio (`mapAudioSegmentsToSessionData`)
- Resultado prático:
  - redução de acoplamento entre UI e regra de negócio no diálogo principal.
  - base pronta para continuar quebra por fatias sem alterar comportamento.

### 11) Guard rails de regressão da auditoria
- Script novo:
  - `scripts/check-audit-guards.sh`
- Coberturas de proteção:
  - falha se houver novo `select("*")` em `src` ou `supabase/functions`
  - falha se houver novo `@ts-ignore` em `src` ou `supabase/functions`
- Script exposto em `package.json`:
  - `npm run audit:guards`

### 12) Lote 2 — Hardening do parser de voz (sem mudança de contrato)
- Extração do núcleo de parsing para módulo dedicado:
  - `supabase/functions/process-voice-session/parserCore.ts`
- `process-voice-session/index.ts` passou a delegar:
  - marcação de exercícios sem reps para input manual
  - validação/normalização de `load_breakdown`
  - recálculo consistente de `load_kg`
- Testes de caracterização adicionados:
  - `src/utils/__tests__/voiceParserCore.test.ts` (7 casos)
  - cobertura de peso corporal, barra bilateral, mistura lb/kg, duplo implemento, saneamento e marcação de reps ausentes.
- Resultado:
  - redução de complexidade no handler principal sem alterar payload de resposta.

### 13) Lote 3 — Hardening do gerador de sessão em grupo (sem mudança de contrato)
- Extração das validações e métricas cross-session para módulo dedicado:
  - `supabase/functions/generate-group-session/validationCore.ts`
- `generate-group-session/index.ts` passou a delegar:
  - nome de treino (`generateWorkoutName`)
  - contagem de sets efetivos (`countEffectiveSets`)
  - balanço de padrões (`calcPatternsBalance`)
  - estatísticas cross-session (`collectCrossSessionStats`)
  - validações de dominância, sobreposição e controle neural/articular
- Testes de caracterização adicionados:
  - `src/utils/__tests__/groupSessionValidationCore.test.ts` (4 casos)
- Resultado:
  - redução de acoplamento no arquivo principal de geração com extração do núcleo de validação.

### 14) Ajuste de regra de volume semanal por padrão de movimento
- Regra aplicada no motor:
  - Em 2 treinos/semana: mínimo `8` sets por padrão (push/pull/knee/hip)
  - Em 3 treinos/semana: mínimo `12` sets por padrão (push/pull/knee/hip)
  - Pull obrigatório em pelo menos `25%` acima de Push (`ratio >= 1.25`)
- Arquivo alterado:
  - `supabase/functions/generate-group-session/validationCore.ts`
- Testes de caracterização atualizados:
  - `src/utils/__tests__/groupSessionValidationCore.test.ts`

### 15) Contrato runtime no gerador de sessão em grupo
- Validação de payload com schema runtime (`zod`) no handler:
  - `supabase/functions/generate-group-session/index.ts`
- Entrada inválida agora retorna `details` com até 3 violações de contrato para facilitar debug.
- Contrato coberto:
  - `groupLevel`
  - `workouts` (3 itens A/B/C com ao menos 1 valência)
  - opcionais (`excludeExercises`, `groupReadiness`, `weekCount`, `audiencePreset`, `rotationMode`, `retainExerciseIds`)

### 16) Contrato runtime expandido para voz e relatórios
- `process-voice-session`:
  - payload validado com `zod` (`audio`, `prescriptionId`, `students`, `date`, `time`)
  - retorno `400` com `details` em caso de contrato inválido
- `generate-student-report`:
  - payload validado com `zod` (`studentId`, `periodStart`, `periodEnd`, `trackedExercises`, `trainerNotes`)
  - mantidas as validações de regra de negócio existentes (UUID, datas, janela mínima, limite de exercícios, duplicidade)
- Resultado:
  - contrato de entrada padronizado entre endpoints críticos sem alteração do contrato de sucesso.

### 17) Contrato runtime para ingestão e classificação
- `import-exercises`:
  - payload validado com `zod` antes da detecção de formato
  - erro `400` com `details` para payload inválido
- `classify-exercises`:
  - payload validado com `zod` para paginação/flags (`batchSize`, `offset`, `onlyUnclassified`)
  - suporte a body vazio com defaults seguros (sem quebrar chamada)
- Resultado:
  - endpoints de ingestão/classificação com validação de entrada explícita e consistente.

### 18) Limpeza incremental do handler de geração em grupo
- `generate-group-session/index.ts`:
  - respostas de erro do handler centralizadas em helper (`errorResponse`)
  - removida repetição de blocos de `new Response(...)` sem alterar mensagens/regras
- Resultado:
  - menor duplicação no caminho crítico de erro e menor risco de divergência de resposta.

### 19) Extração de autenticação e carregamento de recursos (geração em grupo)
- `generate-group-session/index.ts`:
  - autenticação/autorização extraída para `resolveAuthorizedContext`
  - carregamento de insumos (`exercises`, `breathing_protocols`, `equipment_inventory`) extraído para `fetchGenerationResources`
- Resultado:
  - handler principal mais curto e legível, mantendo o mesmo fluxo de validação e mesmas regras de geração.

## Pendências Prioritárias (próximo lote)
1. Continuar redução dos monolíticos remanescentes (fatia 2):
   - `supabase/functions/generate-group-session/index.ts`
   - `supabase/functions/process-voice-session/index.ts`
2. Criar smoke E2E curto para 4 fluxos críticos no preview autenticado.
3. Refactor por fatias no `generate-group-session/index.ts` (extração de blocos de persistência e montagem de resposta).

## Risco Residual Atual
- Fluxos de rede externos continuam dependentes de credenciais e disponibilidade de ambiente.
- Sem esse ambiente, os testes de integração externos ficam em modo `SKIP` (intencional).
