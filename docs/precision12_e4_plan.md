# Precision 12 — E4 Coach Console / KPIs: Plano de Implementação

**Status:** pronto para implementar em PRs pequenos.  
**Escopo desta etapa:** planejamento E4 após fechamento do E3. Sem migration, UI ou edge function neste documento.

## Resumo executivo

E4 deve transformar os dados do Precision 12 em uma superfície operacional para o coach/admin: quem precisa de ação, quais alunos estão bloqueados por PAR-Q, quais questionários estão pendentes, quais avaliações estão incompletas e qual é o progresso de cada aluno no ciclo Precision 12.

A recomendação é **não criar uma página nova agora**. O app já tem `CoachConsole` no menu experimental/admin e já tem a aba `Avaliações` no detalhe do aluno. O E4 MVP deve evoluir o `CoachConsole` existente para ter uma aba/área **Precision 12**, mantendo o detalhe profundo no `StudentDetailPage`.

Implementação recomendada: **read-only primeiro**, usando as tabelas existentes e React Query. Só criar RPC/view se a consulta cross-student ficar pesada ou se a RLS impedir a leitura consolidada.

## Estado atual usado como base

### Superfícies existentes

- `src/pages/CoachConsole.tsx`: página admin existente, hoje focada em AI Coach, Analista e Relatório.
- `src/components/assessments/AssessmentsTab.tsx`: lista avaliações por aluno, filtra por categoria e abre wizard/drawer.
- `src/components/assessments/AssessmentDetailSheet.tsx`: drawer read-only por avaliação, incluindo questionário e `parq_blocked`.
- `src/components/assessments/CreateAssessmentWizard.tsx`: cria avaliações coach-administered e gera link do questionário.
- `src/hooks/useAssessments.ts`: hooks para listar avaliações por aluno, abrir detalhe e criar avaliação via RPC.

### Dados disponíveis hoje

Tabelas principais:

- `assessments`
- `questionnaire_responses`
- `precision12_questionnaire_links`
- `vo2_assessment_details`
- `vo2_bike_stages`
- `handgrip_results`
- `dexa_results`
- `sit_to_stand_results`
- `cardiovascular_baseline`
- `subjective_scores`
- `students`

Status de avaliação:

- `in_progress`: criado, ainda incompleto ou aguardando resposta.
- `completed`: avaliação concluída.
- `blocked`: questionário concluído com PAR-Q positivo.
- `aborted`: avaliação abortada.

Tipos Precision 12:

- `vo2_bike_max`
- `vo2_bike_submax`
- `vo2_treadmill_walk_submax`
- `vo2_treadmill_run_submax`
- `vo2_treadmill_run_max`
- `handgrip`
- `dexa`
- `sit_to_stand`
- `questionnaire_precision12`

Dados de questionário úteis para E4:

- `parq_blocked`
- `primary_adherence_barrier`
- `weekly_frequency`
- `training_available_days`
- `external_training_resources`
- `uses_medications`
- `medications_continuous`
- `has_medical_condition`
- `medical_condition_details`
- `injury_surgery_history`
- `pain_status`
- `pain_location`
- `sleep_quality`
- `stress_level`
- `energy_level`
- `fitness_self_rating`
- `body_satisfaction`
- `consistency_self_rating`
- `life_stability`
- `deal_breaker`

## E4 MVP obrigatório

### 1. Visão global Precision 12 no Coach Console

Adicionar uma seção/aba `Precision 12` dentro de `CoachConsole`.

KPIs mínimos:

- **Alunos Precision 12 ativos**: alunos com `program_tier = 'precision_12'` ou com pelo menos uma assessment Precision 12 recente.
- **Questionários pendentes**: `assessment_type='questionnaire_precision12'` + `status='in_progress'` + sem row em `questionnaire_responses`.
- **PAR-Q bloqueados**: `assessment_type='questionnaire_precision12'` + `status='blocked'` ou `questionnaire_responses.parq_blocked=true`.
- **Avaliações incompletas**: `status='in_progress'` para qualquer tipo Precision 12.
- **Avaliações completas no ciclo**: count `status='completed'` por aluno.

### 2. Fila de ação do coach

Uma tabela/lista priorizada com cards ou linhas.

Prioridade recomendada:

1. PAR-Q bloqueado.
2. Questionário enviado e ainda pendente.
3. Avaliação presencial iniciada e incompleta.
4. DEXA sem PDF/conclusão.
5. Aluno Precision 12 sem nenhuma avaliação.
6. Risco de adesão alto pelo questionário.

Campos por linha:

- Aluno
- Tipo de alerta
- Status
- Data da assessment
- Idade do item ou tempo pendente
- CTA primário: abrir aluno na aba Avaliações
- CTA secundário: abrir drawer da assessment quando houver `assessment_id`

### 3. Progresso por aluno

Mostrar, por aluno, a cobertura por **categoria de avaliação**, não por tipo. Os 9 tipos Precision 12 se agrupam em **5 categorias** — o app já faz esse mapeamento em `ASSESSMENT_TYPE_METADATA[type].category` (reusar, não recriar):

- **VO₂** — satisfeita por qualquer um dos 5 tipos `vo2_*`. O aluno faz um protocolo, não os cinco; não somar as variantes.
- **Força** — `handgrip`
- **Composição** — `dexa`
- **Funcional** — `sit_to_stand`
- **Anamnese** — `questionnaire_precision12`

Cardiovascular/subjetivo entra como contexto adicional quando existir, fora da base de 5.

Regra MVP de progresso:

- Base = **5 categorias** (reusar `ASSESSMENT_TYPE_METADATA[].category`), não 9 tipos.
- Uma categoria conta como **feita** se tem ao menos uma assessment `completed` daquele grupo.
- `blocked` conta como respondido, mas exige ação clínica.
- `in_progress` conta como pendente.
- `aborted` não conta como feito.

Não tentar ainda definir “programa completo” clinicamente. Isso fica para E5/E6.

### 4. Alertas derivados do questionário

Derivações read-only, recomputadas em runtime:

- **PAR-Q bloqueado**: `parq_blocked = true`.
- **Possível risco de adesão** se pelo menos 2 flags:
  - `primary_adherence_barrier in ('time','energy_fatigue','motivation','pain_discomfort','lack_of_results')`
  - `sleep_quality <= 5`
  - `stress_level >= 7`
  - `energy_level <= 4`
  - `consistency_self_rating` baixa
  - `life_stability` baixa
  - `pain_status != 'none'`
- **Atenção clínica**:
  - `uses_medications = true`
  - `has_medical_condition = true`
  - `injury_surgery_history` preenchido
  - `pain_status != 'none'`

Esses alerts devem ser microcopy operacional, não diagnóstico.

Exemplo de wording:

- “Revisar antes de liberar treino intenso.”
- “Aluno reportou medicação contínua.”
- “Possível risco de adesão: barreira principal + sono/energia.”

Evitar:

- “diagnóstico”
- “risco médico” como afirmação clínica
- recomendações prescritivas automáticas

## E4 opcional

Deixar para depois do MVP, se houver tempo:

- Busca por aluno/status/tipo.
- Filtro por coach/admin.
- Export CSV da fila.
- Badges de tempo pendente: 24h, 3d, 7d.
- Deep link direto para abrir `AssessmentDetailSheet` por query param.
- Ação “reenviar link” direto da fila.
- Ação “marcar abortada” direto da fila.
- Gráfico de distribuição por status.

## Fora de escopo E4

Não fazer em E4:

- Relatórios PDF Precision 12. Isso é E6.
- Evidence layer/cards clínicos completos. Isso é E5.
- Motor IA interpretando todas as respostas. Isso é E5/E6.
- Edição de respostas do questionário.
- Automação de decisão clínica.
- Novas migrations de schema sem necessidade comprovada.
- Student-facing dashboard.

## Backend necessário

### Caminho recomendado para MVP

Começar sem migration e sem RPC:

1. Buscar alunos visíveis ao usuário atual.
2. Buscar `assessments` desses alunos.
3. Buscar `questionnaire_responses` por `assessment_id` relevante.
4. Buscar `precision12_questionnaire_links` por `assessment_id` relevante quando precisar calcular link pendente/revogado/usado.
5. Montar KPIs e filas no client via funções puras.

Vantagens:

- Menor risco de RLS/SECURITY DEFINER.
- Mais rápido para validar UX.
- Sem acoplamento prematuro a uma view/RPC.

### Quando criar RPC/view

Criar RPC `list_precision12_coach_console()` apenas se uma dessas condições acontecer:

- A tela precisa carregar muitos alunos e ficar lenta.
- RLS impede leitura consolidada de alguma tabela mesmo para coach/admin.
- A query client-side virar N+1 difícil de manter.
- Precisar calcular contagens confiáveis no banco para admin global.

Se criar RPC:

- Preferir `SECURITY INVOKER` se a RLS normal já resolver.
- Se precisar `SECURITY DEFINER`, restringir GRANT e validar `auth.uid()` + role admin/ownership explicitamente.
- Não expor token puro nem `token_hash` em payload de UI.
- Não retornar dados sensíveis além do necessário para fila/KPIs.

## Arquitetura proposta

### Arquivos novos

- `src/hooks/usePrecision12CoachConsole.ts`
- `src/utils/precision12CoachConsole.ts`
- `src/utils/__tests__/precision12CoachConsole.test.ts`
- `src/components/precision12/Precision12Console.tsx`
- `src/components/precision12/Precision12KpiCards.tsx`
- `src/components/precision12/Precision12ActionQueue.tsx`
- `src/components/precision12/Precision12StudentProgressTable.tsx`

### Arquivos alterados

- `src/pages/CoachConsole.tsx`: adicionar aba/seção Precision 12, sem quebrar abas AI existentes.
- `src/constants/navigation.ts`: idealmente renomear no menu depois, mas não obrigatório no MVP.

### Query keys

- `['precision12', 'coach-console']`
- `['precision12', 'coach-console', 'students']` se separar fetches.
- Reaproveitar invalidações existentes de assessments quando o usuário cria link/assessment no detalhe do aluno.

### Estados de UI

- Loading skeleton para KPIs + tabela.
- Empty state: “Nenhum aluno Precision 12 encontrado.”
- Error state com retry.
- Fila vazia: “Nenhuma ação pendente.”

### Permissões

Hoje `CoachConsole` fica atrás de `AdminRoute`. Para MVP, manter assim.

Decisão futura: se trainers não-admin também precisarem do console, mover a rota para `ProtectedRoute` e limitar dados pela RLS de `students.trainer_id`. Não fazer essa mudança junto com E4 MVP sem decisão explícita.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---:|---|
| Query cross-student pesada no client | Médio | MVP com limite razoável; criar RPC se necessário |
| RLS bloqueia leitura de links/questionnaire em alguma conta | Médio | Smoke com admin e, se aplicável, trainer não-admin |
| Coach interpreta alertas como diagnóstico | Alto | Microcopy explícita: triagem/sinal operacional, não diagnóstico |
| KPIs contaminados por dados antigos/smoke | Baixo agora | Cleanup 14/05 concluído; 13/05 legados revisáveis à parte |
| `program_tier` incompleto em alunos antigos | Médio | Fallback: aluno entra na lista se tem assessment Precision 12 |
| Reissue/links ativos confundem pendência | Baixo | Usar status da assessment como fonte primária; links só como contexto |

## Plano de implementação em PRs pequenos

### PR E4.1 — Derivações e hook read-only

Verificar antes de escrever (de-risca o PR):

- **RLS**: conferir as policies de `questionnaire_responses` e `precision12_questionnaire_links` — confirmar que coach/admin consegue leitura consolidada. Se bloquear, parar e reavaliar RPC antes de seguir.
- **Progresso por categoria**: `deriveStudentProgress` mede contra as **5 categorias** (ver seção 3), não contra 9 tipos. VO₂ satisfeita por qualquer `vo2_*`.
- **"DEXA sem PDF" na fila**: esclarecer a regra antes de codar `deriveActionQueue` — uma DEXA `in_progress` já cai em "avaliação incompleta". "DEXA sem PDF/conclusão" só vale pra DEXA fora de `in_progress` com `dexa_results.scan_pdf_url`/`conclusion_text` nulos. Não duplicar o mesmo aluno em duas linhas.

Escopo:

- Criar funções puras em `precision12CoachConsole.ts`:
  - `deriveAssessmentStatusCounts`
  - `deriveStudentProgress` — base = 5 categorias (ver seção 3)
  - `deriveQuestionnaireAlerts`
  - `deriveActionQueue`
- Criar testes unitários com fixtures simples.
- Criar `usePrecision12CoachConsole` com fetch read-only — usar queries **bulk `.in()`** (uma para os assessments de todos os alunos visíveis, uma para `questionnaire_responses` por `assessment_id`, uma para `precision12_questionnaire_links` quando necessário). Não fazer fetch por aluno em loop — evita o N+1 que a tabela de riscos aponta.
- Sem UI grande ainda.

Gates:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test -- --run`

### PR E4.2 — UI Precision 12 no CoachConsole

Escopo:

- Adicionar `Precision12Console` ao `CoachConsole`.
- KPIs + fila de ação + progresso por aluno.
- CTAs para abrir `/alunos/:id`.
- Manter AI Coach/Analyst/Report intactos.

Gates:

- lint, typecheck, tests, build.
- Smoke visual no Lovable: admin vê a aba, KPIs renderizam, CTAs funcionam.

### PR E4.3 — Ajustes operacionais pós-smoke

Escopo provável:

- Filtros/status.
- Copy/microcopy.
- Performance se necessário.
- Eventual RPC se o MVP client-side não sustentar.

Só abrir se o smoke do E4.2 apontar necessidade.

## Critérios de aceite do E4 MVP

- Coach/admin abre Coach Console e vê uma seção Precision 12.
- KPIs carregam sem erro.
- PAR-Q bloqueados aparecem como prioridade máxima.
- Questionários pendentes aparecem com data e aluno.
- Avaliações incompletas aparecem na fila.
- Progresso por aluno mostra cobertura por tipo.
- Clique leva ao detalhe do aluno/aba Avaliações.
- Nenhuma action mutável é criada no MVP.
- Nenhum token/hash de link aparece na UI.
- Build/testes verdes.

## GO/NO-GO

**GO para E4.1.**

Motivo: E3 está operacional e o cleanup dos dados de smoke de 14/05 foi concluído. O próximo incremento de maior valor é dar ao coach uma fila operacional read-only antes de avançar para evidence/PDF.

**Condição:** se durante E4.1 ficar claro que a leitura client-side gera N+1 pesado ou falha por RLS, parar e trocar para RPC/view antes de construir UI em cima de uma base instável.
