# Aba Treinamento: manter o resto da tela sem score de hoje

## Problema confirmado
Quando não há score fechado de hoje, a aba inteira vira só "Sem dados recentes de recuperação". Somem check-in, zonas de treino, alternativas e demais blocos — contrário à decisão do dono ("check-in, sessão, plano e o resto da aba seguem exatamente como estão").

## O que muda
- A frase "Sem dados recentes de recuperação" passa a ocupar apenas o lugar da conduta (hero/prescrição).
- Check-in, zonas de treino e demais blocos que não dependem do score continuam aparecendo.
- Blocos que dependem do score do dia (conduta, carga, protocolos derivados) ficam ocultos — nada de conduta com dado de ontem.
- Erro de carregamento continua no estado de erro atual.

## Detalhes técnicos
- `PersonalizedTrainingDashboard.tsx`: remover o `return` antecipado de `if (!snapshot)`; tornar opcionais as variáveis derivadas de `snapshot` e envolver só as seções dependentes em `snapshot ? … : <frase>`.
- Atualizar `dashboardConcordance.dom.test.tsx`: sem score de hoje → frase presente E check-in/zonas presentes, sem conduta/carga.
- Nada publicado.
