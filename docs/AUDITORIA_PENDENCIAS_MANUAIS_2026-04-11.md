# Auditoria Essencial — Pendências Manuais (2026-04-11)

## Atualização de status (2026-04-16)
- `main` atualizado com os dois pacotes mais recentes:
  - `873d711` — hardening do sync/callback Oura (`PR #23`)
  - `cb70683` — robustez de import/sessões legadas (`PR #24`)
- Escopo de importação/sessões atualizado sem regressão de schema/RLS/edge auth:
  - enriquecimento de duplicadas (fallback de carga por texto);
  - invalidação extra de cache para refletir dados imediatamente;
  - renderização de carga em sessões antigas quando `load_kg` vier nulo.
- Pendência local de atribuição resolvida e integrada:
  - `127c722` (`PR #26`) — correção do fechamento acidental do dialog ao selecionar período.

## Atualização de status (2026-04-17)
- `PR #29` aberto: hardening do backend de relatório para consistência entre UI e edge function.
  - branch: `codex/report-generation-consistency-20260417`
  - commit: `968159e`
  - mudanças:
    - bloqueia geração quando o payload inclui exercício não executado no período;
    - aplica regra mecânica apenas sobre exercícios elegíveis (força/hipertrofia), reduzindo ruído de classificação.
- `PR #29` atualizado com otimização de performance em comparação/prescrições:
  - remove consulta N+1 de prescrições por exercício na página de comparação;
  - estabiliza `queryKey` com listas ordenadas/deduplicadas para reduzir refetch desnecessário;
  - preserva comportamento funcional (apenas aceleração e consistência de cache).
- `PR #29` atualizado com robustez de erro em comparação:
  - queries de sessões/prescrições/exercícios agora falham explicitamente (sem fallback silencioso);
  - UI exibe erro claro quando a comparação não consegue carregar dados.
- Otimização adicional aplicada em cache de listas/filtros:
  - `useExercisesLibrary` com `staleTime/gcTime` e `refetchOnMount=false`;
  - comparação de alunos com cache estável para listas de exercícios/prescrições;
  - objetivo: reduzir latência percebida em cliques/navegação.
- Hardening de observabilidade no sync Oura:
  - adicionada verificação explícita de erro ao atualizar `last_sync_at` no final da rotina;
  - melhora diagnóstico quando a coleta salva métricas mas o marcador de sincronização não atualiza.
- Ajuste de catalogação/import de exercícios:
  - parser de risco (`mapSpreadsheetRisk`) agora normaliza acentos;
  - evita perder classificação de risco quando planilha vier com `médio`.
  - mapeamento JSON de subcategorias não-força agora mantém `movement_pattern = null` (sem cast forçado), alinhando com o comportamento da planilha.
- Otimização adicional de carregamento:
  - `StudentReportsPage` passa a buscar somente o aluno alvo (`useStudentById`) em vez de carregar a lista inteira;
  - reduz payload e tempo de render ao abrir relatórios de aluno.
- Consistência de cache em prescrição:
  - mutations de criar/editar/excluir prescrição e excluir atribuição agora invalidam também `prescription-search`, `prescriptions-list` e `students-active-prescriptions`;
  - reduz estado stale após operações de prescrição.
- Hardening de autenticação nas edge functions críticas (`verify_jwt=false`):
  - criado helper compartilhado `supabase/functions/_shared/auth.ts` para validação consistente de `service_role` ou JWT com `user_roles`;
  - `oura-sync-all`, `oura-sync-scheduled` e `import-exercises` migradas para o helper;
  - sem alteração de regra de acesso, somente redução de divergência entre endpoints.
- Estabilidade/performance em listagem de sessões:
  - paginação infinita de sessões agora ordena também por `id` (desempate estável entre páginas);
  - `useWorkoutSessions` e `useSessionExercises` com `staleTime/gcTime/refetchOnMount` ajustados para reduzir refetch desnecessário e cliques lentos.
  - mutations de sessão agora invalidam também `all-sessions-paginated` (além de `all-sessions`) para evitar lista stale após criar/reabrir/finalizar.
  - fluxo `useCreateWorkout` (dashboard) agora invalida também queries de sessões (`all-sessions`, `all-sessions-paginated`, `sessions-with-exercises`, `session-exercises`) e `workouts-paginated`.
  - edição de sessão (`EditSessionDialog`) agora invalida `all-sessions-paginated` para refletir alterações imediatamente na listagem paginada.
  - normalização de data/hora de sessão aplicada nas telas críticas (`SessionsPage`, `SessionDetailDialog`, `EditSessionDialog`, `RecordGroupSessionDialog`, `DraftHistoryDialog`) com utilitários dedicados:
    - data sempre em `dd/MM/yyyy` com parse timezone-safe para strings `YYYY-MM-DD`;
    - horário sempre em `HH:MM` (sem segundos).
  - `useSessionDetail` refatorado para query única com join (`workout_sessions` + `students` + `exercises`) e cache (`staleTime/gcTime/refetchOnMount`) para reduzir latência de abertura do detalhe.
  - `useStudentPrescriptions` e `useSessionsWithExercises` com cache ajustado (`staleTime/gcTime/refetchOnMount`) para diminuir refetch em navegação entre abas do aluno.
  - `EditGroupSessionDialog` sem N+1 no carregamento inicial: exercícios de todas as sessões do grupo passam a ser buscados em query única (`in('session_id', ...)`) e agrupados em memória.
  - normalização de data expandida para histórico/comparação (`ExerciseHistoryCard`, `WorkoutCard`, `StudentsComparisonPage`) usando util timezone-safe para reduzir risco de dia deslocado em `YYYY-MM-DD`.
  - `useExerciseHistory` com cache (`staleTime/gcTime/refetchOnMount`) e lookup otimizado de sessões (`Map`) para reduzir custo de render em históricos longos.
- UI Oura (card agudo):
  - parsing/format de data endurecido para sempre renderizar `dd/MM/yyyy` mesmo com variações de payload (`YYYY-MM-DD`, `YYYY-MM-DD HH:mm:ss`, ISO).

## Pendências manuais atuais (fonte única)
1. Validar no Lovable que sessões antigas com carga textual agora exibem carga no detalhe da sessão.
2. Reimportar planilha duplicada e confirmar:
   - duplicadas ignoradas sem erro;
   - enriquecimento de `sets/reps/carga` aplicado quando houver dados faltantes.
3. Smoke funcional autenticado:
   - geração de relatório em `/alunos/:studentId/relatorios`;
   - exportação de PDF.

## Escopo concluído automaticamente
- Correções de estabilidade e consistência em UI Oura, importação Excel, motor de recomendação e debug panel.
- Validações automáticas executadas com sucesso:
  - `npm run lint`
  - `npm run test -- --run`
  - `npm run build`
  - `npm audit --audit-level=high` (sem vulnerabilidades high/critical; 2 moderadas de toolchain Vite/esbuild)
  - `npx tsc --noEmit`
  - `scripts/ci-smoke-edge-auth.sh` (cenários de rejeição A1/B1/B2/B3/C1/C2/C3/D0)
  - Revalidação completa executada novamente em 2026-04-11 (gates e smoke de auth sem regressão)

## O que ainda depende de validação manual

### 1) Fluxos de UI autenticada (smoke funcional)
1. Importação de sessões com Excel (arquivo real), incluindo:
   - caso de importação nova;
   - caso de duplicata já existente.
2. Geração de relatório em `/alunos/:studentId/relatorios`.
3. Exportação de PDF no relatório gerado.
4. Revisão visual das abas do aluno com Oura conectado:
   - sem sobreposição de debug;
   - datas no formato esperado;
   - ausência de erro bloqueante em console.

### 2) Happy-path com service_role (opcional para gate avançado)
- Executar cenários A3/B4/C4 no workflow de edge smoke com `RUN_SERVICE_ROLE_TESTS=true`.
- Requer `SUPABASE_SERVICE_ROLE_KEY` configurada no ambiente CI.
- Para execução local do script `scripts/ci-smoke-edge-auth.sh`, garantir:
  - `SUPABASE_URL` e `SUPABASE_ANON_KEY` exportadas no shell; ou
  - `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` carregadas no ambiente.

## Quadro técnico consolidado de melhorias
- Documento mestre atualizado em:
  - `docs/AUDITORIA_MELHORIAS_APP_2026-04-12.md`
- Contém:
  - status por domínio (exercícios, prescrição, sessões, Oura, relatórios, segurança, performance);
  - backlog priorizado por lotes (A/B/C);
  - melhorias já executadas sem mudança de escopo funcional.

## Critério objetivo para considerar auditoria essencial concluída
- Todos os itens de UI autenticada acima passam sem erro funcional.
- Sem regressão de comportamento em importação, relatório e exportação.
- (Opcional recomendado) Happy-path service_role validado no CI.

## Branch de trabalho
- `main` (todas as correções abaixo já integradas)

## Commits desta rodada de hardening
- `d592171` fix(stability): remove invalid DOM nesting and harden edge auth integration test
- `fa7e6fe` fix(ui): remove dialog/description runtime warnings and ignore local artifacts
- `28f5ecc` refactor(ui): align heading refs and make CardDescription block-safe
- `91afcca` fix(training): harden numeric checks in recommendation alerts
- `b2a088d` fix(oura-ui): treat zero values as valid metrics
- `f9a1902` fix(import): harden excel serial date/time parsing and progress guard
- `2d9e2fc` fix(debug): restrict auth debug panel to localhost dev
- `28c33ba` fix(oura-diagnostics): avoid false empty status on zero values
- `21dd7b9` fix(oura): prevent sparse sync overwrite and recover latest readiness/sleep
- `c18ba57` fix(oura): preserve zero metrics and harden diagnostics consistency
- `529ab61` fix(import): validate time values and prevent silent 12:00 fallback
- `2ac31da` fix(reports): surface edge function error details in generate flow
- `7e56aff` fix(oura): keep partial metric sync and show conditional diagnostics warning
- `ee0b361` fix(training): use nullish fallback for recovery score (`readiness_score ?? 50`) to avoid false zone inflation
- `73cb66a` chore(smoke): accept `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` fallback no script de edge auth smoke
- `6fe3f1e` fix(oura): baseline parsing robusta sem mascarar valores numéricos zero
- `65ac384` fix(reports): evita exibição de `undefined` em “dias de dados” no relatório (UI + PDF)
- `d93359b` fix(import): parser de hora endurecido (HH:MM, AM/PM, HHMM e fração Excel 0..1), sem normalização silenciosa de valores inválidos
- `f3bfc2e` chore(ci): atualização de actions do workflow `ai-engineer` para majors suportadas
- `e71eb4d` docs(smoke): runbook de staging atualizado com validação de duplicatas e horas inválidas
