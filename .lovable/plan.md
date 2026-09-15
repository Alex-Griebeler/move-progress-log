# Plano — usar PSR quando não houver recuperação fechada de hoje

## Decisão recomendada

Na aba **Treinamento**, um dado objetivo só pode orientar o treino quando houver um score fechado com `date = hoje` no calendário da Fabrik (`America/Sao_Paulo`). Um score fechado de ontem ou de qualquer dia anterior continua disponível nas abas e no histórico, mas deixa de alimentar a conduta de hoje.

Quando nenhum aparelho tiver score fechado hoje, a tela entra no fluxo **PSR-only** já previsto no domínio. O estado informado ao treinador continua distinto:

- score ainda não pontuado/processando;
- noite sem score utilizável;
- nenhum dispositivo conectado;
- falha ao carregar os dados.

A falha de consulta continua suspendendo a decisão; ela não pode ser convertida em “sem dado”.

## A. Definição precisa de “sem dado da última noite”

### Whoop

Para `today = spToday()`:

1. **Fechado hoje:** existe linha de hoje com `recovery_score !== null` e `score_state` igual a `SCORED`; `score_state = null` só continua aceito para legado quando há `recovery_score`.
2. **Ainda não pontuado:** existe linha de hoje com `score_state = PENDING_SCORE`; também tratar como “ainda não pontuado” uma linha atual com `recovery_score = null` e estado nulo/desconhecido, sem prometer que fechará.
3. **Não pontuável:** existe linha de hoje com `score_state = UNSCORABLE`; é terminal e não deve usar a frase “quando fechar”.
4. **Sem dado da última noite:** não existe linha de hoje. `last_sync_at` informa quando houve tentativa de sincronização, mas não prova se a pessoa ainda dorme, acabou de acordar ou não sincronizou o aparelho.

O banco permite distinguir `PENDING_SCORE` de `UNSCORABLE` e de linha ausente. Ele **não permite afirmar que a pessoa está dormindo**. A cópia deve descrever o dado, não inferir o comportamento da pessoa.

### Oura

1. **Fechado hoje:** existe linha de hoje com `readiness_score !== null`.
2. **Ainda não pontuado:** existe linha de hoje, mas `readiness_score = null`. O banco não possui um `score_state` equivalente ao Whoop; portanto, é possível afirmar apenas “a prontidão de hoje ainda não foi pontuada”, não “está processando”.
3. **Sem dado da última noite:** não existe linha de hoje. `oura_connections.last_sync_at` e `oura_sync_logs` distinguem tentativa recente, falha e `outcome = no_data`, mas nem mesmo um sync bem-sucedido sem dados distingue “ainda dormindo” de “o anel não enviou dados”.

Não é necessária migration para esta regra. A distinção segura usa as linhas já carregadas; logs/conexão servem apenas como contexto operacional, não como diagnóstico fisiológico.

## B. Seleção entre Oura e Whoop

- Se os dois têm score fechado hoje: manter o desempate atual, **Oura**.
- Se somente um tem score fechado hoje: esse aparelho orienta o treino, mesmo que o outro esteja pendente, inscorável ou sem linha.
- Se nenhum tem score fechado hoje: usar PSR-only; nunca recorrer ao último score fechado anterior.
- Se uma consulta falhar: manter a recomendação suspensa, pois pode existir um score de hoje na fonte que falhou.

Sugestões de texto:

- PSR por ausência: **“Sem dados da última noite. A orientação de hoje será calculada pela percepção de recuperação (PSR).”**
- Whoop pendente: **“O recovery de hoje ainda está sendo processado pelo Whoop. A orientação de hoje será calculada pela PSR.”**
- Whoop inscorável: **“O Whoop não conseguiu pontuar o recovery de hoje. A orientação de hoje será calculada pela PSR.”**
- Oura sem prontidão: **“A prontidão de hoje ainda não foi pontuada pelo Oura. A orientação de hoje será calculada pela PSR.”**
- Sem dispositivo: **“Sem dispositivo conectado. A orientação de hoje será calculada pela PSR.”**
- Antes da resposta: **“Responda à PSR para calcular a orientação de hoje.”**
- Skip sem PSR e sem score: **“Sem dados suficientes para orientar o treino de hoje.”**

Quando um aparelho fechado orientar e o outro estiver pendente, usar nota secundária factual, por exemplo: **“Whoop ainda não pontuou hoje; conduta calculada com Oura.”**

## C. Pontos de mudança

1. **Seleção diária — `recoverySnapshot.ts`**
   - Selecionar somente score fechado de `today`, sem fallback para dia anterior.
   - Expor uma classificação pura da disponibilidade de hoje por fonte: `scored`, `pending`, `unscorable` ou `missing`.
   - Manter as faixas de score e o desempate Oura.

2. **Adaptadores — `recoveryAdapters.ts` e `useTrainingRecommendation.ts`**
   - Não mudar as fórmulas nem aceitar scores incompletos.
   - Manter `ouraToRecoveryInput` e `whoopToRecoveryInput` retornando `null` sem score fechado.
   - A mudança é anterior aos adaptadores: eles receberão somente a linha fechada de hoje. Históricos anteriores continuam entrando apenas em baseline/histórico.

3. **Dashboard — `PersonalizedTrainingDashboard.tsx`**
   - Remover o retorno terminal que hoje bloqueia o check-in quando não há snapshot.
   - Ativar `psrOnlyMode` sempre que as consultas terminaram sem erro e nenhum aparelho tem score fechado hoje — com ou sem dispositivo conectado.
   - Construir a recomendação PSR somente depois de um PSR válido; antes disso, mostrar formulário e nenhuma conduta/carga.
   - No modo PSR, não chamar a matriz aparelho × percepção de `computeEffectiveConduct`: a banda de `buildPsrOnlyRecommendation` já é a própria conduta e nunca gera progressão.
   - Usar `today` como data operacional do modo PSR e ocultar anel 0–100, fisiologia, alertas e protocolos de aparelho.

4. **Conexões — `StudentDetailPage.tsx` / props do dashboard**
   - Entregar ao dashboard o estado de conexão Oura já consultado e considerar o estado Whoop existente apenas para escolher a cópia “sem dispositivo” versus “sem noite”.
   - Não usar conexão ou horário de sync para fabricar um score ou afirmar que a pessoa dorme.

5. **Fingerprint e check-in**
   - Criar fingerprint estável do contexto PSR: `studentId|psr|today`, independente do valor respondido e do motivo (`pending`, `missing`, `unscorable`). Isso evita ciclo entre resposta, recomendação e fingerprint.
   - Se um score objetivo chegar no meio do dia, a fonte muda de `psr` para `oura/whoop`; o fingerprint muda, o check-in anterior é invalidado para a conduta nova e o PSR fica como rascunho para reconfirmação, seguindo a regra atual.
   - Mudanças apenas entre `pending/missing/unscorable`, sem mudança da fonte da conduta, preservam o check-in.

6. **Tipos e persistência — `TrainingContext.tsx`, `checkin.ts`, `perceptionObservation.ts`**
   - Permitir `source: "psr"` no estado de avaliação.
   - Persistir `fonte=psr`, `score=<próprio PSR>`, `psr=<valor>` e `dia_snapshot=<hoje>`; o formato v2 e o card de observações já suportam isso.
   - Generalizar o texto interno de `buildPsrOnlyRecommendation`, hoje específico para “sem dispositivo conectado”, para cobrir também noite ausente.
   - Não reescrever registros históricos.

7. **Máquina visual — `trainingHeroState.ts`**
   - Manter o comportamento já testado: PSR pendente mostra check-in; PSR registrado mostra conduta; PSR 0–1 mostra descanso sem protocolos; skip sem PSR vira sessão livre, sem conduta e sem cargas.
   - Atualizar apenas a definição/comentários de `psrOnlyMode`, que passa a significar “sem score objetivo fechado hoje”, não somente “sem dispositivo”.

8. **Avisos de dado antigo**
   - Remover da aba Treinamento o badge “ontem”, o uso clínico de `isStale` e a frase “mostrando o último dia fechado”, porque dado anterior não será mais usado na conduta.
   - Manter datas antigas e seus avisos nas abas Oura/Whoop e nos históricos.
   - Manter o aviso operacional de sincronização Whoop acima de 3 horas somente quando houver score Whoop de hoje; ele continua contextualizando strain, não substitui o critério diário.

## D. Riscos e comportamento esperado

- **Fonte muda no meio do dia:** score objetivo chegando substitui PSR-only, invalida a conduta/check-in anterior e exige reconfirmação. Não trocar silenciosamente mantendo o “Registrado”.
- **Check-in já respondido:** o registro PSR permanece no prontuário como fato histórico. Uma nova confirmação com wearable pode criar outro registro do mesmo dia, com fonte diferente; isso é auditável e não deve sobrescrever o primeiro.
- **Histórico e relatórios:** métricas antigas permanecem intactas. O histórico de percepção já reconhece `fonte=psr` e escala 0–10; testar que nenhuma apresentação trata esse valor como score 0–100 ou agrega fontes diferentes.
- **Sem PSR e sem noite:** nenhuma orientação e nenhuma carga são mostradas. Se o treinador escolher “Iniciar sem check-in”, manter a sessão livre já prevista, sem fingir uma recomendação.
- **Falha de consulta:** não cair em PSR-only automaticamente; mostrar erro e suspender ação, pois “não carregou” não significa “não existe”.

## E. Execução incremental — um passo por mensagem

### Passo 1 — contrato diário puro

Alterar a seleção do snapshot para aceitar apenas hoje e produzir os estados de disponibilidade de Oura/Whoop. Cobrir em testes: hoje fechado; ontem fechado sem hoje; Whoop pendente; Whoop inscorável; Whoop nulo/desconhecido; Oura linha sem readiness; nenhuma linha; uma fonte fechada e outra pendente; ambas fechadas com desempate Oura; erros permanecem externos ao helper.

**Prova:** testes unitários do snapshot mostram que nenhum score anterior vira recomendação de hoje.

### Passo 2 — ativar PSR-only e fingerprint

Conectar `buildPsrOnlyRecommendation`, ampliar o tipo de fonte do check-in e criar o fingerprint `student|psr|today`. Preservar a matriz objetiva quando houver score de hoje e usar a banda direta 7–10 / 4–6 / 2–3 / 0–1 quando não houver.

**Prova:** testes puros e da máquina visual mostram PSR 8→manter, 5→reduzir 20%, 2→recuperação, 0→descanso; nenhuma progressão; pending→missing preserva check-in; PSR→wearable invalida check-in.

### Passo 3 — integrar a tela e a persistência

Substituir o estado vazio pelo formulário PSR, aplicar as cópias por estado, persistir `fonte=psr` e manter o fluxo de carga/sessão. Ajustar a passagem do estado de conexão Oura para diferenciar “sem dispositivo” de “sem noite”.

**Prova:** testes de componente cobrem:

1. Whoop hoje pendente + score de ontem → aviso pendente + formulário PSR, sem score/conduta antiga;
2. Whoop hoje inscorável → aviso terminal + PSR;
3. Oura hoje sem readiness + ontem fechado → aviso “ainda não pontuada” + PSR;
4. nenhuma linha hoje + dispositivo ativo → “Sem dados da última noite” + PSR;
5. nenhum dispositivo → cópia própria + PSR;
6. Oura fechado hoje + Whoop pendente → conduta Oura e nota secundária;
7. Whoop fechado hoje + Oura sem prontidão → conduta Whoop e nota secundária;
8. sem PSR → nenhuma orientação/carga; skip → sessão livre;
9. score objetivo chega após check-in PSR → volta a pedir confirmação;
10. registro PSR aparece corretamente no histórico sem escala 0–100.

### Passo 4 — validação visual e publicação

Validar desktop e celular na aba Treinamento, incluindo troca de fonte no mesmo dia, textos sem sobreposição, ausência do anel antigo e estados de carregar/erro. Rodar os testes direcionados do snapshot, check-in, máquina visual e dashboard.

Publicar **somente o frontend**. Não há migration, alteração de dados, sincronização nem publicação de edge functions.

## Aplicação no fork pessoal

A regra clínica e os utilitários são reutilizáveis. O que é específico da Fabrik é a apresentação em português, o calendário operacional `America/Sao_Paulo`, a integração com o prontuário/observações e o estilo visual da tela. A lógica não depende da ausência de máquinas e não exige mudança no catálogo de exercícios do fork.
