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
