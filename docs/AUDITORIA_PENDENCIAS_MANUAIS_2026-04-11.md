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
  - `oura-sync` passa a retornar `warnings` no payload quando ocorrerem falhas não bloqueantes (métricas agudas, workouts, merge prévio ou update de `last_sync_at`), reduzindo falha silenciosa em produção.
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
- Estabilidade/performance em relatórios:
  - `useStudentReports`, `useReportById` e `useReportTrackedExercises` agora com cache estável (`staleTime/gcTime/refetchOnMount`) para reduzir refetch ao abrir/fechar relatório.
  - atualização de notas do treinador invalida também a lista de relatórios do aluno (`student-reports`) para evitar estado stale após edição.
- Cobertura de regressão (data/hora):
  - adicionados testes unitários para `formatSessionDate` e `formatSessionTime`, garantindo `dd/MM/yyyy` timezone-safe e exibição `HH:MM` sem segundos.
- UI Oura (card agudo):
  - parsing/format de data endurecido para sempre renderizar `dd/MM/yyyy` mesmo com variações de payload (`YYYY-MM-DD`, `YYYY-MM-DD HH:mm:ss`, ISO).

## Atualização de status (2026-04-18)
- Fluxo de atribuição de prescrição endurecido para lote com duplicados:
  - a mutation `useAssignPrescription` agora pré-valida alunos já atribuídos na mesma `start_date`;
  - quando houver mistura de novos + duplicados, atribui os novos e ignora duplicados (sem falha total do lote);
  - feedback de UX por cenário:
    - sucesso total;
    - atribuição parcial (com contagem de ignorados);
    - nenhuma nova atribuição (todos duplicados);
  - `AssignPrescriptionDialog` passa a fechar somente quando houver ao menos 1 atribuição nova, evitando perda de contexto para ajuste de período.
- Performance de navegação em telas com Oura:
  - hooks `useOuraMetrics`, `useLatestOuraMetrics`, `useOuraTrends` e `useLatestOuraAcuteMetrics` ajustados para cache curto (`staleTime=60s`, `gcTime=10min`, `refetchOnMount=false`);
  - objetivo: reduzir refetch em cada clique/aba e melhorar responsividade sem perder atualização prática (invalidação após sync continua imediata).
- Observabilidade do sync Oura ampliada:
  - `oura-sync` agora registra `warnings` por endpoint com falha de transporte (timeout/rejeição) e por endpoint com status não-OK (ex.: 429/5xx);
  - mantém sucesso parcial quando possível, mas sem ocultar degradação de coleta.
- Performance no histórico de carga por exercício:
  - `useExerciseLoadHistory` removido de fluxo “carrega todas as sessões + cruza em memória” para query direta de exercícios candidatos com join em `workout_sessions`;
  - seleção do último registro por aluno feita em memória com timestamp da sessão, reduzindo payload e roundtrip em turmas maiores.
- Consistência de cache após criação de sessões:
  - `useCreateWorkoutSession` e `useCreateGroupWorkoutSessions` agora invalidam também `all-sessions`, `sessions-with-exercises`, `session-exercises` e `stats`;
  - reduz risco de telas com contadores/listas desatualizados após salvar sessão.
- Disconnect Oura com invalidação abrangente:
  - `useDisconnectOura` passa a reutilizar `invalidateOuraQueries(...)` em vez de invalidar só `oura-connection`;
  - evita estado stale em cards de conexão/métricas/tendências logo após desconectar.
- Cache/query hardening adicional para reduzir latência de navegação:
  - `StudentsComparisonPage` agora usa cache explícito (`staleTime/gcTime/refetchOnMount=false/refetchOnWindowFocus=false`) para a query pesada de comparação;
  - comparação de faixa de prescrição no `StudentsComparisonPage` foi trocada de `Date` para comparação de strings `YYYY-MM-DD`, evitando risco de dia deslocado por timezone no match de prescrição por sessão.
- Cache de infraestrutura endurecido:
  - `useStudentsCardData` agora deduplica `studentIds` (menos payload duplicado) e desativa refetch automático em mount/focus;
  - `useStudentsCardData` também passa a limitar a leitura de `oura_metrics` para janela recente (45 dias), reduzindo leitura histórica sem impacto na decisão diária do card;
  - `useUserRole`, `useTrainers` e `useEquipmentInventory` agora com `staleTime/gcTime` + `refetchOnMount=false/refetchOnWindowFocus=false` para reduzir consultas repetidas em navegação.
- Busca/listagem de prescrições com menos churn:
  - `usePrescriptionSearch` agora usa debounce (`searchText`), `queryKey` estável por primitivos e cache curto (`staleTime/gcTime`) com `refetchOnMount=false/refetchOnWindowFocus=false`;
  - reduz chamadas consecutivas durante digitação sem alterar resultado final da busca.
  - `PrescriptionsPage` agora só considera “busca ativa” quando há texto não-vazio (`trim`) ou filtros reais, evitando estado stale ao limpar o campo de busca.
- Cache de páginas analíticas/IA:
  - `AthleteInsightsDashboard` com cache explícito em todas as queries (`students`, `trends`, `records`, `goals`) e sem refetch automático em mount/focus;
  - `CoachConsole` com cache explícito na lista de alunos;
  - `useOuraSyncLogs` com cache curto e sem refetch automático em mount/focus.
- Cache adicional em fluxos de base:
  - `useFolders` com cache estável (`staleTime/gcTime`) e sem refetch automático em mount/focus;
  - `useOuraConnection` e `useOuraWorkouts` com cache curto e sem refetch automático em mount/focus;
  - `useDuplicateExerciseCheck` com cache estável para reduzir consultas repetidas durante digitação/edição de nomes.
- Cache em fluxos clínicos/revisão:
  - `useBreathingProtocols`, `useRecoveryProtocols`, `useRecoveryProtocol` e `useProtocolRecommendations` com política explícita de cache e sem refetch automático em mount/focus;
  - `useStudentImportantObservations`, `useValidateInvite` e `StudentObservationsCard` com cache curto para reduzir chamadas repetidas;
  - `ExerciseReviewPage`, `ExerciseDimensionReview`, `ExerciseDistributionDiagnostic` e queries internas de `RecordIndividualSessionDialog` com `staleTime/gcTime` + `refetchOnMount=false/refetchOnWindowFocus=false`.
- Hardening de erro Supabase em fluxos críticos de sessão:
  - `AdminRoute` agora trata erro de consulta de role explicitamente (fallback seguro para não-admin + log técnico);
  - `StudentsComparisonPage` agora propaga erro em queries de biblioteca de exercícios/prescrições (sem fallback silencioso);
  - `RecordGroupSessionDialog` agora valida erros em:
    - carregamento de exercícios na reabertura;
    - lookup de sessões antigas;
    - deletes de sessões/exercícios no modo reabertura;
    - lookup de sessão para pós-processamento (observações/áudio);
  - `RecordIndividualSessionDialog` agora valida erro ao limpar exercícios antigos antes de sobrescrever sessão reaberta;
  - `useCreateSessionWithExercises` agora loga falha de rollback quando não conseguir excluir `workout_sessions` após erro de insert de exercícios.
- Redução de payload em queries de sessão (responsividade):
  - `RecordGroupSessionDialog` deixou de usar `select('*')` em consultas de exercícios/alunos (campos explícitos);
  - `RecordIndividualSessionDialog` deixou de usar `select('*')` em sessão/exercícios de reabertura e removeu fetch não usado de `session_audio_segments`;
  - `useSessionExercises` em `useWorkoutSessions` agora usa seleção explícita de colunas em vez de `select('*')`.
- Redução de payload em observações/edição:
  - `StudentObservationsCard` e `useStudentImportantObservations` migrados de `select('*')` para colunas explícitas;
  - `EditSessionDialog` migrado para seleção explícita de colunas em `workout_sessions` e `exercises`.

## Atualização de status (2026-04-20)
- Importação de sessões com duplicadas:
  - `ImportSessionsDialog` agora deixa explícito quando a etapa de enriquecimento de duplicadas falha (adiciona erro no resumo final e log técnico), removendo comportamento silencioso.
- Relatórios (datas e export):
  - `StudentReportView` e `ReportPDFDocument` migrados para parse de data timezone-safe (`parseISO` + fallback validado), evitando deslocamento de dia em `period_start/period_end`;
  - nome do PDF exportado usa as mesmas datas timezone-safe;
  - falha de export PDF agora mostra descrição detalhada de erro ao usuário (não apenas mensagem genérica).
- Responsividade (sessões e relatórios):
  - hooks de sessões (`useAllSessions`, `useAllSessionsPaginated`, `useWorkoutSessions`, `useSessionExercises`) passaram a não refetchar por foco de janela (`refetchOnWindowFocus=false`), reduzindo recargas ao alternar abas;
  - consultas de `workout_sessions` em `useWorkoutSessions` agora usam seleção explícita de colunas (em vez de `*`), reduzindo payload sem alterar dados exibidos;
  - hooks de relatórios (`useStudentReports`, `useReportById`, `useReportTrackedExercises`) também passaram a `refetchOnWindowFocus=false` para diminuir latência de navegação entre tela/lista/detalhe.
- Responsividade (catálogo de exercícios):
  - `useExercisesLibrary` passou a usar seleção explícita de colunas e `refetchOnWindowFocus=false`;
  - reduz payload e recarregamentos automáticos ao alternar abas sem alterar filtros/resultado.
- Responsividade (alunos):
  - `useStudents` e `useStudentById` passaram a usar seleção explícita de colunas e `refetchOnWindowFocus=false`;
  - reduz custo das consultas mais reutilizadas no app e evita refetch automático ao trocar de aba/janela.
- Responsividade (prescrições):
  - `usePrescriptions` passou a usar seleção explícita de colunas na listagem (sem `*`);
  - `usePrescriptions`, `usePrescriptionDetails` e `usePrescriptionAssignments` passaram a `refetchOnWindowFocus=false`;
  - reduz recargas automáticas ao alternar foco e melhora fluidez nas telas de prescrição/sessões.
- Filtro de sessões (timezone-safe):
  - `useAllSessions` deixou de usar `toISOString().split('T')[0]` para filtrar datas (risco de deslocar o dia em timezone UTC-3);
  - filtro agora usa formatação local estável `yyyy-MM-dd`, alinhando com a data escolhida no calendário.
- Responsividade/estabilidade Oura:
  - `useOuraMetrics` e `useLatestOuraMetrics` passaram a `refetchOnWindowFocus=false` para reduzir recargas automáticas ao alternar abas;
  - deduplicação em `useOuraMetrics` foi otimizada com `Map` por data (mesma regra funcional, menor custo em listas maiores).
  - hooks Oura auxiliares (`useLatestOuraAcuteMetrics`, `useOuraConnection`, `useOuraWorkouts`, `useOuraSyncLogs`) passaram a seleção explícita de colunas (sem `*`);
  - `useLatestOuraAcuteMetrics` também passou a `refetchOnWindowFocus=false` para reduzir refetch automático em navegação.
- Payload de leitura em módulos auxiliares:
  - `useEquipmentInventory`, `useBreathingProtocols`, `useRecoveryProtocols` e `useRecoveryProtocol` migrados para seleção explícita de colunas (sem `*`);
  - mantém comportamento funcional e reduz custo de serialização/leitura em telas de prescrição e recuperação.

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
  - Revalidação completa executada novamente em 2026-04-20 (sem regressão):
    - `npm run lint`
    - `npm run test -- --run` (106/106)
    - `npm run build`
    - `npx tsc --noEmit`
    - `npm audit --audit-level=high` (0 vulnerabilidades high/critical)

## Atualização de status (2026-04-20)
- Fluxo de geração de relatório foi endurecido para evitar falso positivo de sucesso:
  - `useGenerateReport` agora valida payload de resposta da edge function (`reportId` string e `status = completed`);
  - respostas parciais/inválidas agora quebram com erro explícito para UI, em vez de seguir como sucesso.
- Perfil do aluno (`StudentDetailPage`) agora formata datas de atribuição de prescrição com parser timezone-safe:
  - `start_date` e `end_date` usam `formatSessionDate(...)`;
  - evita regressão de exibir dia anterior/posterior em ambientes com timezone diferente.
- Lista de relatórios (`StudentReportsPage`) também passou a usar `formatSessionDate(...)` para `period_start/period_end`, alinhando o mesmo comportamento timezone-safe no fluxo de relatórios.
- Busca de prescrições endurecida:
  - mapeamento corrigido para `assigned_students_count` no resultado de busca (contagem de alunos consistente entre modo padrão e modo filtrado);
  - filtro `dayOfWeek` com trimming e pós-filtro determinístico no cliente (evita ambiguidade de múltiplos `.or(...)` no mesmo query builder).
- Adaptações de agenda endurecidas:
  - weekdays agora são deduplicados;
  - horário aceita apenas formato válido (`H:MM`, `HH:MM` ou `HH:MM:SS`) e normaliza para `HH:MM`.
- Catálogo de exercícios (UX/consistência):
  - busca agora ignora espaços em branco no início/fim para decidir filtro ativo (`searchTerm.trim()`), evitando estado de filtro “ativo” sem filtro real;
  - `boyle_score = 0` passa a renderizar no card técnico (antes era omitido por checagem truthy).
- Duplicidade de exercício (detecção):
  - comparação de similaridade no `useDuplicateExerciseCheck` passou a ser bidirecional (`candidate includes input` OU `input includes candidate`);
  - reduz falso negativo quando o nome digitado é mais detalhado que o já cadastrado.
- Horário de sessão (resiliência de apresentação):
  - `formatSessionTime` agora aceita sufixos de timezone em `HH:mm:ss` e retorna fallback seguro (`--:--`) para strings inválidas, em vez de truncar texto arbitrário;
  - suíte de teste ampliada para cobrir timezone suffix e formato inválido.
- Prescrição (busca/atribuição) endurecida em dois pontos:
  - `usePrescriptionSearch` agora mapeia corretamente `assigned_students_count` no modo de busca (antes retornava `assigned_count` e os cards podiam mostrar 0 aluno(s) indevidamente);
  - filtro de `dayOfWeek` foi movido para pós-processamento no cliente para evitar ambiguidade de múltiplos `.or(...)` no mesmo query builder.
- `sanitizeAssignmentScheduleAdaptations` agora valida horário com regra estrita (`HH:mm` ou `HH:mm:ss`) e normaliza hora de 1 dígito (`8:05` -> `08:05`), rejeitando horários inválidos.

## Atualização de status (2026-04-21)
- Hardening de input no endpoint `check-rate-limit`:
  - erros de cliente (`body` inválido, `action` ausente/inválida) deixaram de cair como `500` e agora retornam `400`;
  - mantém `401/403` para cenários de `increment + user_id` sem JWT válido.
- Cobertura de smoke de edge functions ampliada:
  - suíte `src/utils/__tests__/ouraIntegration.test.ts` expandida para cobrir também:
    - `oura-sync`
    - `oura-sync-test`
    - `validate-student-invite`
    - `create-student-from-invite`
    - `oura-callback`
    - `check-rate-limit`
- Oura sync com payload de merge mais enxuto:
  - removido `select('*')` no merge de `oura_metrics` e `oura_acute_metrics`;
  - seleção agora usa apenas as chaves efetivas do payload (`Object.keys(metrics|acuteMetrics)`), reduzindo custo e acoplamento a colunas não usadas.
- Ordem de validação de segurança padronizada:
  - `oura-sync` e `oura-sync-test` agora autenticam antes de validar payload (`student_id/date`);
  - resposta para chamadas sem token passa a ser `401` consistente, reduzindo exposição de validação interna para cliente não autenticado.
- Hardening de falhas silenciosas em edge functions:
  - `generate-student-report` agora valida explicitamente erro ao buscar padrões da `exercises_library` e métricas `oura_metrics` (falha com erro claro em vez de seguir silenciosamente);
  - `parse-word-prescription` agora trata erro no RPC `search_exercises_by_name` por exercício (log estruturado + fallback seguro para `matches=[]` naquele item).
- Hardening adicional no `ai-coach`:
  - removido `select('*')` em `athlete_goals` e `athlete_records` (colunas explícitas);
  - falhas de leitura de sessões/metas/records agora retornam erro explícito (sem seguir com contexto parcial silencioso para IA).
- Revalidação automática pós-lote:
  - `npm run lint` ✅
  - `npm run test -- --run` ✅
  - `npm run build` ✅
  - `npm run verify:essential` ✅
  - `VITE_RUN_OURA_INTEGRATION_TESTS=true npm run test -- src/utils/__tests__/ouraIntegration.test.ts --run` ✅ (33/33 no endpoint live)
- Otimização de payload em mutações/listas de alto tráfego:
  - `useStats` trocado de `select("*", { count, head })` para `select("id", { count, head })` em contadores de sessões;
  - `useWorkoutSessions` removeu `select()` amplo em `insert/update` e passou para `select(WORKOUT_SESSION_SELECT)`;
  - `useStudents` removeu `select()` amplo em `create/getOrCreate/update` e passou para `select(STUDENT_SELECT)`;
  - `useExercisesLibrary` removeu `select()` amplo em `create/update` e passou para `select(EXERCISES_LIBRARY_SELECT)`.
- Revalidação automática do lote acima:
  - `npm run lint` ✅
  - `npm run test -- --run` ✅
  - `npm run build` ✅
  - `npm run verify:essential` ✅
- Hardening adicional em edge functions (`select()` sem colunas):
  - `generate-student-invite`: insert de `student_invites` passou para `select('id, expires_at')`;
  - `generate-oura-connect-link`: insert de `student_invites` passou para `select('id, expires_at')`;
  - `oura-sync-test`: upsert em `oura_metrics` passou para `select('student_id, date, readiness_score, sleep_score, average_sleep_hrv, resting_heart_rate')`;
  - `create-student-from-invite`: `update/insert` em `students` passaram para `select('id')`.
- Revalidação automática do lote de edge functions:
  - `npm run lint` ✅
  - `npm run test -- --run` ✅
  - `npm run build` ✅

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

## Lote adicional de hardening (frontend queries)
- Eliminação dos `select("*")` restantes no frontend para reduzir payload, acoplamento a schema e risco de regressão por coluna nova.
- Sessões/Histórico:
  - `useExerciseHistory`: select explícito para `exercises`.
- Relatórios:
  - `useStudentReports`: select explícito para `student_reports` e `report_tracked_exercises` (lista, detalhe e exercícios rastreados).
- Alunos:
  - `useStudents` (`useGetOrCreateStudent`): retorno de aluno padronizado com `STUDENT_SELECT`.
- Pastas/Prescrições:
  - `useFolders`: select explícito de `prescription_folders`.
  - `usePrescriptions`: selects explícitos para `prescriptions` (detalhe), `prescription_exercises` e `exercise_adaptations`.
- Oura:
  - `useOuraMetrics`: select explícito para `oura_metrics` (lista e latest).
- Admin:
  - `AdminUsersPage`: select explícito de `trainer_profiles`.
- AI Builder:
  - `useAIBuilderChat`: remoção dos dois `select("*")` restantes com selects explícitos em conversas/mensagens;
  - `useAIBuilderConversations` e `useAIBuilderMessages` com `refetchOnWindowFocus: false`.

### Validação deste lote
- `rg` sem ocorrência de `select("*")` em `src/hooks`, `src/pages` e `src/components`.
- `eslint` (arquivos alterados): PASS.
- `tsc --noEmit`: PASS.
- `vitest --run`: PASS.
- `vite build`: PASS.

## Lote adicional de hardening (responsividade de leitura)
- Padronização de `refetchOnWindowFocus: false` em hooks críticos que ainda refaziam leitura ao trocar foco da aba:
  - `useExerciseLoadHistory`
  - `useExerciseHistory`
  - `useExerciseLastSession`
  - `useOuraTrends`
  - `useOuraBaseline`
  - `useStats`
  - `useStudentDetail` (3 queries do módulo)
  - `useOuraConnectionStatus`
  - `useWeeklyMovementBalance`
  - `useWorkouts` e `useWorkoutsPaginated`
  - `useSessionDetail`
  - `useLoadSuggestions`
- Objetivo: reduzir recarregamentos desnecessários ao alternar abas/janelas, mantendo refresh por invalidação explícita já existente nas mutações.

## Lote adicional de hardening (datas locale-safe)
- Removidos usos críticos de `toISOString().split('T')[0]` no frontend para evitar desvio de dia por timezone em:
  - defaults de formulário de sessão (`RecordIndividualSessionDialog`, `AddWorkoutSessionDialog`, `RecordGroupSessionDialog`, `AddWorkoutDialog`);
  - filtros e limites de data (`SessionSetupForm`, `ProtocolRecommendationsCard`, `StudentOverviewDashboard`);
  - hooks de leitura (`useStudentDetail`, `useStats`).
- Padrão aplicado: `format(new Date(), "yyyy-MM-dd")` (date-fns), mantendo comportamento estável em timezone local.
- Resíduo eliminado no utilitário de dados de teste:
  - `populateTestSessions`: geração de data migrou para `format(date, "yyyy-MM-dd")`.

## Lote adicional de hardening (protocol recommendations query)
- `useProtocolRecommendations` migrou de select amplo (`*`) para projeção explícita:
  - colunas necessárias de `protocol_recommendations`;
  - nested select explícito de `recovery_protocols`.
- Objetivo: reduzir payload e estabilizar contrato de dados sem alterar comportamento funcional.

## Lote adicional de hardening (student detail query)
- `useStudentDetail`:
  - `useStudentPrescriptions`: select explícito de `prescription_assignments` e nested mínimo de `workout_prescriptions`;
  - `useSessionsWithExercises`: select explícito para sessões e exercícios usados no dashboard/tab de sessões.
- Objetivo: reduzir dados carregados na página do aluno mantendo os mesmos campos consumidos na UI.

## Lote adicional de hardening (logging runtime)
- Remoção de `console.*` diretos em runtime (fora do logger central):
  - `AdminRoute`
  - `ImportSessionsDialog`
  - `prescriptionCreateUtils`
  - `useWorkoutSessions`
- Padrão aplicado: `logger.error`/`logger.warn` centralizado para manter sanitização e consistência de observabilidade.

## Lote adicional de hardening (casts frágeis em prescrição/sessão)
- `useExercisesLibrary`:
  - contrato tipado ampliado com `functional_group` e `numeric_level`;
  - projeção SQL explícita atualizada para incluir esses campos.
- `CreatePrescriptionDialog` e `EditPrescriptionDialog`:
  - remoção de casts `as unknown as Record<string, unknown>` para leitura de `functional_group` e `numeric_level`;
  - uso direto de propriedades tipadas do exercício da biblioteca.
- `EditPrescriptionDialog`:
  - normalização de `prescription_type` sem cast duplo (fallback explícito para `group`).
- `useWorkoutSessions`:
  - remoção de `as unknown as WorkoutSessionRow` no retorno de RPC de criação de sessão.
- `usePrescriptions`:
  - simplificação de cast de `custom_adaptations` para `Json | null` sem cast duplo.

### Validação deste lote
- `eslint` (arquivos alterados): PASS.
- `tsc --noEmit`: PASS.
- `vitest --exclude src/utils/__tests__/ouraIntegration.test.ts`: PASS (98 testes).
- `npm run build`: PASS.

## Lote adicional de hardening (estabilidade dos testes de integração Oura)
- `src/utils/__tests__/ouraIntegration.test.ts`:
  - testes continuam rodando automaticamente em CI;
  - ambiente local passa a exigir opt-in explícito via `VITE_RUN_OURA_INTEGRATION_TESTS=true`.
- Gate adotado:
  - `SHOULD_RUN_INTEGRATION = SUPABASE_URL + ANON_KEY + (CI || RUN_LOCAL_INTEGRATION)`.

### Motivo
- Evitar falso negativo local por indisponibilidade de DNS/rede externa no executor.
- Preservar cobertura de integração no pipeline CI (onde `CI=true`).

### Validação deste lote
- `eslint`: PASS.
- `npm run test -- --run`: PASS (98 testes) + 12 testes de integração Oura `skipped` localmente.
- `npm run build`: PASS.

## Lote adicional de hardening (cobertura de auth smoke em edge functions críticas)
- `src/utils/__tests__/ouraIntegration.test.ts` ampliado para cobrir mais endpoints sensíveis:
  - `generate-group-session`
  - `parse-word-prescription`
  - `generate-student-report`
- Para cada endpoint, adicionados cenários:
  - sem `Authorization` (espera 401);
  - `Bearer ANON_KEY` (espera não-2xx);
  - token forjado (espera não-2xx).

### Impacto
- Reduz risco de regressão de auth em funções críticas que estavam sem smoke de segurança.
- Mantém estratégia CI/local já definida:
  - roda em CI automaticamente;
  - local via opt-in (`VITE_RUN_OURA_INTEGRATION_TESTS=true`).

### Validação deste lote
- `eslint` (teste alterado): PASS.
- `npm run test -- --run`: PASS (98) + `21 skipped` localmente para integração.
- `npm run build`: PASS.

## Lote adicional de hardening (remoção de `select("*")` em edge functions de segurança/recuperação)
- `supabase/functions/check-rate-limit/index.ts`
  - `rate_limit_attempts` passou de `select("*")` para:
    - `id, attempt_count, first_attempt_at, blocked_until`
- `supabase/functions/generate-protocol-recommendations/index.ts`
  - `oura_metrics` passou de `select("*")` para:
    - `id, student_id, date, readiness_score, sleep_score, hrv_balance, resting_heart_rate, temperature_deviation, activity_balance`
  - `adaptation_rules` passou de `select("*")` para:
    - `id, metric_name, condition, threshold_value, action_type, severity, description`

### Impacto
- Menor acoplamento a mudanças de schema.
- Menor payload em edge functions com tráfego recorrente.
- Sem alteração de regra de negócio (somente projeção de colunas necessárias).

### Validação deste lote
- `eslint` (arquivos alterados): PASS.
- `tsc --noEmit`: PASS.
- `npm run test -- --run`: PASS (98) + integração local `skipped`.
- `npm run build`: PASS.
- `npm run verify:essential`: PASS.

## Lote adicional de hardening (AI Builder erro silencioso)
- `AIBuilderPage` tinha `catch {}` silencioso ao criar nova conversa.
- Ajuste aplicado:
  - exibição de feedback explícito (`notify.error`) com parsing padronizado (`buildErrorDescription`) quando a criação falha.
- Objetivo: evitar falha sem retorno visual no fluxo de uso do AI Builder.

### Validação deste lote
- `eslint` (arquivo alterado): PASS.
- `tsc --noEmit`: PASS.
- `vitest --exclude src/utils/__tests__/ouraIntegration.test.ts`: PASS (98 testes).
- `npm run build`: PASS.

## Lote adicional de hardening (catch silencioso em fluxos críticos de UI)
- Substituídos `catch {}` por captura explícita + `logger.warn(...)` em:
  - `AssignPrescriptionDialog` (atribuição de prescrição);
  - `GenerateReportDialog` (geração de relatório);
  - `GenerateGroupSessionDialog` (geração de mesociclo);
  - `EditExerciseLibraryDialog` (edição de exercício);
  - `ExerciseFirstSessionEntry` (salvamento de sessão inicial).
- Comportamento funcional preservado:
  - feedback ao usuário continua vindo dos `onError`/handlers existentes;
  - adicionada apenas rastreabilidade para diagnóstico em caso de falha.

### Validação deste lote
- `eslint` (arquivos alterados): PASS.
- `tsc --noEmit`: PASS.
- `vitest --exclude src/utils/__tests__/ouraIntegration.test.ts`: PASS (98 testes).
- `npm run build`: PASS.

## Lote adicional de hardening (oura-sync parse resiliente)
- `supabase/functions/oura-sync/index.ts`:
  - `safeJson` passou a tratar falha de parse JSON por endpoint (degrada para `null` + warning), em vez de derrubar a sync inteira via `Promise.all`.
  - Endpoints now tagged no warning (`daily_readiness`, `daily_sleep`, `sleep`, `heartrate`, `daily_activity`, `workout`, `daily_stress`, `daily_spo2`, `vO2_max`, `daily_resilience`).
- Impacto esperado:
  - menor chance de erro 500 por payload inválido/inesperado em um único endpoint;
  - maior resiliência de sync parcial sem perder dados válidos dos demais endpoints.

### Validação deste lote
- `eslint` (arquivo alterado): PASS.
- `tsc --noEmit`: PASS.
- `vitest --exclude src/utils/__tests__/ouraIntegration.test.ts`: PASS (98 testes).
- `npm run build`: PASS.

## Lote adicional de hardening (Auth Debug gate consistente)
- Corrigida inconsistência de flag do painel de debug de autenticação:
  - `App.tsx` validava `VITE_ENABLE_AUTH_DEBUG === "1"`;
  - `AuthDebugPanel.tsx` validava `VITE_ENABLE_AUTH_DEBUG === "true"`.
- Implementado util único `isAuthDebugEnabled()` em `src/utils/authDebug.ts`:
  - aceita `"1"` e `"true"`;
  - exige `DEV`, `localhost` e query param `authDebug=1`.
- `App.tsx` e `AuthDebugPanel.tsx` passam a usar a mesma regra.

### Validação deste lote
- `eslint` (arquivos alterados): PASS.
- `tsc --noEmit`: PASS.
- `vitest --exclude src/utils/__tests__/ouraIntegration.test.ts`: PASS (98 testes).
- `npm run build`: PASS.

## Lote adicional de hardening (remoção de casts frágeis em edge functions críticas)
- `supabase/functions/generate-student-report/index.ts`:
  - removidos casts `as unknown as` em `student`, `existingReports`, `trackedExerciseRows`, `sessions`, `ouraMetricsRaw`;
  - adicionadas funções de parse/validação de shape:
    - `parseStudentRow`
    - `parseReportWindowRow`
    - `parseExerciseLibraryRow`
    - `parseSessionExerciseRow`
    - `parseSessionRow`
    - `parseOuraMetricsRow`
  - adicionada guarda para payload inesperado de `report.id`.
- `supabase/functions/create-student-from-invite/index.ts`:
  - removido cast `rawExisting as unknown as InviteRow`;
  - adicionada função `parseInviteRow` com validação explícita de shape.

### Impacto
- Menor risco de erro silencioso ou comportamento indefinido quando o Supabase retornar payload com shape inesperado.
- Fluxos funcionais preservados; alterações são de validação e segurança de tipo em runtime.

### Validação deste lote
- `eslint` (arquivos alterados): PASS.
- `tsc --noEmit`: PASS.
- `vitest --exclude src/utils/__tests__/ouraIntegration.test.ts`: PASS (98 testes).
- `npm run build`: PASS.
