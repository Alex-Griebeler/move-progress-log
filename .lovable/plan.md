# Redesenho da página de detalhe do cliente

## Objetivo

Reorganizar `/alunos/:id` para que o treinador encontre rapidamente: quem é o cliente, o que foi planejado, o que fazer hoje, o que já foi realizado e como está evoluindo. A proposta preserva todas as ações atuais, os oito IDs de abas (`training`, `overview`, `sessions`, `exercises`, `prescriptions`, `assessments`, `oura`, `whoop`) e os links `?tab=` existentes.

## A) Mapa atual

| Informação ou função | Onde aparece hoje | Duplicação ou problema |
|---|---|---|
| Avatar e nome | Cabeçalho | Sem duplicação relevante; são contexto persistente. |
| Idade | Cabeçalho; recalculada como padrão em Avaliações | Duas fórmulas diferentes podem divergir em 1 ano. |
| Nível de fitness | Chip no cabeçalho; edição do cadastro | O cabeçalho mistura identidade com informação de treino. |
| Objetivos | Chips no cabeçalho; objetivo de cada prescrição em Prescrições; edição | Conceitos relacionados, mas sem uma área única que explique o plano proposto. |
| Sexo, peso e altura | Edição do cadastro; usados como padrões em Avaliações | Não estão consultáveis em uma aba de perfil. |
| FC máxima | Edição; zonas de FC em Treinamento | O valor-base e seu uso ficam separados. |
| Preferências | Edição do cadastro | Não aparecem no acompanhamento normal. |
| Limitações e histórico de lesões | Visão geral, dentro de observações clínicas; edição | Área correta, mas misturada com indicadores operacionais. |
| Observações clínicas | Visão geral | Área única; deve continuar com criar/resolver. |
| Cadastro incompleto | Linha/alerta abaixo do cabeçalho; abre edição | Compete visualmente com o trabalho diário e ocupa muito espaço. |
| Meta semanal | Visão geral e tendência de Sessões | Duplicada: resumo mensal usa a mesma meta exibida na análise semanal. |
| Adesão mensal e últimas 4 semanas | Visão geral | Sobrepõe a análise de frequência de 8 semanas em Sessões. |
| Última sessão | Visão geral e lista de Sessões | Duplicada. |
| Quantidade de exercícios em 30 dias | Visão geral; derivada das Sessões | Resumo isolado, sem decisão associada. |
| Prescrições vigentes | Contagem em Visão geral; detalhes em Prescrições | Duplicada. |
| Prescrição vigente/futura/encerrada | Prescrições | Não responde claramente “o que foi proposto agora”. |
| Agenda, período, adaptações e preview do plano | Prescrições | Informação central para Treinamento, mas distante da ação diária. |
| Atribuir e excluir prescrição | Prescrições | Funções essenciais a preservar. |
| Prontidão/recovery atual | Treinamento; resumo e histórico em Oura/Whoop; Oura também em Visão geral | Principal duplicação da página. |
| Sono, HRV, FC de repouso, atividade/strain e estresse | Treinamento em “Fisiologia”; Oura/Whoop; parte no resumo Oura da Visão geral | Mesmos sinais aparecem como dado bruto e como suporte à decisão. |
| Check-in de percepção 0–10 | Treinamento | Único; inclui registrar, editar, refazer e pular. |
| Conduta do dia e alternativas | Treinamento | Único; deve permanecer ligado ao check-in e ao dispositivo escolhido pelo motor. |
| Alertas de recuperação | Treinamento; sinais equivalentes reaparecem nos históricos dos dispositivos | A mesma evidência é apresentada duas vezes com hierarquias diferentes. |
| Sugestões de carga | Treinamento | Único; depende da prescrição vigente e da conduta efetiva. |
| Iniciar sessão | Treinamento e ação global “Registrar sessão” | São entradas diferentes para o mesmo fluxo: uma leva prescrição pré-selecionada; a outra é administrativa. |
| Sessões realizadas | Sessões; última sessão e adesão em Visão geral | Duplicada em resumos. |
| Ver, editar, reabrir e finalizar sessão | Sessões e diálogos compartilhados | Único; preservar todos os caminhos e estados. |
| Registro de sessão por voz | Cabeçalho, Treinamento e Sessões | Ação repetida, mas com contextos diferentes; deve usar o mesmo fluxo central. |
| Evolução de carga, top-set, PR, volume e histórico por exercício | Exercícios | Único e bem delimitado. |
| Avaliações, filtros, histórico e detalhe | Avaliações | Único; recebe idade, sexo, peso e altura como padrões. |
| Relatórios | Botão no cabeçalho, página separada | Correto como destino externo ao conjunto de abas. |
| Oura: prontidão, sono, atividade, estresse, treinos e métricas avançadas | Oura - Histórico; resumos em Treinamento e Visão geral | Duplicação de prontidão, sono, HRV, FC e atividade. |
| Whoop: recovery, strain, sono, HRV, FC e métricas avançadas | Whoop; resumos em Treinamento | Duplicação de recovery, sono, HRV, FC e strain. |
| Estado, última atualização, conectar, sincronizar, diagnosticar e revogar dispositivo | Linha abaixo do nome e rodapé das abas Oura/Whoop | Gestão fragmentada; dispositivo desconectado ocupa espaço permanente. |

## B) Nova estrutura

### Princípio de propriedade da informação

Cada dado tem uma aba “dona”. Outras abas podem mostrar apenas uma consequência operacional e um link para a fonte. Exemplo: **Treinamento** mostra “reduzir intensidade hoje” e “baseado no Oura”, mas sono, HRV e score bruto aparecem somente em **Oura**.

| ID preservado | Novo título | Pergunta respondida | Conteúdo proprietário | Visibilidade |
|---|---|---|---|---|
| `training` | **Treinamento** | “O que foi proposto e como conduzir o treino de hoje?” | Objetivos; frequência proposta; agenda disponível já registrada; plano vigente e futuro; adaptações; preview dos exercícios; check-in; conduta; alertas interpretados; sugestões de carga; iniciar sessão. Sem repetir números brutos do dispositivo. | Sempre; aba inicial. |
| `overview` | **Perfil** | “Quem é este cliente e o que preciso considerar?” | Nascimento/idade, sexo, peso, altura, FC máxima, nível, preferências, limitações, lesões, observações clínicas e completude cadastral. | Sempre. |
| `sessions` | **Sessões** | “O que foi realmente feito e com que regularidade?” | Meta semanal, adesão, última sessão, frequência e volume por semana, lista de sessões, detalhes e ações de registrar/ver/editar/reabrir/finalizar. Check-in histórico aparece apenas dentro da sessão à qual foi vinculado. | Sempre. |
| `exercises` | **Evolução** | “Como cargas e desempenho evoluíram por exercício?” | Seletor de exercício, carga atual, PR, tendência, volume, gráfico e histórico de séries/repetições/carga/observações. | Sempre. |
| `prescriptions` | **Planos anteriores** | “Quais propostas já foram encerradas?” | Somente prescrições encerradas, com período, objetivo, adaptações e preview. Planos vigentes/futuros são propriedade de Treinamento; esta aba pode ter link “Abrir plano atual”. | Sempre; usar estado vazio quando não houver histórico. |
| `assessments` | **Avaliações** | “O que os testes mostram ao longo do tempo?” | Nova avaliação, filtros, resultados, comparação, histórico e detalhe técnico autorizado. | Sempre. |
| `oura` | **Oura** | “O que o Oura mediu e como evoluiu?” | Status de atualização, prontidão, sono, HRV, FC, atividade, estresse, treinos e métricas avançadas em 7/30/90 dias. | Somente com conexão Oura ativa. |
| `whoop` | **Whoop** | “O que o Whoop mediu e como evoluiu?” | Status de atualização, recovery, strain, sono, HRV, FC e métricas avançadas em 7/30/90 dias. | Somente com conexão Whoop ativa. |

**Compatibilidade:** os valores técnicos permanecem iguais. Se uma conexão for revogada enquanto sua aba está ativa, mudar para `training` e atualizar `?tab=training`; links antigos para `oura`/`whoop` sem conexão também caem em `training` com aviso discreto. A aba `prescriptions` mantém o ID, mesmo com o título mais específico.

## C) Cabeçalho

### Fica
- Voltar, avatar, nome e idade como contexto mínimo.
- **Registrar sessão** como ação principal.
- **Relatórios** e **Editar** no desktop.
- No mobile: Registrar sessão visível; Relatórios, Editar e Gerenciar dispositivos em menu de ações, sem perder nenhuma função.

### Sai do cabeçalho
- Chips de nível e objetivos: nível vai para Perfil; objetivos vão para Treinamento.
- “Cadastro incompleto” como faixa global.
- Estados de dispositivos desconectados.
- Decoração animada, brilho e excesso de badges.

### Novo destino de cadastro incompleto
- No topo de **Perfil**, uma seção compacta “Cadastro” mostra completude, campos ausentes e ação “Completar cadastro”.
- No cabeçalho, apenas um pequeno indicador junto de Editar quando houver pendência; sem listar campos ali.

### Novo destino dos dispositivos
- Abaixo do nome, exibir uma única linha somente quando houver conexão ativa: `Oura · atualizado há 7 min` e/ou `Whoop · atualizado há 12 min`.
- Cada item abre sua própria aba. Não mostrar “sem vínculo”.
- “Gerenciar dispositivos” fica no menu de ações e abre o painel existente para convidar, sincronizar e revogar. Dentro das abas conectadas, uma ação secundária “Gerenciar” abre o mesmo painel.
- Revogação mantém confirmação explícita e informa que o histórico será preservado.

## D) Esboços de layout

### Estrutura comum

**Desktop**
```text
Breadcrumb
[avatar] Nome · idade                [Editar] [Relatórios] [Registrar sessão]
         Oura · atualizado há 7 min
──────────────────────────────────────────────────────────────────────────
Treinamento | Perfil | Sessões | Evolução | Planos anteriores | Avaliações | Oura | Whoop
──────────────────────────────────────────────────────────────────────────
Título da aba + ação contextual
Conteúdo principal em grade de 12 colunas; sem barra lateral permanente
```

**Mobile 375 px**
```text
[voltar] [avatar] Nome                         [⋯]
                 Oura · há 7 min
[ Registrar sessão ]
[ Seção atual: Treinamento  ▾ ]  ← seletor abre lista de abas disponíveis
Título da seção
Conteúdo em uma coluna
```

No mobile, evitar oito abas comprimidas ou escondidas por rolagem. O seletor mantém os mesmos IDs e atualiza o parâmetro da URL. Áreas de toque mínimas de 44 px, tabelas viram listas ou têm rolagem interna identificável, e a ação principal não encobre conteúdo.

### `training` — Treinamento
- **Desktop:** primeira faixa “Plano atual” em 8 colunas e “Disponibilidade” em 4; abaixo, “Hoje” em sequência: estado/check-in → conduta → sugestão de carga → iniciar sessão. Alertas ficam imediatamente antes da ação afetada. Planos futuros vêm abaixo; atribuir plano é ação no título.
- **Mobile:** objetivos e frequência em resumo curto; agenda em lista por dia; exercícios do plano em expansão; depois check-in 0–10, conduta, cargas e botão de início em uma coluna.
- **Vazios:** sem plano vigente oferece “Atribuir prescrição”; sem agenda informa “Agenda não definida”; sem dispositivo/check-in mantém treino possível, mas explica por que não há modulação automática; erro de dispositivo nunca vira “sem dados”.

### `overview` — Perfil
- **Desktop:** “Cadastro” e “Dados físicos” lado a lado; “Contexto do treino” (nível, preferências, FC máxima) abaixo; limitações, lesões e observações clínicas em bloco de largura total.
- **Mobile:** cadastro/completude primeiro; dados físicos em pares; contexto; alertas clínicos; observações com ações no próprio item.
- **Vazios:** cada campo ausente mostra `—`; observações vazias mostram “Nenhuma observação clínica ativa” com ação de adicionar; pendências nunca são confundidas com erro de carregamento.

### `sessions` — Sessões
- **Desktop:** cabeçalho com Registrar sessão; faixa única de aderência (meta, realizadas, tendência de 8 semanas e volume); filtros; sessões agrupadas por semana em grade.
- **Mobile:** resumo de aderência horizontal compacto; filtros roláveis; sessões em lista com menu de ações. Detalhe, edição e reabertura permanecem em painel/modal.
- **Vazios:** “Nenhuma sessão registrada” com CTA; filtro vazio oferece limpar filtro; falha de consulta oferece tentar novamente sem sugerir criar duplicata.

### `exercises` — Evolução
- **Desktop:** seletor pesquisável; quatro indicadores; gráfico amplo; tabela histórica.
- **Mobile:** seletor full-width; indicadores 2×2; gráfico com altura fixa; tabela convertida em linhas empilhadas por data.
- **Vazios:** sem sessões com exercícios explica a origem do histórico; exercício sem cargas mantém séries/repetições e diz “sem carga registrada”.

### `prescriptions` — Planos anteriores
- **Desktop:** filtros por período/status se o volume justificar; lista cronológica de planos encerrados; preview em painel lateral.
- **Mobile:** lista compacta, um plano por linha; detalhes em painel de tela cheia.
- **Vazios:** “Nenhum plano encerrado”; link para Treinamento, onde ficam plano atual, futuros e atribuição.

### `assessments` — Avaliações
- **Desktop:** título e Nova avaliação; resumo mais recente; filtros; histórico por data; detalhe em painel lateral.
- **Mobile:** CTA full-width; filtros em rolagem horizontal; resultados em lista; detalhe em tela cheia.
- **Vazios:** primeira avaliação com CTA; filtro sem resultado permite limpar; erro preserva distinção de “nenhuma avaliação”.

### `oura` — Oura
- **Desktop:** última atualização e Gerenciar; períodos 7/30/90; subáreas Resumo, Sono, Atividade, Estresse, Treinos e Avançado. Um indicador atual por métrica e uma série temporal — sem repetir na Treinamento.
- **Mobile:** período em controle segmentado; resumo vertical; gráficos com altura estável; tabelas viram listas diárias expansíveis.
- **Vazios:** a aba não existe sem conexão; conectada sem métricas informa processamento/sincronização; erro oferece tentar novamente. Diagnóstico técnico continua restrito a admin.

### `whoop` — Whoop
- **Desktop:** mesma gramática do Oura: atualização/Gerenciar, período, resumo de recovery, tendências de recovery/strain/sono e detalhe diário.
- **Mobile:** indicadores 2×2, gráficos empilhados e dias em lista expansível.
- **Vazios:** mesmas distinções entre “conectado aguardando dados”, erro e score em processamento; aba ausente sem conexão.

## Direção visual

- Paleta: superfícies areia muito claras, texto ardósia, bordas neutras e um único acento bronze por tela. Cores clínicas de sucesso/atenção/risco permanecem sem competir com o bronze.
- Tipografia: família principal sóbria; todos os números, datas, unidades, scores e cargas em fonte mono com alinhamento tabular.
- Cantos de 2–4 px, bordas finas, sombras mínimas; sem gradientes, brilho, shimmer, emojis ou cards aninhados.
- Hierarquia inspirada em Apple Saúde/Oura/Whoop para métricas, Linear para densidade e Things para clareza de ações. Movimento curto e funcional, respeitando redução de movimento.
- Todo texto novo usa “cliente” e “dispositivo”.

## E) Dados existentes versus funcionalidade nova

### Possível apenas reorganizando o que já existe
- Cabeçalho compacto, menu mobile e indicador condicional de dispositivos.
- Abas Oura/Whoop condicionais às conexões, cada uma separada.
- Perfil consultável com todos os campos já usados pelo formulário de edição.
- Plano vigente/futuro em Treinamento, com objetivo, período, agenda/adaptações, preview, atribuição e exclusão.
- Histórico de planos encerrados em `prescriptions`.
- Centralizar adesão, meta semanal e última sessão em Sessões.
- Manter check-in, conduta, alertas interpretados, sugestões de carga, alternativas e início de sessão.
- Manter relatórios, avaliações, observações clínicas, evolução por exercício e gestão/revogação de dispositivos.
- Calcular idade uma única vez e reaproveitar o mesmo valor.

### Exige funcionalidade ou dado novo
- **Disponibilidade real do cliente** fora da agenda de uma prescrição: hoje existe frequência semanal proposta e adaptações/agenda atribuída, não uma agenda geral de disponibilidade.
- **Explicação persistida de por que o plano atende objetivos/disponibilidade:** objetivos e plano existem, mas a justificativa explícita não é um dado estruturado.
- **Adesão por sessão agendada versus faltas/cancelamentos:** hoje é possível comparar volume realizado com meta, mas não há necessariamente estados de presença, falta e cancelamento.
- **Metas mensuráveis por objetivo** (peso-alvo, prazo, performance-alvo): não inferir a partir do rótulo do objetivo.
- **Feed unificado entre dispositivos:** não necessário para o redesenho e exigiria regra nova de normalização; manter cada dispositivo separado.

## F) Plano de execução em etapas pequenas

### 1. Contrato de informação e navegação
- Criar inventário tipado das abas com ID, título, ordem e regra de visibilidade.
- Definir propriedade única de cada campo e ação antes de mover componentes.
- **Risco:** quebrar `?tab=` ou abrir uma aba oculta.
- **Testar:** todos os oito IDs; fallback de parâmetro inválido; conexão/revogação enquanto Oura/Whoop está ativa; deep link de avaliação.

### 2. Cabeçalho e seletor mobile
- Compactar identidade e ações; mover pendências; condicionar a linha de dispositivos; implementar seletor de seção em 375 px.
- **Risco:** esconder Editar, Relatórios, Registrar sessão ou conexão de dispositivo.
- **Testar:** todas as ações em desktop e 375 px, teclado, leitores de tela, nomes longos, zero/um/dois dispositivos e cadastro completo/incompleto.

### 3. Perfil como fonte cadastral e clínica
- Reorganizar os campos existentes e observações sem mudar persistência.
- Unificar o cálculo de idade.
- **Risco:** perda de campos usados como padrão nas avaliações.
- **Testar:** valores nulos, edição, salvamento, avaliação nova com idade/sexo/peso/altura e permissões de observações.

### 4. Treinamento e histórico de planos
- Mover plano vigente/futuro, agenda, adaptações, preview e atribuição para Treinamento; deixar encerrados em Planos anteriores.
- Integrar visualmente plano → check-in → conduta → carga → início, sem alterar as regras.
- **Risco:** vazamento de prescrição entre clientes ou entre formas de abrir o registro.
- **Testar:** sem/uma/várias prescrições vigentes; futura/encerrada; atribuir/excluir; pré-seleção ao iniciar; fechamento limpa `sessionPrescriptionId`.

### 5. Sessões e Evolução
- Concentrar meta, adesão, última sessão, frequência e volume em Sessões; remover resumos duplicados do Perfil.
- Adaptar histórico de exercício para mobile sem mudar cálculos.
- **Risco:** divergência na contagem de sessões futuras ou no volume.
- **Testar:** meta × 4,33, sessões futuras excluídas da adesão, filtros, detalhe, edição, reabertura, finalização, voz, PRs e cargas nulas.

### 6. Oura e Whoop como fontes exclusivas de métricas
- Remover números brutos repetidos de Treinamento/Perfil; manter ali apenas consequência e link para a fonte.
- Centralizar status, atualização, sincronização, diagnóstico e revogação no painel de dispositivos e na aba conectada.
- **Risco:** alterar a recomendação ao tentar apenas mudar apresentação.
- **Testar:** janelas Oura de 30 dias e Whoop de 90 dias intactas; fonte escolhida, freshness, score pendente, dados antigos, erro parcial, conexão sem métricas e revogação com histórico preservado.

### 7. Polimento visual e acessibilidade
- Aplicar tokens ardósia/areia/bronze, mono numérico, cantos retos, estados de foco e movimento reduzido.
- **Risco:** contraste clínico insuficiente ou números truncados.
- **Testar:** contraste claro/escuro, zoom 200%, teclado, redução de movimento e larguras 375, 768, 1024 e 1440 px.

### 8. Regressão funcional e publicação controlada
- Testes de componentes para visibilidade das abas e propriedade única dos dados.
- Testes ponta a ponta dos fluxos críticos: check-in, conduta, alerta, carga, iniciar/registrar por voz, ver/editar/reabrir/finalizar sessão, prescrição, avaliação, relatório, edição e revogação confirmada.
- Comparar consultas antes/depois para preservar carregamento sob demanda e evitar tráfego extra.
- Publicar primeiro em ambiente de teste com clientes representando: cadastro incompleto, sem dispositivo, Oura, Whoop, ambos, sem sessões e múltiplas prescrições.

## Critério de aceite

- Nenhum dado do cliente aparece como conteúdo completo em mais de uma aba.
- Todos os fluxos existentes continuam acessíveis e funcionais.
- Os oito IDs e deep links continuam válidos.
- Oura e Whoop aparecem somente quando conectados.
- Em 375 px, nenhuma ação ou informação depende de rolagem horizontal invisível.
- Nenhum valor novo é inventado; ausências usam `—` ou estado vazio específico.
