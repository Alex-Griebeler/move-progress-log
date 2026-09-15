# Revisão e plano — correção da data diária do Whoop

## Parecer executivo

**A causa está confirmada.** `assembleDailyMetrics` transforma `cycle.start` diretamente na data local de São Paulo, tanto para a chave de deduplicação quanto para `whoop_metrics.date` (`mapWhoop.ts:34-35, 55-65, 81-83`). O restante do sistema trata essa data como o dia real do Whoop; não existe compensação posterior de `+1 dia`.

A regra proposta de **`cycle.start + 12 horas`, depois conversão para `America/Sao_Paulo`**, é uma correção estável e coerente com os casos normais citados: início às 23h cai no dia seguinte; início à 1h permanece no mesmo dia. Ela é uma convenção com corte ao meio-dia, não uma definição universal de “dia de despertar”; sono diurno iniciado antes do meio-dia é o principal caso-limite. Por isso, a regra deve ficar explícita e coberta por testes de fronteira.

**Não recomendo um `delete` remoto seguido de `upsert` remoto em duas chamadas.** Mesmo com o lock por cliente, uma falha entre as chamadas apagaria dados até a próxima sincronização. Recomendo uma função transacional no banco que, na mesma transação, remova as linhas antigas dos `cycle_id` recebidos e grave o lote novo.

## A. Evidência no código e no banco

- O campo e a deduplicação usam hoje `dateInTz(c.start, tz)` sem deslocamento (`mapWhoop.ts:59,82`).
- `whoop-sync` chama o mapper com `America/Sao_Paulo` e grava por conflito em `(student_id,date)` (`whoop-sync/sync.ts:85-89`).
- O índice único real é `UNIQUE (student_id,date)`; não há unicidade para `(student_id,cycle_id)`.
- Há **334 linhas** em `whoop_metrics`; **todas as 334 têm `cycle_id`**.
- Há **332 pares distintos `(student_id,cycle_id)`**: dois ciclos aparecem duas vezes, cada um em datas consecutivas. Isso confirma que já existem resíduos históricos que uma reconciliação por `cycle_id` deve remover.
- Não há duas linhas atuais com o mesmo `(student_id,date)`, pois o índice único impede isso.
- Não existem views ou materialized views lendo `whoop_metrics`.

## B. Todos os consumidores de `whoop_metrics.date`

### Interface e consulta

1. `src/hooks/useWhoopMetrics.ts:59-83` — único acesso direto do front; ordena por `date` e filtra janelas de 7/30/90 dias pelo calendário de São Paulo.
2. `src/pages/StudentDetailPage.tsx:100-115,407-414` — carrega 90 dias para a aba de treinamento e entrega as linhas ao painel.
3. `src/components/student-detail/WhoopTabContent.tsx:91-140,250-370` — usa `date` no último score, pendências, gráficos, tabela e períodos.
4. `src/components/PersonalizedTrainingDashboard.tsx:184-228,300-337,930-1030,1157-1170,1271-1310` — escolhe o dispositivo/dia, casa a recomendação, decide se o strain é “de hoje”, calcula desatualização, gera alertas e participa do identificador da conduta/check-in.
5. `src/components/WhoopActivityCard.tsx:30-40` — mostra a data do card.
6. `src/components/WhoopStudentDiagnosticsCard.tsx:16-20` — lê a linha mais recente; depende indiretamente da ordenação por `date`.

### Recomendação, check-in, relatórios e IA

7. `src/utils/recoverySnapshot.ts:62-102` — compara datas Oura/Whoop, escolhe o dispositivo mais recente e calcula desatualização.
8. `src/utils/recoveryAdapters.ts:113-184` — leva `date` ao motor e monta o histórico/baseline dos 30 dias anteriores.
9. `src/utils/whoopRecommendation.ts:28-75,185-214` — seleciona a linha do dia, separa histórico anterior e valida cobertura da janela.
10. `src/utils/whoopRecommendation.ts:119-173` — recebe `snapshotIsToday`; a data errada torna o strain de hoje “indisponível”.
11. O check-in/conduta não consulta a tabela diretamente, mas o painel inclui `source + date + score` no fingerprint. Corrigir a data muda corretamente o contexto da conduta atual; registros históricos não são reescritos.
12. Não foi encontrado leitor direto de `whoop_metrics` em geradores de relatório ou funções de IA. Eles não exigem remoção de compensação.

### Funções, banco, espelho e agendamento

13. `supabase/functions/_shared/wearable/mapWhoop.ts` — único lugar que cria a data.
14. `supabase/functions/whoop-sync/sync.ts` — grava o lote por data.
15. `public.wearable_mirror_export_snapshot` — exporta `date` e filtra uma janela completa de 90 dias; é o único RPC que lê a tabela.
16. `supabase/functions/_shared/wearableMirror/contract.ts` — valida a data e o intervalo exportado, sem deslocá-los.
17. O banco tem três jobs ativos: **09:15, 13:15 e 21:15 UTC**. Todos chamam `whoop-sync-all`, que chama `whoop-sync` sem `start/end`; portanto cada execução busca os **últimos 30 dias**.
18. Não existe compensação de `+1 dia` para remover. O `shiftDays` de `whoopRecommendation.ts` só calcula janelas de baseline; o `+1` no contrato do espelho só conta dias inclusivos.

## C. Volume atual e viabilidade da correção histórica

- Existem **5 conexões Whoop ativas**.
- Conexões criadas entre **09/07/2026 e 04/08/2026**.
- Dados atuais entre **13/06/2026 e 14/09/2026**; por conexão: 49 a 92 linhas, total 334.
- O endpoint aceita no máximo **90 dias por chamada** (`handler.ts:11-39`). As quatro coleções são paginadas em páginas de 25 e buscadas em paralelo, com 15 s por requisição e 75 s para o conjunto (`sync.ts:16-53`).
- O limite padrão documentado pelo Whoop é 100 requisições/minuto e 10.000/dia. O histórico atualmente armazenado cabe em **duas janelas por conexão**, mas cinco janelas longas em paralelo podem chegar perto do limite por minuto. A execução deve ser **sequencial, uma conexão por mensagem**, respeitando `429/Retry-After` e sem concorrer com os três horários automáticos.
- “Histórico completo” deve signific inicialmente **todo o período já presente no app**, começando um dia antes da menor `date` de cada conexão. Buscar toda a vida da conta Whoop é possível em blocos de até 90 dias, mas o volume anterior a junho não está mensurado e não deve ser prometido sem uma leitura da API.

## D. Riscos avaliados

1. **Colisão em `(student_id,date)`** — continua possível; o mapper deve deduplicar pela nova data antes de enviar o lote.
2. **Dois ciclos no novo mesmo dia** — manter a regra atual: preferir ciclo com recovery; em empate, o início mais recente. Adicionar testes específicos usando a data deslocada.
3. **Resíduo da data antiga** — confirmado por dois `cycle_id` já duplicados. Reconciliar todos os ciclos recebidos, não apenas a data mais recente.
4. **Apagamento não atômico** — um `delete` separado antes do `upsert` pode deixar lacuna após timeout/429/erro. Usar uma única função transacional.
5. **Limite da janela** — incluir um dia de sobreposição nas bordas para não perder ciclo que cruza o início/fim; nunca exceder 90 dias por chamada.
6. **`whoop_workouts`** — nenhum impacto de chave ou data: usa `start_datetime/end_datetime` e conflito por `whoop_workout_id`. Não apagar nem migrar essa tabela.
7. **Espelho** — existe **1 autorização Whoop ativa**, com 61 linhas da origem e janela de 90 dias. Como o contrato exporta `date`, o destino também precisa receber um snapshot completo após a correção. O payload não leva `cycle_id`; a remoção das datas antigas depende da semântica `complete: true` do importador e deve ser verificada no app destino.
8. **Regra das 12 horas** — para sono diurno/turnos atípicos, o corte ao meio-dia pode não representar o despertar. É uma limitação conhecida e deve ser documentada no teste, não escondida.

## E. Plano incremental — executar somente um passo por mensagem

### Passo 1 — testes e mudança local, sem publicação

Alterar somente o mapper, o sync e seus testes.

Em `mapWhoop.ts`, introduzir uma função única e reutilizá-la nos dois pontos:

```ts
const cycleDateInTz = (cycleStart: string, tz: string): string =>
  dateInTz(new Date(Date.parse(cycleStart) + 12 * 60 * 60 * 1000).toISOString(), tz);
```

Trocas exatas:

```ts
const day = cycleDateInTz(c.start, tz);
```

```ts
date: cycleDateInTz(c.start, tz),
```

Adicionar testes para: 23h local → dia seguinte; 1h local → mesmo dia; fronteiras 11:59/12:00; ciclo inválido descartado; dois ciclos que colidem depois do deslocamento; preferência por recovery; empate pelo início mais recente.

Em `sync.ts`, substituir o upsert direto de métricas por chamada à função transacional descrita no passo 2. Não tocar no fluxo de `whoop_workouts`.

**Prova:** testes do mapper e de `syncStudent` passam; busca textual confirma que `dateInTz(c.start, tz)` não continua nos dois pontos antigos; nenhuma função é publicada.

### Passo 2 — função transacional no banco, ainda sem publicação

Criar uma migration aditiva com `public.replace_whoop_metrics_batch(p_student_id uuid, p_rows jsonb)`, `SECURITY INVOKER`, acesso somente para `service_role`.

Dentro de uma única transação da chamada, ela deve:

1. validar que `p_rows` é array;
2. validar que todas as linhas pertencem a `p_student_id` e têm `cycle_id/date`;
3. rejeitar datas ou ciclos duplicados dentro do lote;
4. apagar de `whoop_metrics` todas as linhas desse cliente cujo `cycle_id` esteja no lote;
5. inserir o lote com `ON CONFLICT (student_id,date) DO UPDATE`, atualizando todos os campos sincronizados;
6. devolver a quantidade gravada.

O apagamento e a inserção ficam no mesmo corpo PL/pgSQL: qualquer erro desfaz ambos. A função deve funcionar sob o contexto autorizado do sync e respeitar o write guard existente.

**Prova no banco:** consultar assinatura, `prosecdef = false`, privilégios (apenas `service_role`) e executar uma transação de teste que termina em `ROLLBACK`, provando remoção/reinserção sem persistir mudanças.

### Passo 3 — publicar somente `whoop-sync`

Publicar `whoop-sync` com o mapper e a chamada transacional. Não publicar front, callback, sync-all ou espelho.

**Prova:** timestamp da publicação; smoke de uma conexão em janela curta; log `success`; para os ciclos retornados, uma linha por `(student_id,cycle_id)` e uma por `(student_id,date)`; o exemplo de 15/09 aparece em 15/09.

### Passo 4 — corrigir o histórico, uma conexão por mensagem

Para cada uma das 5 conexões, fora dos horários automáticos, chamar `whoop-sync` sequencialmente em blocos de até 90 dias, começando um dia antes da menor data atual e terminando em agora. Parar imediatamente em 429, 423 ou 5xx e respeitar `Retry-After`.

**Prova após cada conexão:**

```sql
SELECT count(*) AS rows,
       count(*) FILTER (WHERE cycle_id IS NULL) AS sem_cycle_id,
       count(*) - count(DISTINCT cycle_id) AS ciclos_repetidos,
       min(date), max(date)
FROM public.whoop_metrics
WHERE student_id = '<cliente>';
```

Também comparar as datas/strain recentes com o app oficial e confirmar log de sync `success`. Só seguir para a conexão seguinte após aprovação do resultado.

### Passo 5 — auditoria global pós-correção

Executar apenas leituras: todas as linhas com `cycle_id`; nenhum `(student_id,cycle_id)` repetido; nenhum `(student_id,date)` repetido; cinco conexões ainda ativas; datas máximas coerentes; últimos logs sem falha. Conferir nominalmente os dois ciclos hoje duplicados para provar que cada um ficou em uma única data.

### Passo 6 — atualizar e provar o espelho

Disparar refresh somente da autorização Whoop ativa. Verificar que o snapshot da origem contém a janela completa corrigida e, no destino, que as datas antigas foram removidas — não apenas que as novas foram inseridas. Se o destino não substituir integralmente uma projeção `complete: true`, parar e planejar a correção do importador antes de repetir.

## Recomendação final

Aprovar a regra de `+12h`, mas substituir o `delete` separado por reconciliação transacional. Para o volume atual, a correção histórica é pequena e viável sob os limites do Whoop quando executada sequencialmente. Não há compensação de data a remover no front, em relatórios, IA, RPCs ou crons.
