# Revisão e plano — correção da data diária do Whoop

## Parecer executivo

**A causa está confirmada.** `assembleDailyMetrics` transforma `cycle.start` diretamente na data local de São Paulo, tanto para a chave de deduplicação quanto para `whoop_metrics.date` (`mapWhoop.ts:34-35, 55-65, 81-83`). O restante do sistema trata essa data como o dia real do Whoop; não existe compensação posterior de `+1 dia`.

A regra de `cycle.start + 12 horas` fica **descartada**. A regra recomendada passa a ser: usar a data local do `sleep.end` do sono principal associado ao ciclo, convertida com o `sleep.timezone_offset` gravado pelo aparelho. Se o sono principal ainda não estiver disponível, usar provisoriamente a data local de `cycle.start`, com `cycle.timezone_offset`, avançando um dia somente quando o horário local for estritamente posterior a 12:00. Cochilos nunca definem a data.

A documentação oficial confirma os vínculos e campos necessários, mas **não documenta o algoritmo usado pelo aplicativo para exibir um ciclo em uma data de calendário**. Portanto, a escolha de `sleep.end` se apoia no comportamento real confirmado no aplicativo em 15/09, não em uma garantia publicada pelo Whoop.

**Não recomendo um `delete` remoto seguido de `upsert` remoto em duas chamadas.** Mesmo com o lock por cliente, uma falha entre as chamadas apagaria dados até a próxima sincronização. Recomendo uma função transacional no banco que, na mesma transação, remova as linhas antigas dos `cycle_id` recebidos e grave o lote novo.

## A. Evidência no código e no banco

- O campo e a deduplicação usam hoje `dateInTz(c.start, tz)` sem deslocamento (`mapWhoop.ts:59,82`).
- `whoop-sync` chama o mapper com `America/Sao_Paulo` e grava por conflito em `(student_id,date)` (`whoop-sync/sync.ts:85-89`).
- As fixtures atuais têm `sleep.end`, `sleep.cycle_id` e `sleep.nap`, mas **não têm `timezone_offset` nem no ciclo nem no sono** (`fixtures/whoop_v2.ts:4-12,60-82`). Elas precisam ser completadas para testar a nova regra.
- Na especificação oficial v2, `Cycle.start` e `Cycle.timezone_offset` são obrigatórios; `Cycle.end` é ausente no ciclo atual. Em `Sleep`, `start`, `end`, `timezone_offset`, `cycle_id` e `nap` são obrigatórios. Em `Recovery`, `cycle_id` e `sleep_id` são obrigatórios. Fontes: [Cycle](https://developer.whoop.com/docs/developing/user-data/cycle/), [Sleep](https://developer.whoop.com/docs/developing/user-data/sleep/), [Recovery](https://developer.whoop.com/docs/developing/user-data/recovery/) e [OpenAPI oficial](https://api.prod.whoop.com/developer/doc/openapi.json).
- Como `Sleep.end` é obrigatório no contrato oficial, “sono ligado, mas sem `end`” é apenas defesa contra payload incompleto ou consistência eventual. A ausência realmente esperada é a do próprio registro de sono na coleção retornada; nesse caso vale a data provisória.
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
- A busca atual envia exatamente o mesmo `start/end` para ciclos, recoveries e sleeps (`sync.ts:47-51`). Quando o sono não estiver no lote, será usada a data provisória calculada pelo início local do ciclo. Não haverá busca adicional de sleeps.
- O limite padrão documentado pelo Whoop é 100 requisições/minuto e 10.000/dia. O histórico atualmente armazenado cabe em **duas janelas por conexão**, mas cinco janelas longas em paralelo podem chegar perto do limite por minuto. A execução deve ser **sequencial, uma conexão por mensagem**, respeitando `429/Retry-After` e sem concorrer com os três horários automáticos.
- “Histórico completo” deve signific inicialmente **todo o período já presente no app**, começando um dia antes da menor `date` de cada conexão. Buscar toda a vida da conta Whoop é possível em blocos de até 90 dias, mas o volume anterior a junho não está mensurado e não deve ser prometido sem uma leitura da API.

## D. Riscos avaliados

1. **Colisão em `(student_id,date)`** — continua possível; o mapper deve deduplicar pela nova data antes de enviar o lote.
2. **Dois ciclos no mesmo dia rotulado** — manter a regra atual: preferir ciclo com recovery; em empate, o início mais recente. Isso também cobre ciclo provisório concorrendo com ciclo definitivo no mesmo dia.
3. **Resíduo da data antiga** — confirmado por dois `cycle_id` já duplicados. Reconciliar todos os ciclos recebidos, não apenas a data mais recente.
4. **Apagamento não atômico** — um `delete` separado antes do `upsert` pode deixar lacuna após timeout/429/erro. Usar uma única função transacional.
5. **Limite da janela** — incluir um dia de sobreposição nas bordas para não perder ciclo que cruza o início/fim; nunca exceder 90 dias por chamada.
6. **`whoop_workouts`** — nenhum impacto de chave ou data: usa `start_datetime/end_datetime` e conflito por `whoop_workout_id`. Não apagar nem migrar essa tabela.
7. **Espelho** — existe **1 autorização Whoop ativa**, com 61 linhas da origem e janela de 90 dias. Como o contrato exporta `date`, o destino também precisa receber um snapshot completo após a correção. O payload não leva `cycle_id`; a remoção das datas antigas depende da semântica `complete: true` do importador e deve ser verificada no app destino.
8. **Mudança de fuso durante o sono** — a data definitiva usa o offset do próprio sono, como decidido; não usa o offset do ciclo nem São Paulo. Um offset numérico preserva o contexto gravado pelo aparelho, embora não carregue regras históricas de uma zona IANA.
9. **Sono sem score** — ainda define a data se for `nap = false` e tiver `end`; score não participa da rotulagem.
10. **Ciclo sem recovery** — buscar o sono não-cochilo por `cycle_id`; se não estiver disponível, manter a data provisória.
11. **Ciclo em andamento hoje** — normalmente recebe a data definitiva pelo sono que o abriu; se esse sono ainda não chegou na coleção, recebe data provisória e será reidentificado atomicamente numa sincronização posterior.
12. **Cochilos** — `nap = true` é excluído tanto do vínculo por `recovery.sleep_id` quanto do fallback por `cycle_id`.

## E. Plano incremental — executar somente um passo por mensagem

### Passo 1 — mapper e testes, sem publicação

Alterar somente `mapWhoop.ts`, suas fixtures e seus testes.

Em `mapWhoop.ts`, remover o argumento fixo de timezone de `assembleDailyMetrics` e introduzir funções equivalentes a estas:

```ts
const OFFSET_RE = /^(Z|[+-]\d{2}:\d{2})$/;

const offsetMinutes = (offset: string): number | null => {
  if (offset === "Z") return 0;
  if (!OFFSET_RE.test(offset)) return null;
  const sign = offset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);
  return sign * (hours * 60 + minutes);
};

const localParts = (
  iso: unknown,
  offset: unknown,
): { date: string; secondsOfDay: number } | null => {
  if (typeof iso !== "string" || typeof offset !== "string") return null;
  const instant = Date.parse(iso);
  const minutes = offsetMinutes(offset);
  if (!Number.isFinite(instant) || minutes === null) return null;
  const shifted = new Date(instant + minutes * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    secondsOfDay:
      shifted.getUTCHours() * 3600 + shifted.getUTCMinutes() * 60 + shifted.getUTCSeconds(),
  };
};

const shiftDate = (date: string, days: number): string => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const cycleDate = (cycle: Rec, sleep?: Rec): string | null => {
  if (sleep?.nap === false) {
    const ended = localParts(sleep.end, sleep.timezone_offset);
    if (ended) return ended.date;
  }
  const started = localParts(cycle.start, cycle.timezone_offset);
  if (!started) return null;
  return started.secondsOfDay > 12 * 3600 ? shiftDate(started.date, 1) : started.date;
};
```

Selecionar o sono principal assim:

```ts
const linkedSleep = rec?.sleep_id ? sleepById.get(rec.sleep_id) : undefined;
const primarySleep = linkedSleep?.nap === false
  ? linkedSleep
  : (sleepsByCycle.get(c.id) ?? [])
      .filter((sleep) => sleep.nap === false)
      .sort((a, b) => Date.parse(String(b.end ?? "")) - Date.parse(String(a.end ?? "")))[0];
```

`sleepsByCycle` passa a armazenar arrays, não apenas um registro. Calcular `day = cycleDate(c, primarySleep)` antes da deduplicação; descartar somente ciclos sem `start/timezone_offset` válidos. Guardar junto o ciclo, o sono principal e a data escolhida, para usar **a mesma data** no agrupamento e no campo `date`.

Atualizar fixtures com `timezone_offset` nos ciclos e sleeps. Adicionar testes para:

- caso real: ciclo iniciado antes da meia-noite de 14/09, sono principal encerrado em 15/09 → `date = 2026-09-15`;
- ciclo iniciado depois da meia-noite e sono encerrado no mesmo dia → a mesma data;
- offset do sono prevalece sobre offset do ciclo;
- sono principal sem score ainda define a data;
- `recovery.sleep_id` prevalece sobre fallback por `cycle_id`;
- cochilo ligado por engano ao recovery é ignorado;
- cochilo nunca vence o fallback por `cycle_id`;
- ciclo sem recovery usa sono não-cochilo pelo `cycle_id`;
- ciclo atual sem sono retornado usa data provisória;
- fallback iniciado antes, exatamente às e depois das 12:00 locais;
- payload com offset inválido não usa São Paulo silenciosamente;
- dois ciclos na mesma nova data: recovery vence; em empate, início mais recente;
- ciclo inválido continua descartado.

**Prova:** testes do mapper passam; não resta uso de `America/Sao_Paulo` para montar a data Whoop; nenhuma função é publicada.

### Passo 2 — cancelado por decisão do dono

Não buscar sleeps com 48 horas de folga e não chamar `GET /v2/cycle/{cycleId}/sleep`. Quando o sono não estiver no lote, manter a data provisória já definida pelo mapper. Na correção histórica, os blocos de até 90 dias devem se sobrepor em 1 dia.

### Passo 3 — função transacional no banco, ainda sem publicação

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

### Passo 4 — integrar a gravação e publicar somente `whoop-sync`

Em `sync.ts`, substituir somente o upsert direto de `whoop_metrics` pela RPC transacional do passo 3. Manter intacto o fluxo de `whoop_workouts`. Publicar somente `whoop-sync`; não publicar front, callback, sync-all ou espelho.

**Prova:** timestamp da publicação; smoke de uma conexão em janela curta; log `success`; para os ciclos retornados, uma linha por `(student_id,cycle_id)` e uma por `(student_id,date)`; o exemplo de 15/09 aparece em 15/09.

### Passo 5 — piloto controlado

Sincronizar uma janela curta de uma conexão que contenha o caso confirmado de 14/09→15/09.

**Prova no banco:** antes/depois por `cycle_id`; o ciclo existe uma única vez; a linha antiga de 14/09 desapareceu; a nova linha está em 15/09; recovery e strain permanecem no mesmo ciclo; não houve mudança em `whoop_workouts`.

### Passo 6 — corrigir o histórico, uma conexão por mensagem

Para cada uma das 5 conexões, fora dos horários automáticos, chamar `whoop-sync` sequencialmente em blocos de até 90 dias, começando um dia antes da menor data atual, sobrepondo cada bloco consecutivo em 1 dia e terminando em agora. Parar imediatamente em 429, 423 ou 5xx e respeitar `Retry-After`.

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

### Passo 7 — auditoria global pós-correção

Executar apenas leituras: todas as linhas com `cycle_id`; nenhum `(student_id,cycle_id)` repetido; nenhum `(student_id,date)` repetido; cinco conexões ainda ativas; datas máximas coerentes; últimos logs sem falha. Conferir nominalmente os dois ciclos hoje duplicados para provar que cada um ficou em uma única data.

### Passo 8 — atualizar e provar o espelho

Disparar refresh somente da autorização Whoop ativa. Verificar que o snapshot da origem contém a janela completa corrigida e, no destino, que as datas antigas foram removidas — não apenas que as novas foram inseridas. Se o destino não substituir integralmente uma projeção `complete: true`, parar e planejar a correção do importador antes de repetir.

## Recomendação final

Aprovar a data pelo fim do sono principal e pelo offset gravado no próprio sono, com fallback provisório pelo ciclo e sem cochilos. Manter a reconciliação transacional, pois a data provisória pode mudar. Para o volume atual, a correção histórica é viável quando executada sequencialmente. Não há compensação de data a remover no front, em relatórios, IA, RPCs ou crons.
