## Staging Approval — Commit d152289 (perf-bundle-baseline)

### Execution Update (2026-03-12)

- `verify:essential` executed and PASS (`lint`, `test`, `build`, `audit --level=high`)
- Scenario 1 executed manually and reproduced issue ("import success with 0 sessions")
- Scenario 1 hotfixes delivered:
  - `386fbb1` - robust XLSX header mapping + fail-fast on zero valid rows
  - `2c51370` - support for `Nome` and `Nº Reps` headers
- Scenario 1 requires retest after latest deploy/sync
- Scenarios 2, 3 and 4 remain pending manual staging validation

### Execution Update (2026-03-13)

- Auditoria essencial avançada com correções de alto impacto:
  - `src/components/ReportLoadChart.tsx` -> `week` tipado como `number | string` + `tickFormatter` para eixo semanal.
  - `src/hooks/useOuraTrends.ts` -> médias 7d agora ignoram nulos (sem distorcer para zero) + correções de checks nulos.
  - `supabase/functions/oura-sync-all/index.ts` -> validação JWT trocada de `getClaims()` para `auth.getUser()`.
  - `supabase/functions/oura-sync-scheduled/index.ts` -> validação JWT trocada de `getClaims()` para `auth.getUser()`.
  - `supabase/functions/oura-sync-test/index.ts` -> validação JWT trocada de `getClaims()` para `auth.getUser()`.
  - `supabase/functions/classify-exercises/index.ts` -> validação JWT trocada de `getClaims()` para `auth.getUser()`.
  - `supabase/functions/generate-group-session/index.ts` -> validação JWT trocada de `getClaims()` para `auth.getUser()`.
  - `src/hooks/useStudents.ts` -> adicionado `.limit(2000)` para reduzir risco de truncamento em 1000 linhas.
- Documento de pendências por ausência criado em:
  - `docs/PENDENCIAS_AUSENCIA_2026-03-13.md`

### Execution Update (2026-03-14)

- `main` confirmado no GitHub com merge do hotfix de relatórios:
  - `bc7e1ce` - Merge pull request `#5` from `codex/report-audit-fixes-20260314`
- Hardening adicional implementado em branch dedicada:
  - `codex/invite-hardening-20260314`
  - `96d1d2c` - `feat(invites): harden onboarding invite flow`
  - `3cbe5ab` - `fix(auth): reduce service-role auth surface`
- Fluxo de onboarding por convite endurecido:
  - `generate-student-invite` -> origem do link restrita a `SITE_URL`/origens confiáveis, `expires_in_days` com clamp e respostas `no-store`
  - `validate-student-invite` -> validação de formato do token + respostas `no-store`
  - `create-student-from-invite` -> sanitização server-side do payload público, validação de avatar, claim/rollback do convite e limpeza defensiva
  - `generate-oura-connect-link` -> mesma política de origem confiável
  - `StudentOnboardingPage` / `useStudentInvites` -> avatar limitado a tipos suportados e 5 MB, fetch sem cache e mensagens de erro mais fiéis
- Superfície de auth/service-role reduzida:
  - `check-rate-limit` -> agora exige JWT válido quando `user_id` é informado, bloqueando pre-block malicioso por terceiros
  - `process-voice-session` -> autenticação do usuário movida de client com `service_role` para client com `anon`
  - `admin-create-user`, `admin-update-user`, `import-exercises` -> autenticação do chamador movida para client com `anon`, mantendo `service_role` apenas para operações privilegiadas
- Estado atual da auditoria:
  - relatórios: lote principal já mergeado em `main`
  - convites/onboarding: pronto em branch para PR
  - auth surface: reduzida nos pontos mais sensíveis e com próximos alvos remanescentes principalmente em padronização

### Execution Update (2026-03-14, continuação)

- Hardening adicional aplicado em endpoints de IA e entrada de arquivos nesta branch:
  - `chat-helper` -> validação estrutural de `messages`, limite de quantidade/tamanho, `studentId` validado e respostas sem cache
  - `ai-training-analyst` -> `period_days` agora validado em faixa segura (`7..180`) e payload inválido retorna `400`
  - `ai-report-generator` -> validação rigorosa de datas, bloqueio para janelas > `180` dias, `report_type` sanitizado e payload do aluno reduzido ao mínimo necessário
  - `classify-exercises` -> `batchSize`/`offset` normalizados, payload validado e respostas sem cache
  - `ai-coach` -> `question` limitada a `2000` caracteres, payload validado e dados do aluno minimizados antes do envio para IA
  - `generate-protocol-recommendations` -> autenticação do chamador migrada de client com `service_role` para client com `anon`, payload validado e respostas sem cache
  - `suggest-exercise` -> payload validado, limites de tamanho aplicados e fallback do banco limitado para evitar prompts gigantes
  - `parse-word-prescription` -> limite de tamanho do `.docx` em base64 e do texto extraído antes de seguir para IA
- Leitura atual da auditoria:
  - superfície de IA/custo: bastante reduzida nos endpoints mais expostos
  - superfície de auth privilegiada: mais consistente, com menos validações de usuário feitas via client privilegiado
  - próximos riscos remanescentes: smoke coverage ponta a ponta, padronização final de alguns endpoints secundários e endurecimento gradual do TypeScript

### Execution Update (2026-03-14, sessão/voz)

- Hardening adicional aplicado em endpoints críticos de sessão:
  - `voice-session` -> contexto websocket agora validado no servidor (`prescriptionId`, `date`, `time`, alunos únicos até 10), ownership de prescrição/alunos verificado antes de abrir a sessão e nomes/pesos passam a vir do banco em vez do payload do cliente
  - `generate-group-session` -> acesso restrito a `admin`/`trainer` no backend e validação mínima de payload para impedir geração por usuário autenticado fora do perfil esperado
- Impacto esperado:
  - redução do risco de leitura indevida de prescrição/alunos via websocket
  - redução do risco de abuso do gerador de mesociclo por perfis não autorizados

### Execution Update (2026-03-14, quick wins finais)

- Endpoints auxiliares endurecidos para consistência de borda:
  - `generate-oura-connect-link` -> payload validado e `student_id` agora exige UUID válido
  - `oura-disconnect` -> payload validado, respostas `no-store` e `student_id` validado
  - `suggest-regressions` -> lista enviada ao LLM limitada a 50 candidatos, IDs retornados validados contra o conjunto permitido e respostas sem cache

### Decision Record

**Status: GO for Staging (conditional)**

The commit `d152289` (`perf-bundle-baseline`) is approved for staging based on:

- CI green (lint, test, build, security audit all passing)
- Deep static analysis PASS on changed code paths identified in this commit for the 4 critical scenarios
- Zero preview console/network errors
- Bundle splitting correctly isolates `vendor-exceljs` and `vendor-react-pdf`

### Conditions for Production GO

Production promotion remains blocked until all 4 interactive smoke tests pass manually in staging:

| # | Scenario | Validation Method | Status |
|---|----------|-------------------|--------|
| 1 | ImportSessionsDialog - XLSX upload | Manual test in staging | Retest required (fix deployed) |
| 2 | AdminDiagnosticsPage - XLSX batch import | Manual test in staging | Pending |
| 3 | StudentReportsPage - lazy load | Manual test in staging | Pending |
| 4 | Export PDF - download | Manual test in staging | Pending |

### Guardrails for This Step

- Documentation-only update in this step
- No source code, security, RLS, migration, or edge function changes
- Staging-only decision record; production GO requires 4/4 manual PASS

---

# 🔍 Plano de Auditoria Completa — Fabrik Performance

## Escopo Total
- **50 hooks** (src/hooks/)
- **18 páginas** (src/pages/)
- **26 Edge Functions** (supabase/functions/)
- **~80 componentes** (src/components/)
- **Utilitários, contextos, constantes**

---

## Fase 1 — Core Hooks & Data Layer (Crítico)
**Risco: ALTO** — Bugs aqui afetam todo o app.

### 1.1 Hooks de CRUD principal
- `useStudents` / `useStudentDetail` / `useStudentsCardData`
- `useExercisesLibrary` (já marcado para refatoração)
- `usePrescriptions` / `usePrescriptionSearch` / `usePrescriptionDraft`
- `useWorkoutSessions` / `useAllSessions` / `useSessionDetail`
- `useWorkouts`

### 1.2 Hooks de integração Oura
- `useOuraConnection` / `useOuraConnectionStatus`
- `useOuraMetrics` / `useOuraTrends` / `useOuraBaseline`
- `useOuraSyncAll` / `useOuraSyncLogs` / `useOuraTestSync`
- `useOuraWorkouts`

### 1.3 Hooks auxiliares
- `useUserRole` / `useTrainers`
- `useFolders` / `useStudentInvites`
- `useStats` / `useStudentReports`
- `useExerciseHistory` / `useExerciseLoadHistory`

**Checklist:**
- [ ] Queries sem `.limit()` que podem bater no teto de 1000 rows
- [ ] Tratamento de erro consistente (try/catch vs onError)
- [ ] Cache invalidation correto (queryKey matching)
- [ ] Tipos TypeScript vs schema real do Supabase
- [ ] Hooks com `any` ou `as never`

---

## Fase 2 — Edge Functions (Backend)
**Risco: ALTO** — Segurança e integridade de dados.

### 2.1 Funções de autenticação e admin
- `admin-create-user` / `admin-update-user`
- `create-audit-admin`
- `check-rate-limit`

### 2.2 Funções de IA
- `ai-builder-chat` / `chat-helper`
- `classify-exercises`
- `generate-group-session`
- `generate-protocol-recommendations`
- `generate-student-report`
- `process-voice-session` / `voice-session`
- `suggest-exercise` / `suggest-exercise-alternatives` / `suggest-regressions`
- `parse-word-prescription`

### 2.3 Funções de integração Oura
- `oura-callback` / `oura-sync` / `oura-sync-all`
- `oura-sync-scheduled` / `oura-sync-test` / `oura-disconnect`

### 2.4 Funções de alunos
- `generate-student-invite` / `validate-student-invite` / `create-student-from-invite`
- `import-exercises`

**Checklist:**
- [ ] CORS headers presentes em todas
- [ ] Validação JWT consistente
- [ ] Tratamento de erros (nunca retornar 500 genérico)
- [ ] Secrets usados corretamente
- [ ] SQL injection / input validation

---

## Fase 3 — Componentes de Formulário & Dialogs
**Risco: MÉDIO** — UX e integridade de dados de entrada.

### 3.1 Dialogs de CRUD
- `AddStudentDialog` / `EditStudentDialog`
- `AddExerciseDialog` / `EditExerciseLibraryDialog`
- `CreatePrescriptionDialog` / `EditPrescriptionDialog`
- `AddWorkoutDialog` / `AddWorkoutSessionDialog`
- `EditSessionDialog` / `EditGroupSessionDialog`
- `AddUserDialog` / `EditUserDialog`

### 3.2 Dialogs de registro de sessão (complexos)
- `RecordGroupSessionDialog`
- `RecordIndividualSessionDialog`
- `VoiceSessionRecorder` / `MultiSegmentRecorder` / `AudioSegmentRecorder`

### 3.3 Dialogs auxiliares
- Todos os demais dialogs

**Checklist:**
- [ ] Validação de formulário (Zod schemas)
- [ ] Estados de loading/error/success
- [ ] Reset de form ao fechar dialog
- [ ] Acessibilidade (labels, aria)
- [ ] Feedback visual ao usuário

---

## Fase 4 — Páginas & Navegação
**Risco: MÉDIO** — UX e performance.

**Checklist:**
- [ ] Lazy loading funcionando
- [ ] SEO (títulos, meta)
- [ ] Estados vazios (EmptyState)
- [ ] Responsividade
- [ ] Permissões (admin vs trainer)

---

## Fase 5 — Utilitários, Contextos & Constantes
**Risco: BAIXO** — Mas impacto transversal.

**Checklist:**
- [ ] Funções puras com testes
- [ ] Constantes duplicadas ou inconsistentes
- [ ] Logger vs console.log

---

## Fase 6 — Design System & Temas
**Risco: BAIXO** — Visual e consistência.

**Checklist:**
- [ ] Tokens semânticos em todos os componentes
- [ ] Light/dark mode consistente
- [ ] Cores hardcoded remanescentes

---

## Critérios de Refatoração

| Critério | Ação |
|----------|------|
| Bug confirmado | Corrigir imediatamente |
| Inconsistência de tipos | Corrigir (baixo risco) |
| Código duplicado | Avaliar custo/benefício |
| Performance | Corrigir se impacto mensurável |
| Refatoração estrutural | Só se risco < benefício |

## Ordem de Execução
1. Fase 1 → Hooks (fundação)
2. Fase 2 → Edge Functions (segurança)
3. Fase 3 → Formulários (entrada de dados)
4. Fase 4 → Páginas (UX)
5. Fase 5 → Utilitários
6. Fase 6 → Design System

---

## Execution Update (2026-03-14, hardening secundário)

### Entregue nesta rodada
- `generate-student-report`
  - validação explícita de `studentId`, datas, lista de exercícios monitorados e `trainerNotes`
  - limite de até 12 exercícios monitorados
  - bloqueio de IDs inválidos, duplicados ou não encontrados
  - respostas JSON com `Cache-Control: no-store`
- `ai-builder-chat`
  - validação de corpo e de `Authorization`
  - limites de mensagem/histórico
  - bloqueio de histórico malformado
  - saneamento defensivo do resultado retornado pela IA antes de usar/criar issue
  - respostas JSON com `Cache-Control: no-store`
- `admin-create-user`
  - validação forte de email, nome, role e senha
  - diferenciação melhor entre erro de validação, auth e conflito
  - respostas JSON com `Cache-Control: no-store`
- `admin-update-user`
  - validação de `userId`, email, nome, role, senha e payload vazio
  - respostas JSON com `Cache-Control: no-store`
- `oura-sync` / `oura-sync-test`
  - validação forte de `student_id` e `date`
  - respostas JSON com `Cache-Control: no-store`

### Validação executada
- `git diff --check` passou
- revisão manual dos diffs concluída
- `eslint` local focado nos arquivos alterados ficou pendurado no executor; não houve sinal útil do ambiente para esse passo

### Próximo alvo
- smoke final dos fluxos críticos
- última rodada de padronização residual nas edge functions auxiliares
- início do endurecimento gradual de TypeScript

---

## Execution Update (2026-03-15, TypeScript hotspots v1)

### Entregue nesta rodada
- `useStudentReports`
  - mapeamento explícito de `student_reports` e `report_tracked_exercises`
  - parsing defensivo de `oura_data` e `weekly_progression`
  - remoção de casts `as unknown as` nesses fluxos
- `usePrescriptions`
  - mapeamento explícito de listas, exercícios, adaptações e assignments
  - parsing defensivo de `custom_adaptations`
  - remoção de casts frágeis da listagem e dos assignments
- `useExerciseHistory`
  - mapeamento explícito de sessões/exercícios antes de compor histórico
- `useWorkoutSessions`
  - mapeamento explícito de `workout_sessions` e `exercises`

### Validação executada
- `git diff --check` passou
- busca por `any` / `as unknown as` nos hooks alterados ficou limpa
- `vitest` e `tsc` foram iniciados, mas o executor voltou a pendurar sem devolver sinal útil; processos foram encerrados para preservar o ambiente

### Leitura
- pacote seguro, de baixo risco e com ganho real de contrato de dados
- próxima rodada de TypeScript pode mirar hooks remanescentes de relatórios/prescrições ou utilitários de sessão
