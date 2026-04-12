# Auditoria de Melhorias do App (2026-04-12)

## Objetivo
Consolidar melhorias de engenharia sem ampliar escopo funcional: manter o sistema atual estável, reduzir risco de regressão e preparar evolução segura por lotes.

## Baseline técnico validado
- `lint`: PASS
- `test` (64/64): PASS
- `build`: PASS
- `npm audit --audit-level=high`: PASS (somente vulnerabilidades moderadas de toolchain)

Referência de pendências manuais (UI autenticada):  
`docs/AUDITORIA_PENDENCIAS_MANUAIS_2026-04-11.md`

---

## Mapa por domínio (status atual)

### 1) Banco de Exercícios e Catalogação — 🟡 Atenção
**Arquivos principais**
- `src/pages/ExercisesLibraryPage.tsx`
- `src/hooks/useExercisesLibrary.ts`
- `supabase/functions/import-exercises/index.ts`
- `supabase/migrations/*exercises_library*`

**Pontos fortes**
- Catálogo com classificação multidimensional e filtros.
- Importador XLSX robusto com batch insert/update.

**Riscos reais**
- Não há garantia forte de unicidade semântica para nome de exercício (acento/variação textual), o que mantém risco de duplicidade.
- Página depende de busca client-side após `.limit(2000)`, com risco de truncar resultados em crescimento de base.
- Classificação e nomenclatura têm regras distribuídas em vários lugares (migrations, import, UI), aumentando chance de inconsistência futura.

**Melhorias recomendadas**
1. Criar chave canônica de nome (`name_normalized`) com índice único controlado por migração.
2. Migrar busca principal para abordagem server-side paginada.
3. Centralizar normalização/classificação em função utilitária única reutilizada por import e UI.

---

### 2) Prescrição e Adaptações — 🟡 Atenção
**Arquivos principais**
- `src/hooks/usePrescriptions.ts`
- `src/pages/PrescriptionsPage.tsx`
- `src/components/CreatePrescriptionDialog.tsx`
- `src/components/EditPrescriptionDialog.tsx`

**Pontos fortes**
- Tipagem sólida de `custom_adaptations`.
- Uso de RPCs para operações mais sensíveis (`update_prescription_with_exercises`, `delete_prescription_cascade`).

**Riscos reais**
- Alta concentração de lógica em hooks/componentes extensos dificulta manutenção.
- Pouca cobertura de teste automatizado para regras de negócio de prescrição/adaptação.

**Melhorias recomendadas**
1. Extrair camadas de serviço para regras de montagem/validação de prescrição.
2. Adicionar testes unitários para mapeamentos e validações críticas (adaptações, tracking flags, carga/reps).

---

### 3) Sessões e Importação — 🟡 Atenção
**Arquivos principais**
- `src/components/ImportSessionsDialog.tsx`
- `src/components/RecordGroupSessionDialog.tsx`
- `src/components/RecordIndividualSessionDialog.tsx`
- `src/hooks/useWorkoutSessions.ts`

**Pontos fortes**
- Parsing de data/hora endurecido.
- Fluxos de duplicidade tratados no import.

**Riscos reais**
- Componentes muito grandes (ex.: `RecordGroupSessionDialog.tsx` >1000 linhas) concentram múltiplas responsabilidades.
- Ainda depende de smoke manual para fechar todos os fluxos ponta-a-ponta.

**Melhorias recomendadas**
1. Fatiar componentes grandes em submódulos (parsing, validação, persistência, UI).
2. Aumentar telemetria de falhas de import (códigos de erro padronizados por linha/registro).

---

### 4) Oura + Motor de Recomendação — 🟡 Atenção
**Arquivos principais**
- `supabase/functions/oura-sync/index.ts`
- `src/hooks/useOuraMetrics.ts`
- `src/hooks/useOuraAcuteMetrics.ts`
- `src/hooks/useOuraBaseline.ts`
- `src/hooks/useTrainingRecommendation.ts`

**Pontos fortes**
- Pipeline diário e agudo implementado.
- Baseline individual em uso.
- Override agudo aplicado na recomendação.

**Riscos reais**
- Dependência de disponibilidade de métricas agudas por plano/dispositivo do Oura (campos podem vir nulos).
- Regras do motor já estão funcionais, mas sem suíte de teste unitária dedicada (risco de regressão silenciosa).

**Melhorias recomendadas**
1. Criar suíte de testes de regra para `useTrainingRecommendation` (zonas + override).
2. Formalizar contrato de dados ausentes na UI (exibir fallback claro sem “ruído visual”).

---

### 5) Relatórios — 🟡 Atenção
**Arquivos principais**
- `supabase/functions/generate-student-report/index.ts`
- `src/hooks/useStudentReports.ts`
- `src/components/StudentReportView.tsx`
- `src/components/ReportPDFDocument.tsx`

**Pontos fortes**
- Geração com validação de ownership.
- PDF lazy-loaded e fallback de métricas nulas já endurecido.

**Riscos reais**
- Edge function extensa (>800 linhas), com múltiplas regras no mesmo arquivo.
- Pouca automação de teste de contrato entre payload do backend e renderização UI/PDF.

**Melhorias recomendadas**
1. Extrair funções puras de cálculo/agregação para módulo dedicado.
2. Adicionar teste de contrato para `oura_data`, `tracked_exercises`, `weekly_progression`.

---

### 6) Segurança e Edge Functions — 🟡 Atenção
**Arquivos principais**
- `supabase/config.toml`
- `supabase/functions/*`

**Pontos fortes**
- Endpoints críticos com validação de auth/role no código.
- Correções recentes de autenticação em sync Oura.

**Riscos reais**
- Existem endpoints com `verify_jwt=false` que dependem 100% de validação interna; qualquer regressão local vira risco alto.
- Falta padronização total de middleware de autenticação compartilhado para edge functions.

**Melhorias recomendadas**
1. Criar utilitário comum de autenticação/role para edge functions.
2. Cobrir cenários A/B/C de auth por CI para todos endpoints críticos.

---

### 7) Performance e UX transversal — 🟡 Atenção
**Pontos fortes**
- Code splitting por rota já aplicado.
- `vendor-exceljs` e `vendor-react-pdf` isolados.

**Riscos reais**
- Chunks ainda muito grandes para libs pesadas (esperado, mas precisa monitoramento).
- Alguns arquivos front e edge com alto acoplamento tornam evolução lenta.

**Melhorias recomendadas**
1. Continuar fatiamento dos arquivos maiores por domínio.
2. Medir regressão de bundle por PR (gate automático de tamanho por chunk crítico).

---

## Inventário de funções do app (revisão de cobertura)

### Páginas principais (frontend)
- `AdminDiagnosticsPage`
- `AdminUsersPage`
- `AthleteInsightsDashboard`
- `AuthPage`
- `CoachConsole`
- `ExerciseReviewPage`
- `ExercisesLibraryPage`
- `Index`
- `OnboardingSuccessPage`
- `OuraConnectPage`
- `OuraErrorPage`
- `PrescriptionsPage`
- `RecoveryProtocolsPage`
- `ResetPasswordPage`
- `SessionsPage`
- `StudentDetailPage`
- `StudentOnboardingPage`
- `StudentReportsPage`
- `StudentsComparisonPage`
- `StudentsPage`

### Edge functions (backend/serverless)

**Admin e gestão**
- `admin-create-user` (`verify_jwt=true`)
- `admin-update-user` (`verify_jwt=true`)
- `create-audit-admin` (`verify_jwt=false`, service-role only)

**IA e assistentes**
- `ai-builder-chat`
- `ai-coach`
- `ai-report-generator`
- `ai-training-analyst`
- `chat-helper`
- `suggest-exercise`
- `suggest-exercise-alternatives`
- `suggest-regressions`
- `classify-exercises`
- `parse-word-prescription`
- `pr-detector`

**Oura**
- `generate-oura-connect-link`
- `oura-callback`
- `oura-disconnect`
- `oura-sync`
- `oura-sync-all`
- `oura-sync-scheduled`
- `oura-sync-test`

**Sessões e prescrição**
- `generate-group-session`
- `import-exercises`
- `voice-session`
- `process-voice-session`
- `generate-protocol-recommendations`
- `generate-student-report`

**Convites e onboarding**
- `generate-student-invite`
- `validate-student-invite`
- `create-student-from-invite`

**Infra**
- `check-rate-limit`

### Observação de segurança (inventário)
- Endpoints com `verify_jwt=false` foram revisados em código e dependem de validação interna explícita.
- Endpoints públicos intencionais: `validate-student-invite`, `create-student-from-invite`, `oura-callback`, `check-rate-limit`.
- Endpoints sensíveis com `verify_jwt=false` e proteção por header/role no código: `import-exercises`, `oura-sync*`, `generate-group-session`, `create-audit-admin`.

---

## Melhorias executadas nesta rodada (sem mudança de escopo)

### Correção de estabilidade no cache (React Query)
- `src/hooks/useStudentsCardData.ts`
- `src/hooks/useExerciseLastSession.ts`

**Ajuste aplicado**
- Removida mutação acidental de arrays no `queryKey` (`sort()` mutava props de entrada).
- Agora usa cópia defensiva: `[...] .sort().join(",")`.
- Em `useExerciseLastSession`, ordenação de sessão reforçada para desempate (`date` -> `time` -> `created_at`) e normalização textual com remoção de acentos para matching mais confiável de exercício.
- Em `useStudentsCardData`, erros críticos de consulta (`oura_metrics`, `student_observations`, `oura_connections`) agora falham explicitamente em vez de mascarar ausência de dados.
- Em `useLoadSuggestions`, `queryKey` ficou sensível ao contexto completo da recomendação (zona, decisão, ajuste, override e severidade de alertas), reduzindo risco de sugestão de carga stale por cache.
- Em `useOuraConnectionStatus`, falhas na leitura de conexão agora retornam erro (em vez de cair em falso “sem conexão”), mantendo warning somente para falha de leitura de logs.

**Impacto**
- Evita side effects sutis de ordenação em estado externo.
- Melhora previsibilidade do cache e reduz chance de comportamento intermitente.
- Reduz erro de “última sessão” incorreta quando há múltiplas sessões no mesmo dia.
- Evita falso negativo de dados Oura causado por falha silenciosa de query.

---

## Backlog recomendado (prioridade)

### Lote A (executar agora, baixo risco)
1. Testes unitários do motor de recomendação (zonas + override).
2. Testes de contrato do relatório (UI/PDF + payload backend).
3. Padronizar middleware de auth para edge functions críticas.

### Lote B (médio risco, alta manutenção)
1. Refatorar `generate-student-report` em módulos menores.
2. Refatorar `RecordGroupSessionDialog` em subcomponentes/serviços.
3. Paginação e busca server-side na biblioteca de exercícios.

### Lote C (estrutural)
1. Chave canônica única para nome de exercício.
2. Governança central de nomenclatura/classificação.
3. Gate automático de bundle size por PR.

---

## O que ainda depende de você (manual)
1. Smoke funcional autenticado dos 4 cenários (importação, admin diagnostics, relatório, PDF).
2. Validação visual final no preview staging após merge dos próximos lotes.
