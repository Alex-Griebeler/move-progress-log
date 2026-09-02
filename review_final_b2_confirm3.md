# Terceira confirmação da revisão final — PR-B2 cutover do check-in v3

Commit revisado: `de069d301ac0b1db19103d48331c5c94cd2f19f1`  
Base de comparação: `review_final_b2_confirm2.md`, `git show dd24660` e `git show HEAD`.

## Veredito

**NO-GO para merge.** Os dois achados da confirmação anterior estão fechados, e o `HEAD` também impede que o snapshot de um `done` antigo seja restaurado por cima de `pending`/`skipped`. Contudo, a invalidação por época deixa `inFlightConductTypeRef` com um valor órfão após `reopen`/`skip`. Em um novo ciclo do check-in, esse valor pode fazer o efeito interpretar que a conduta divergente já está em voo, não gravar nada e manter “Iniciar treino” habilitado com banco e tela divergentes.

## Achado

### 1. BLOCKER — `reopen`/`skip` invalidam a tarefa, mas deixam a sentinela de voo bloquear uma gravação futura

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:250-258`, `665-680`, `717-724`, `864-895`, `1521-1529`.

Sequência demonstrável pelo código:

1. Há um check-in `done` com A persistida. O coach escolhe B; `persistConductUpdate()` grava `inFlightConductTypeRef.current = B`, muda o estado para `saving` e inicia a tarefa.
2. Antes de ela terminar, o coach clica em “Refazer”. `reopenCheckIn()` incrementa `syncEpochRef`, volta `conductSyncState` para `idle`, limpa a alternativa e o record, mas não limpa `inFlightConductTypeRef`.
3. A tarefa antiga termina com `mayPublish() === false`. Tanto no sucesso quanto no erro ela retorna sem limpar a ref; portanto B fica órfã em `inFlightConductTypeRef`.
4. O coach registra novamente a conduta A. O commit grava A no banco e cria um novo `CheckInRecord` com `persistedConductType = A`, mas também não limpa a ref órfã.
5. O coach escolhe novamente uma alternativa cuja conduta efetiva é B. O efeito vê `displayedConductType !== persistedConductType`, mas retorna em `inFlightConductTypeRef.current === displayedConductType`. Não existe tarefa da época atual para terminar e limpar essa ref.
6. Como `conductSyncState` continua `idle`, o CTA fica habilitado. A sessão pode começar em B enquanto o banco permanece em A, sem erro nem retry.

O mesmo estado órfão pode atravessar `skipCheckIn()`. A correção mínima é limpar `inFlightConductTypeRef.current = null` em toda invalidação de época (`reopen` e `skip`, idealmente num helper único junto de `syncEpochRef.current += 1` e do reset do estado). A tarefa antiga já não consegue apagar a identidade de uma tarefa nova porque seus caminhos de limpeza estão protegidos por `mayPublish()`. Adicionar teste comportamental com deferred cobrindo `B em voo → Refazer → novo commit A → escolher B`: deve ocorrer novo upsert e o CTA deve permanecer bloqueado até seu sucesso.

## Confirmação dos achados anteriores e das regressões pedidas

- **BLOCKER anterior, remount após falha:** fechado. `persistedConductType` nasce do commit, da re-persistência bem-sucedida ou de `f.conduta`; o efeito compara a conduta efetiva exibida com essa verdade persistida. A sentinela antiga foi removida e o estado `error` exige retry explícito.
- **MAJOR anterior, troca de aluna:** fechado. A tarefa captura `owner`; upsert e invalidações usam esse escopo; `mayPublish()` exige a aluna atual, a última geração e agora também a mesma época.
- **Snapshot velho após `reopen`/`skip`:** fechado no `HEAD`. A época invalida a publicação antiga e o sucesso atualiza somente `currentRecordRef.current` quando ainda é `done`, da mesma aluna e do mesmo fingerprint.
- **Loop por diferença textual:** não reproduzível com o formato atual. `trainingType` vem de catálogo fechado, é serializado diretamente em `conduta=` e o parser devolve o mesmo texto; após sucesso, o record recebe exatamente `payload.conductType`.
- **Re-persistência redundante após commit normal:** não ocorre no fluxo revisado. O commit usa `prospectiveConduct.prescription.trainingType`, que coincide com a conduta do primeiro render `done`; a comparação encerra o efeito.

## Gates executados no HEAD

- `npx tsc -b --force`: **PASS**.
- `npx vitest run`: **PASS** — 111 arquivos passaram, 1 pulado; 2.058 testes passaram, 33 pulados.
- `npm run lint`: **PASS sem erros** — 4 warnings preexistentes/fora do diff em `WhoopActivityCard.tsx`, `OuraTabContent.tsx` e `WhoopTabContent.tsx`.
- `git diff HEAD^..HEAD --check`, `git diff --check` e working tree: **PASS/limpo antes deste relatório**.

## Critério objetivo para GO

Zerar a identidade em voo ao invalidar a época em `reopen` e `skip`, cobrir o ciclo dirigido acima com teste comportamental e repetir os gates.
