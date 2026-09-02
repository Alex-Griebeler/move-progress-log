# Revisão final — PR-B2 cutover do check-in v3

Branch: `redesign/pr-b2-cutover`  
Base: `main` (`git diff main...HEAD`)  
Oráculos: `../redesign_premium_v7_checkin_v3.md`, `../redesign_premium_v8_ux.md` e composições `.app` de `../mocks_redesign.html`

## Veredito

**NO-GO para merge.** O diff compila, os testes passam e o lint não tem erros, mas ainda existe um BLOCKER de auditabilidade: a alternativa escolhida depois do check-in altera a conduta que o coach vê e executa sem atualizar a conduta persistida. Há ainda quatro MAJORs em persistência/reidratação e isolamento de estado que permitem apagar ou ressuscitar informação clínica, além de selecionar silenciosamente uma prescrição de outra aluna.

Não repito os achados do relatório frio nem os três da releitura do Claude. Os itens abaixo são problemas remanescentes ou interações introduzidas pelas correções posteriores.

## Achados

### 1. BLOCKER — Alternativa pós-reveal muda a conduta executada, mas o prontuário continua com a conduta anterior

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:335-372`, `456-534`, `1360-1368`, `1766-1777`.

O único upsert do registro v2 acontece no `persistPerception`, durante o commit do PSR. Depois do reveal, porém, o coach pode abrir “Ver alternativas”; o handler apenas chama `setSelectedAlternative` e fecha o diálogo. Isso recalcula imediatamente `conduct`, `conductRecommendation`, cargas e CTA, e permite iniciar a sessão, mas não persiste a nova conduta.

Sequência reproduzível: base z3 → registrar PSR condizente → banco grava “Treino Normal Completo” → escolher “Recuperação Ativa” → tela/cargas passam para z1 e o treino pode iniciar → observação vinculada à sessão ainda afirma z3. O efeito de `conductVersionRef` apenas volta `perceptionSaveState` a `idle`; no estado colapsado não existe um novo commit visível.

**Correção proposta:** tornar a escolha de alternativa uma mutação clínica explícita. Persistir a conduta final e só liberar “Iniciar treino” após sucesso, ou invalidar o `done` e exigir novo commit com feedback claro. Atualizar o vínculo lembrado para o registro efetivamente atualizado. Cobrir em teste comportamental: registrar → escolher alternativa → iniciar → texto persistido e conduta exibida têm a mesma zona/carga.

### 2. MAJOR — “Registrar dia de descanso” sobrescreve o próprio check-in e falsifica a idade usada por “Refazer”

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:506-534`, `556-568`, `1320-1326`, `1593-1599`, `src/utils/perceptionObservation.ts:158-195`.

O descanso chama `persistPerception("Dia de descanso registrado")`. A função gera novo `registrado_iso` e usa o mesmo upsert por `{aluna, dia SP, fonte}` do check-in. `upsertPerceptionBySource` encontra a linha v2 existente e substitui todo o `observation_text`. Assim, a ação de descanso troca `conduta=` pela frase do evento e troca o horário original do check-in.

O estado local não atualiza `checkInRecord.registeredAtIso` no caminho de override, mas, no próximo remount, a reidratação lê o horário sobrescrito. Exemplo: check-in feito 08:00, descanso registrado 12:00; após recarregar, o check-in parece ter sido registrado 12:00 e o “Refazer” de >3h desaparece. Em `Editar → skip → registrar descanso`, o mesmo caminho ainda pode substituir um PSR válido anterior por `psr=nao_informado`.

**Correção proposta:** registrar a confirmação de descanso como evento separado/no domínio apropriado; ela não pode reutilizar nem sobrescrever a linha idempotente do check-in. Manter `registrado_iso`, PSR e `conduta` do check-in como fatos do commit/refazer. Adicionar teste com relógio controlado para 08:00 → descanso 12:00 → remount → continua mostrando 08:00 e “Refazer”.

### 3. MAJOR — O cache de reidratação não é atualizado pelo upsert e pode reaplicar PSR antigo ou esconder um registro novo

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:518-534`, `609-627`, `628-681`.

A query `['checkin-rehydrate', studentId, todaySp]` tem `staleTime: 60_000`, mas o sucesso do upsert não faz `setQueryData`, `invalidateQueries` nem `removeQueries` nessa key. Num remount/navegação dentro de 60 segundos:

- se o cache contém `[]` de antes do primeiro registro, ele é tratado como resposta fresca e a tela volta para a chegada, embora a linha exista no banco;
- se o cache contém a versão anterior de um check-in refeito, o efeito aceita o mesmo fingerprint do aparelho e restaura o PSR antigo sobre o contexto atual.

Como a aplicação da resposta acontece em efeito e `reconciling` exige `isLoading`, um resultado fresco de cache também pode pintar a chegada por um frame antes de virar `done`, contrariando o contrato de não piscar “pendente”.

**Correção proposta:** obter o `QueryClient` no dashboard e atualizar/inutilizar atomicamente a key após cada upsert do check-in; preferencialmente gravar no cache a linha retornada completa ou forçar consulta atual no próximo cold start. Tratar reconciliação ainda não aplicada como pending mesmo quando `data` veio pronta do cache. Testar cache vazio → registrar → remount e PSR 7 → refazer como 3 → remount, ambos antes de 60s.

### 4. MAJOR — Alternativa escondida por fingerprint pode ressuscitar em A→B→A e entrar no próximo commit

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:246-252`, `333-348`, `417-423`, `594-602`.

Quando o fingerprint muda, `scopedAlternative` vira `null`, mas `rawSelectedAlternative` nunca é destruída. O efeito da máquina apaga somente `checkInRecord`. Se o fingerprint voltar ao valor anterior — por exemplo, Whoop fresh → stale → sincronizado/fresh sem mudança de score — a alternativa antiga volta a casar e reaparece no funil. O comentário diz que a escolha é “limpa”, mas o código apenas a oculta temporariamente.

No estado `pending` a composição esconde a conduta, então o coach pode confirmar o PSR sem perceber que o `prospectiveConduct` incluirá a alternativa antiga. Isso viola a destruição A→B→A preparada pela B1.

**Correção proposta:** na primeira divergência de fingerprint, limpar de forma atômica o `selectedAlternative`; preservar apenas o número do PSR em um estado de rascunho separado e impedir que objetos de avaliação antigos voltem a ser válidos. Testar fresh → stale → fresh e provar que a alternativa não retorna nem entra no próximo registro.

### 5. MAJOR — A seleção multi-vigente pode vazar entre alunas e escolher silenciosamente uma prescrição compartilhada

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:373-382`, `1337-1350`; `src/hooks/useLoadSuggestions.ts:237-243`.

`selectedLoadPrescriptionId` é estado local sem reset por `studentId`. Ao navegar entre duas rotas `/alunos/:id` que reutilizam a instância do componente, o id escolhido para a aluna A segue para a consulta da aluna B. Como prescrições são templates compartilháveis, se B também tiver esse id entre duas vigentes, `computeLoadSuggestions` o encontra e pula `selection_required`: o seletor único ratificado nem aparece e a sessão abre com uma escolha que o coach não fez para B.

**Correção proposta:** resetar `selectedLoadPrescriptionId` sincronamente ao trocar de aluna (ou escopá-lo por `studentId`) antes de habilitar a query/CTA. Cobrir A escolhe plano compartilhado P → navegar para B com P+Q vigentes → B continua em `selection_required`.

### 6. MINOR — O layout mobile da chegada não implementa o full-width/centralização ratificados em v8.2/v8.3

**Onde:** `src/components/checkin/CheckInForm.tsx:114-155`.

O botão tem altura 44px, mas não recebe `w-full` no mobile; permanece com largura intrínseca. A quietrow também não tem `justify-center` nem fallback de wrap. No desktop, o slot começa na borda esquerda do formulário, não alinhado ao primeiro número da escala. Isso diverge diretamente da composição `.app` e das medidas de v8.3, numa tela usada em pé no celular.

**Correção proposta:** estruturar label/escala/slot numa grade responsiva; usar `w-full sm:w-auto` no Registrar, centralizar a quietrow no mobile com wrap seguro e alinhar slot/quietrow à coluna da escala no desktop. Fazer QA visual real em 390px e desktop, inclusive com fonte ampliada.

### 7. MINOR — ArrowUp/ArrowDown estão invertidas em relação ao padrão ARIA de radiogroup

**Onde:** `src/components/checkin/CheckInForm.tsx:42-55`.

O código trata `ArrowUp` como próximo valor e `ArrowDown` como anterior. No padrão de radio group, direita/baixo avançam e esquerda/cima retrocedem. As teclas são consumidas corretamente nos limites, mas a direção vertical surpreende usuários de teclado e tecnologia assistiva.

**Correção proposta:** mapear `ArrowRight`/`ArrowDown` para `+1` e `ArrowLeft`/`ArrowUp` para `-1`; adicionar asserts para as quatro setas.

### 8. MINOR — Refs e feedback efêmero não são escopados por aluna

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:235-243`, `504-568`, `608`, `731-734`.

Na troca de `studentId`, apenas `editingCheckIn` é resetado. `lastRegisteredVerdictRef`, `skipHintShownRef`, `liveAnnouncement` e `reconciliationFailed` sobrevivem. Isso pode comparar o primeiro check-in de B com o último veredito de A e emitir um toast falso de “Conduta atualizada”; também suprime para B o aviso do primeiro skip e pode exibir transitoriamente a falha de reconciliação de A.

**Correção proposta:** centralizar um reset por `studentId` para todo estado/ref efêmero do atendimento, sem apagar o estado global legitimamente escopado. Testar troca A→B sem remount.

### 9. MINOR — O upsert do check-in não invalida o histórico de percepção

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:518-552`; `src/components/StudentObservationsCard.tsx:260-282`.

O diálogo de observação invalida `perception-history`, mas o produtor principal desse histórico — `upsertPerceptionObservationV2` — não invalida a query. Se a seção já foi consultada, ela pode continuar mostrando PSR/conduta anteriores pelo `staleTime` e não refaz em foco de janela.

**Correção proposta:** no sucesso do check-in, invalidar por prefixo `['perception-history', studentId]` junto da atualização da key de reidratação. Cobrir registrar/refazer → abrir histórico → linha atualizada.

## Gates executados

- `git diff --check main...HEAD`: passou.
- `npx tsc -b --force`: passou.
- `npx vitest run`: **110 arquivos passaram, 1 pulado; 2.053 testes passaram, 33 pulados**.
- `npm run lint`: passou sem erros; 4 warnings em `WhoopActivityCard.tsx`, `OuraTabContent.tsx` e `WhoopTabContent.tsx`, todos fora deste diff.

Os gates não contradizem os achados: os testes RTL novos cobrem o `CheckInForm` isolado, enquanto boa parte da cobertura do dashboard lê o arquivo como string. Não há teste comportamental montando dashboard + QueryClient + persistência para as sequências assíncronas acima.

## Critério objetivo para GO

Corrigir e provar por testes de integração os achados 1–5. Os MINORs 6–9 cabem no escopo ratificado desta PR e devem ser fechados antes do cutover, especialmente por envolverem o uso mobile, acessibilidade e feedback entre alunas. Depois, repetir os três gates e fazer QA visual da chegada/reveal em 390px e desktop.
