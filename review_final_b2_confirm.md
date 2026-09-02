# Confirmação da revisão final — PR-B2 cutover do check-in v3

Commit revisado: `6e49548af70011fd0f2878f788ed01b536fa1160`  
Escopo: os 9 achados de `review_final_b2.md`, os arquivos finais do HEAD e regressões introduzidas pelas correções.

## Veredito

**NO-GO para merge.** Os três gates passam e as correções declaradas estão presentes, mas a correção do BLOCKER 1 ainda não garante que a conduta persistida seja a última alternativa exibida. Duas escolhas sucessivas podem concorrer, liberar “Iniciar treino” cedo e terminar com o prontuário numa conduta diferente da tela. Restam também dois MAJORs no mesmo fluxo assíncrono: re-persistência indevida ao remontar/reidratar e ausência de invalidação quando um upsert bem-sucedido cai no guard de versão.

## Achados restantes

### 1. BLOCKER — Duas alternativas concorrentes podem liberar o treino e deixar no banco a alternativa errada

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:624-667`, `1448-1469`, `1856-1880`.

O efeito marca `lastPersistedAlternativeRef.current = altKey` antes do `await` e dispara `persistConductUpdate()` sem token de geração, fila ou exclusão mútua. `conductSyncState` é um único estado compartilhado, e “Ver alternativas” continua habilitado durante `saving`.

Sequência reproduzível pelo código:

1. Com check-in `done`, escolher alternativa A dispara upsert A e põe o estado em `saving`.
2. Reabrir “Ver alternativas” e escolher B antes da resposta dispara upsert B.
3. A primeira promise que resolver põe `conductSyncState` em `idle`, embora a outra ainda esteja em voo; o CTA fica habilitado com a conduta B na tela.
4. Se A terminar depois de B, o upsert A sobrescreve a mesma linha por `{aluna, dia, fonte}` e deixa o prontuário em A. Como a ref já contém B, não há nova tentativa automática nem erro visível.

Isso reproduz a divergência clínica/auditável que o achado 1 deveria bloquear. A correção precisa ter semântica latest-wins (token de versão conferido antes de publicar sucesso e/ou serialização) e manter o CTA bloqueado até a persistência da alternativa atualmente exibida. O seletor também não pode abrir uma segunda mutação sem coordenação.

### 2. MAJOR — Remount/reidratação com alternativa global retida dispara um upsert sem nova escolha

**Onde:** `src/contexts/TrainingContext.tsx:69-95`, `src/components/PersonalizedTrainingDashboard.tsx:241-251`, `624-667`, `717-769`; provider global em `src/App.tsx:67-75`.

`selectedAlternative` e `checkInRecord` vivem no `TrainingProvider`, mas `lastPersistedAlternativeRef` nasce `null` a cada montagem do dashboard. Assim, sair e voltar à aba Treinamento com check-in `done` e alternativa já persistida faz o efeito interpretar a alternativa retida como mudança nova e regravar a linha. Na reidratação do banco, o código também força a ref para `null` antes de publicar `done`, produzindo o mesmo resultado quando existe alternativa retida.

Além da escrita redundante, o upsert troca o campo textual `registrado=` pelo horário atual embora preserve `registrado_iso`; se a rede falhar, bloqueia “Iniciar treino” com erro apesar de a conduta já estar persistida. A montagem/reidratação deve inicializar a identidade persistida sem disparar uma mutação clínica, ou o registro precisa carregar informação suficiente para distinguir “já persistida” de “nova escolha”.

### 3. MAJOR — Upsert bem-sucedido pode retornar antes das duas invalidações

**Onde:** `src/components/PersonalizedTrainingDashboard.tsx:538-579`.

Depois de `upsertPerceptionObservationV2`, o guard `conductVersionRef.current !== startedVersion` retorna nas linhas 556-562. As invalidações de `['checkin-rehydrate', studentId]` e `['perception-history', studentId]` só vêm depois, nas linhas 578-579. Portanto, “sucesso do upsert invalida” não é verdadeiro quando a conduta muda durante a gravação.

Num refazer, isso permite: cache com PSR antigo → upsert do PSR novo conclui → versão muda durante o voo → retorno sem invalidar → remount dentro do `staleTime` reidrata o PSR antigo. A invalidação deve ocorrer imediatamente após todo upsert bem-sucedido, antes de qualquer retorno que descarte apenas os efeitos locais daquela versão.

## Confirmação dos 9 itens

- **1:** implementação nominal presente — re-persistência, preservação de `psr`/`registrado_iso`, bloqueio do CTA e retry existem — mas **não fechada** por causa dos achados 1 e 2 acima.
- **2:** **confirmado**. Descanso usa `source: "descanso"`, ocupa slot separado no upsert, é rejeitado pela igualdade de fonte na reidratação e aparece como “Descanso” no histórico. A contagem clínica continua excluindo a categoria técnica inteira, portanto a nova linha não infla esse contador.
- **3/9:** implementação nominal presente nos dois caminhos, e `reconciledStudent` evita a chegada antes de aplicar cache pronto — mas **não fechada em todos os sucessos** por causa do achado 3.
- **4:** **confirmado**. A divergência de fingerprint chama `setSelectedAlternative(null)`; A→B→A não reaproveita o objeto anterior.
- **5:** **confirmado**. `loadChoice` carrega `{studentId, id}` e o id derivado é `null` já no primeiro render da outra aluna.
- **6:** **confirmado no código e no RTL existente**. Grade responsiva, botão full-width no mobile e quietrow com wrap/centralização estão presentes. Não encontrei regressão estrutural no teste de componente.
- **7:** **confirmado**. Direita/baixo avançam, esquerda/cima retrocedem, e o RTL percorre as quatro teclas.
- **8:** **confirmado para a lista declarada**. O efeito por `studentId` limpa `editingCheckIn`, `conductSyncState`, `liveAnnouncement`, `lastRegisteredVerdictRef`, `skipHintShownRef` e `lastPersistedAlternativeRef`. O estado derivado de prescrição já fica isolado de forma síncrona pelo item 5.

## Gates executados no HEAD

- `npx tsc -b --force`: **PASS**.
- `npx vitest run`: **PASS** — 110 arquivos passaram, 1 pulado; 2.054 testes passaram, 33 pulados.
- `npm run lint`: **PASS sem erros** — 4 warnings preexistentes/fora deste diff em `WhoopActivityCard.tsx`, `OuraTabContent.tsx` e `WhoopTabContent.tsx`.

## Dívida declarada

A ausência, nesta PR, dos testes de integração dashboard + QueryClient + persistência para os itens 1–5 e do RTL integral permanece registrada para a PR-D, conforme declarado. Não usei essa dívida isoladamente como motivo de NO-GO; o veredito decorre das sequências incorretas demonstráveis no código atual. Os asserts source-based adicionados confirmam presença de trechos, mas não exercitam ordenação, remount/reidratação ou concorrência das promises.

## Critério objetivo para GO

Garantir latest-wins na re-persistência de alternativa; impedir upsert apenas por remount/reidratação de estado já persistido; mover as duas invalidações para o caminho comum imediatamente após todo upsert bem-sucedido; então repetir os três gates e conferir, ao menos com teste dirigido, as sequências A→B com promises resolvendo fora de ordem, sair/voltar à aba com alternativa retida e refazer com mudança de versão durante o voo.
