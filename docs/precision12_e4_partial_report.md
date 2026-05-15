# Precision 12 — Relatório de conclusão parcial (E4.1 → E4.3b)

Data: 2026-05-15
Branch / SHA na elaboração: `main` @ `bf78922`
Status: **E4 read-only entregue e funcional em produção até E4.3b.**

---

## 1. Resumo executivo

O Coach Console agora expõe uma tab **Precision 12** completa em modo
read-only. O coach consegue, sem mutar nada, ter panorama dos alunos do
programa, ver fila de ação priorizada, conferir cobertura por categoria
e navegar direto pro contexto certo do aluno.

Quatro entregas mergeadas e em produção:

| Etapa | Foco | Estado |
|---|---|---|
| **E4.1** | Derivações puras + hook read-only | ✅ live |
| **E4.2** | UI do Coach Console (KPIs, fila, tabela) | ✅ live |
| **E4.3a** | Filtros operacionais (busca, tipo, status, smoke toggle) | ✅ live |
| **E4.3b** | Deep-links read-only fila/tabela → aluno → drawer | ✅ live |

Smoke visual em https://move-progress-log.lovable.app validado em todas
as quatro etapas. Zero migration, zero RPC, zero edge function, zero
mutation introduzida pelo E4 até aqui.

---

## 2. PRs / SHAs

| Etapa | PR | Commit em `main` |
|---|---|---|
| Plano E4 (doc) | [#135](https://github.com/Alex-Griebeler/move-progress-log/pull/135) | `98cf7bb` |
| Fix pré-E4.1 (`REISSUABLE_STATUSES`) | [#136](https://github.com/Alex-Griebeler/move-progress-log/pull/136) | `fec8e78` |
| **E4.1** derivações + hook | [#137](https://github.com/Alex-Griebeler/move-progress-log/pull/137) | `bf509de` |
| **E4.2** UI Coach Console | [#138](https://github.com/Alex-Griebeler/move-progress-log/pull/138) | `46eaac7` |
| **E4.3a** filtros + smoke toggle | [#139](https://github.com/Alex-Griebeler/move-progress-log/pull/139) | `d23484c` |
| **E4.3b** deep-links read-only | [#140](https://github.com/Alex-Griebeler/move-progress-log/pull/140) | `bf78922` |

Repositório: https://github.com/Alex-Griebeler/move-progress-log

---

## 3. Funcionalidades entregues

### KPIs globais (E4.2)
Cinco cards no topo da tab Precision 12, sempre globais — não respondem
a filtros, propositalmente, pra preservar panorama enquanto o coach
investiga subconjuntos:

- Alunos Precision 12
- PAR-Q bloqueados
- Questionários pendentes
- Avaliações em andamento
- Avaliações concluídas

### Fila de ação read-only (E4.2)
Tabela priorizada (priority asc, depois data asc) com 5 tipos de alerta:

| Prio | Tipo | Trigger |
|---|---|---|
| 1 | `parq_blocked` | Questionário com `status='blocked'` ou `response.parq_blocked=true` |
| 2 | `questionnaire_pending` | Questionário `in_progress` sem `response` ainda |
| 3 | `assessment_incomplete` | Avaliação presencial `in_progress` |
| 5 | `student_no_assessment` | Aluno Precision 12 sem nenhuma avaliação no ciclo |
| 6 | `adherence_risk` | Questionário respondido com ≥ 2 flags de risco (cortes 1–5) |

(Prioridade 4 — DEXA sem PDF/conclusão — não implementada; ver §6.)

### Tabela de progresso por aluno (E4.2)
Uma linha por aluno × 5 colunas de categoria (VO₂ / Força / Composição
/ Funcional / Anamnese) com ícones de status: `done`/`blocked`/`pending`
/`missing`. Coluna final mostra X/5 de categorias completas.

### Filtros (E4.3a)
Quatro superfícies de filtro que recortam **fila + tabela** sem afetar
KPIs:

- **Busca por nome** — diacritic/case-insensitive (`João` ≡ `JOAO`).
- **Tipo de alerta** — filtro só na fila; tabela intacta.
- **Status de progresso** — filtro só na tabela (`Sem categoria
  completa`, `Anamnese feita`, `PAR-Q bloqueado na fila`); fila
  intacta.
- **Ocultar dados de teste** — toggle ligado por padrão; oculta alunos
  com nome em `SMOKE *`, `TEST *`, `[TEST] *` ou substring `SMOKE E3`.

Quando o toggle está ativo e há smoke pra esconder, aparece banner
contextual: *"Dados de teste ocultos: N alunos. Use o toggle pra
exibi-los."*

Filter-empty é distinguido de real-empty:
- Fila com filtro vazio: *"Nenhuma ação corresponde aos filtros atuais."*
- Tabela com filtro vazio: *"Nenhum aluno corresponde aos filtros atuais."*

### Deep-links read-only (E4.3b)

**Da fila** (CTA "Abrir" em item com `assessmentId`):
```
/alunos/<studentId>?tab=assessments&assessmentId=<uuid>
```

**Da tabela** (CTA "Abrir" em linha de aluno):
```
/alunos/<studentId>?tab=assessments
```

Comportamento no destino:
- **StudentDetailPage** lê `?tab=` no primeiro render via `useState`
  lazy initializer; whitelist de 7 tabs conhecidas; fallback pra
  `training` quando ausente ou inválido.
- **AssessmentsTab** lê `?assessmentId=` via `useEffect` ref-guardado
  após os assessments carregarem. Defensivo: valida `assessmentId`
  contra a lista carregada do aluno antes de abrir o sheet. UUID
  inexistente é silenciosamente ignorado, sem fetch desnecessário,
  sem crash.
- **Drawer (`AssessmentDetailSheet`)** abre automaticamente quando o
  `assessmentId` é validado. Fechar o drawer não dispara reabertura
  (ref-guard `deepLinkApplied`).
- URL não é reescrita quando o usuário troca de tab — sync
  unidirecional, propositalmente minimal.

---

## 4. Evidência dos smokes

Smokes executados no app publicado (Lovable) após cada Publish/Update.

### E4.2 — GO pleno
- Tab Precision 12 renderiza KPIs, fila, tabela
- Tabs antigas (AI Coach, Analista, Relatório) intactas
- Bundle `CoachConsole-D7BIec6K.js` servido

### E4.3a — GO pleno
- Bundle novo `CoachConsole-D321YNc0.js`
- Bloco "FILTROS" visível acima da fila
- Toggle "Ocultar dados de teste" ON por padrão → SMOKE E3.6 oculto
- Banner "Dados de teste ocultos: 2 alunos" presente
- KPIs intactos em todos os estados de filtro (4 / 1 / 2 / 2 / 3)
- Busca `Alex` filtra fila + tabela; `zzzzzz` mostra microcopy
  filter-empty distinta em cada superfície
- Tipo de alerta = `PAR-Q bloqueado` → fila esvazia, tabela intacta
- Status de progresso = `Sem categoria completa` → tabela esvazia
  (Alex e Ana Paula têm Anamnese done, 1/5), fila intacta
- Toggle OFF → SMOKE volta; toggle ON novamente → SMOKE some
- Tabs antigas intactas

### E4.3b — GO pleno
- Bundle novo `CoachConsole-BYOcU1pP.js`
- CTA fila → URL real:
  `/alunos/2b6c306b-10d7-4a4a-928a-76396bae9f3d?tab=assessments&assessmentId=af856529-f4a7-4d0e-a9f2-398f0cfbebfc`
- Tab Avaliações aberta automaticamente
- Drawer "Questionário Precision 12" aberto automaticamente
- Fechar drawer (×) → não reabriu
- CTA tabela → URL real:
  `/alunos/f8c2ae99-037f-4769-ad66-567d8eb3f70d?tab=assessments`
- Tab Avaliações aberta, drawer NÃO abriu (esperado)
- URL manual `?tab=invalid` → fallback pra tab Treinamento, sem crash
- URL manual `?assessmentId=00000000-0000-0000-0000-000000000000`
  → tab Avaliações abre, drawer NÃO abre (guard defensivo), sem fetch
  com `id=eq.<fake>`, sem crash

### Console / network (smoke E4.3b)
- `read_console_messages` com `onlyErrors: true` → "No console errors
  or exceptions found for this tab."
- 102 resources, **0 com status ≥ 400** (introspectado via Resource
  Timing API + `responseStatus`).
- 7 chamadas Supabase REST, todas **GET 200** (bulk `.in()` pattern do
  hook E4.1 preservado).
- Único POST observado: `/~api/analytics` (telemetria interna do
  Lovable, não dado de aplicação).
- **Zero PATCH / PUT / DELETE.**

---

## 5. Garantias de escopo (E4.1 → E4.3b)

| Restrição | Status |
|---|---|
| Zero migration adicionada por E4 | ✅ (sem arquivo em `supabase/migrations/` no diff acumulado) |
| Zero RPC introduzida | ✅ (nenhuma chamada `supabase.rpc(...)` adicionada) |
| Zero edge function adicionada por E4 | ✅ (PR #136 foi um *fix* a uma edge existente, não introdução) |
| Zero mutation de dados | ✅ (sem `useMutation`, sem `.insert/.update/.delete/.upsert` adicionados) |
| Sem nova dependência | ✅ (apenas APIs já instaladas: react, react-router-dom, supabase-js, shadcn) |
| Sem quebra de rotas existentes | ✅ (whitelist defensiva + comportamento default preservado) |
| Tabs antigas do Coach Console preservadas | ✅ (AI Coach, Analista, Relatório intactas) |

Acesso continua admin-only via `AdminRoute`. RLS de `assessments`,
`questionnaire_responses` e `precision12_questionnaire_links` libera
leitura consolidada pro admin — nenhuma `SECURITY DEFINER` foi
necessária no MVP.

---

## 6. Pendências não iniciadas

Itens explicitamente fora do escopo desta fase parcial:

- **E4.3c** — refinamentos adicionais de UI / saved filters / deep-link
  bidirecional (sync URL ↔ clicks de tab).
- **Reissue UI** — botão / fluxo para o coach reenviar link de
  questionário a partir da fila. Continua sendo uma *ação mutável* e
  requer decisão de produto + confirmação UX.
- **DEXA #4** — prioridade #4 do plano original (DEXA com PDF/conclusão
  faltando). Exige decisão de schema (`dexa_results` tem campo PDF? Ou
  conclusão estruturada?) antes de virar regra de alerta.
- **Ações operacionais mutáveis em geral** — marcar avaliação como
  abortada, alterar status de alunos, etc.
- **RPC consolidada** — só se a escala apertar (ver §7).

---

## 7. Riscos / decisões pendentes

### Thresholds de adesão ainda são best-guess
O `ADHERENCE_RISK_THRESHOLDS` em escala 1–5 (`sleep_quality<=2`,
`stress_level>=4`, `energy_level<=2`) e `ADHERENCE_RISK_MIN_FLAGS=2` são
**knobs de produto**, não calibração validada. Se a fila ficar larga ou
estreita demais na operação real, ajustar este const é uma
single-line-change. Documentado no JSDoc do próprio arquivo
(`src/utils/precision12CoachConsole.ts`).

### DEXA #4 precisa decisão de produto
A prioridade #4 do plano E4 ("DEXA sem PDF/conclusão") está pausada
porque exige resposta a:
- O sinal de "completa" é um campo estruturado em `dexa_results` ou um
  PDF anexado? Ou ambos?
- Quanto tempo após `assessment_date` é razoável considerar pendente?

Sem essa decisão não dá pra traduzir em invariante de alerta.

### Dados SMOKE/TEST são ocultos, não deletados
O E4.3a oculta visualmente alunos com prefixos `SMOKE `, `TEST `,
`[TEST]` e substring `SMOKE E3`, mas eles continuam no banco e
**continuam contabilizados nos KPIs globais**. Isso é proposital:
- KPIs servem de panorama operacional, então faz sentido continuarem
  contando o universo real.
- Cleanup definitivo dos smoke é uma ação destrutiva separada
  (responsabilidade de QA / dev, não do coach).

Se essa contagem em KPI virar atrito real, opções:
1. Adicionar segundo set de "KPIs filtrados" abaixo dos globais
   (custo: ~30 min, sem mutation).
2. Cleanup operacional dos smoke residuais em banco (ação destrutiva
   — exige diff revisado e snapshot).

### Performance OK com bulk `.in()`, mas escala maior pode pedir RPC
O hook `usePrecision12CoachConsole` faz **4 queries paralelas com
`.in()`** (sem N+1, sem loop por aluno). Está confortável pra ordem de
grandeza atual (4 alunos no smoke, ~dezenas esperado em médio prazo).

Os pontos onde a forma muda seriam:
- Filtros aplicados server-side (hoje são client-side em estado
  React).
- Paginação real da fila / tabela.
- Mais agregações cross-aluno (ex.: distribuição de adesão por
  segmento).

Quando algum desses entrar em pauta, vale considerar uma RPC
consolidada (`get_precision12_coach_console_snapshot`) que retorna o
shape já derivado. Decisão técnica que pode ser tomada quando o
gatilho for óbvio — antes disso seria over-engineering.

---

## 8. Próxima recomendação

Três opções viáveis pra próxima fase. **Não executar nenhuma sem
decisão explícita.**

### Opção A — Mais refinamento read-only (lowest risk)
Continuar o caminho do E4.3a/b sem introduzir mutação:
- Saved filter sets / preferências persistidas.
- Deep-link bidirecional (URL acompanha clicks de tab).
- Sort customizado na fila e na tabela.
- Export CSV do snapshot atual.

Pros: baixíssimo risco, mantém RLS atual, sem nova superfície de erro.
Contras: o coach já tem o painel funcional; ganho marginal por feature.

### Opção B — Primeira mutação controlada (reissue UI) ⭐ recomendada
Implementar **reissue de link de questionário** a partir da fila, com:
- Botão "Reenviar link" só na linha `questionnaire_pending`.
- Diálogo de confirmação explícita ("Isso vai revogar o link anterior
  e criar um novo. Continuar?").
- Edge function `create-precision12-questionnaire-link` já existe e já
  tem o guard `REISSUABLE_STATUSES = {in_progress}` (vide PR #136).
- Optimistic update via `useMutation` + invalidate na query do hook.

Pros: destrava operação real do coach (hoje ele precisa sair do Coach
Console pra reenviar link). Risco controlado: 1 mutação, 1 guard
server-side, 1 confirmação UX.
Contras: introduz a primeira mutação no caminho Coach Console. Exige
testes de erro (link revogado, link já usado, etc.).

### Opção C — Resolver DEXA #4
Mapear o sinal de "DEXA pendente" na fila. Pre-requisitos:
- Decidir o esquema (PDF anexado? Campo estruturado em `dexa_results`?).
- Possível migration leve pra normalizar (se for campo estruturado).
- Nova regra no `deriveActionQueue`.

Pros: fecha a fila completa do plano E4 original.
Contras: requer decisão de produto antes do código.

**Minha recomendação:** **Opção B** — destrava operação real, com risco
controlado, e usa a edge function que já existe e já tem o guard
correto. Mas é decisão do Alex.

---

## Apêndice — arquivos-chave por etapa

```
E4.1 (#137)
  src/utils/precision12CoachConsole.ts        derivações puras
  src/hooks/usePrecision12CoachConsole.ts     hook read-only
  src/utils/__tests__/precision12CoachConsole.test.ts  27 unit tests

E4.2 (#138)
  src/pages/CoachConsole.tsx                  +tab Precision 12
  src/components/precision12/Precision12Console.tsx     container
  src/components/precision12/Precision12KpiCards.tsx    KPIs
  src/components/precision12/Precision12ActionQueue.tsx fila
  src/components/precision12/Precision12StudentProgressTable.tsx tabela
  src/components/precision12/__tests__/Precision12Console.coverage.test.ts

E4.3a (#139)
  src/utils/precision12CoachConsole.ts        +filter functions
  src/components/precision12/Precision12Filters.tsx     UI filtros
  src/components/precision12/Precision12Console.tsx     wire de filtros
  +20 unit tests + 11 source-based

E4.3b (#140)
  src/utils/precision12CoachConsole.ts        +buildPrecision12StudentDeepLink
  src/components/precision12/Precision12ActionQueue.tsx CTA usa helper
  src/components/precision12/Precision12StudentProgressTable.tsx CTA usa helper
  src/pages/StudentDetailPage.tsx             lê ?tab=
  src/components/assessments/AssessmentsTab.tsx lê ?assessmentId=
  src/pages/__tests__/StudentDetailPage.deeplink.coverage.test.ts
  +6 unit tests do helper + 16 source-based
```

Total acumulado E4.1–E4.3b: **+22 arquivos** (modificados ou criados),
zero migrations, zero edge functions adicionadas, zero RPCs.
