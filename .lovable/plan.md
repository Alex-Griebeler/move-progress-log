

# Analise v14.5 vs. Implementacao Atual — Gap Analysis e Plano de Implementacao

## Resumo Executivo

O documento v14.5 representa uma evolucao significativa em relacao a logica atual da edge function `generate-group-session`. Existem **12 gaps criticos** entre o que o documento prescreve e o que o motor faz hoje. Alguns podem ser implementados imediatamente; outros dependem de dados que ainda nao existem no banco.

---

## GAPs Identificados

### CRITICOS (Afetam seguranca e integridade da prescricao)

| # | Gap | Atual | v14.5 | Bloqueador? |
|---|-----|-------|-------|-------------|
| G1 | **5 Filtros Estruturais (F1-F5)** | Nenhum implementado | F1 conflito lombar, F2 dominancia acumulada, F3 complexidade sob fadiga, F4 progressao ensinavel, F5 sobreposicao prime movers | **SIM — Pendencia 4**: so 30 dos exercicios tem as 6 dimensoes (AX, LOM, TEC, MET, JOE, QUA). Sem esses dados, os filtros nao funcionam. |
| G2 | **Regra All Out** | Nao existe | PSE 9-10 so se AX<=2 E LOM<=2 | Mesmo bloqueador: depende de AX/LOM populados |
| G3 | **Regra Anti-Metcon** | Nao existe | Bloco nao-Metcon: PSE<=8, sem FOR TIME aberto | Implementavel sem dados extras |
| G4 | **Controle de Volume** | Nenhum | Max 20 sets efetivos/sessao, minimos semanais (Push/Pull/Knee/Hip), Pull 20-40% > Push | Parcialmente implementavel |

### ESTRUTURAIS (Afetam a forma do treino)

| # | Gap | Atual | v14.5 |
|---|-----|-------|-------|
| G5 | **Sequencia de Blocos** | LMF(3)→Mob(4)→Ativ(3)→Core(3)→Main→Resp | Resp+LMF(2 regioes)→Mob(BP1-especifica)→Core(2ex, 2 planos)→BP1→BP2→[BP3]→Finaliz(carry)→Encerr |
| G6 | **Mobilidade especifica ao BP1** | Exercicios aleatorios de mobilidade | >=1 exercicio simulando o padrao do exercicio de abertura do BP1 |
| G7 | **Core: 2 exercicios, 2 planos** | 3 exercicios triplanares | 2 exercicios, 2 planos distintos por sessao, cobertura dos 3 planos na semana |
| G8 | **Carry como Finalizador** | Dentro do bloco principal | Posicao A (superset) ou B (finalizador), nunca isolado, min 2/semana |
| G9 | **Respiracao inter-bloco** | Nao existe | Nasal 3:6 (~30s) entre cada bloco principal |
| G10 | **Encerramento por valencia** | Protocolo aleatorio | Protocolo especifico alinhado a valencia final (tabela definida) |
| G11 | **LMF inteligente** | 3 exercicios aleatorios da categoria | 2 regioes, trilhos anatomicos distintos, selecionadas pela valencia do dia |
| G12 | **Controle Neural/Articular semanal** | Nao existe | Max 2 blocos pesados/sem, max 1 hinge pesado/sessao, composicao semanal obrigatoria |

---

## Incoerencias e Riscos no Documento

1. **Pendencia 4 (BLOQUEADOR PRINCIPAL)**: O doc afirma 491 exercicios, mas o banco tem **913**. Apenas 30 tem as 6 dimensoes. Os filtros F1-F5, a regra all out e a escada de intensidade **dependem dessas dimensoes**. Sem popular AX/LOM/TEC/MET/JOE/QUA nos 913 exercicios, essas regras nao podem funcionar de forma confiavel.

2. **Validacao cross-session**: Regras como "max 2 hinge pesados/semana" e "Pull 20-40% > Push" exigem que o motor tenha visao dos 3 treinos simultaneamente. A arquitetura atual gera T1→T2→T3 sequencialmente mas **nao volta para validar T1 depois de gerar T3**. Precisa de um passo de validacao pos-geracao.

3. **Modo B de rotacao**: O documento menciona rotacao seletiva entre mesociclos, mas nao define como o motor recebe a lista de elementos a manter. Precisa de input adicional do treinador.

4. **Mesociclos > 4 semanas**: O motor atual gera exatamente 4 semanas. O doc permite configuracao livre (S5=S1, etc). Requer novo input.

---

## Plano de Implementacao em 4 Fases

### Fase 1 — Fundacao de Dados (Pre-requisito para tudo)
**Esforco: Alto | Prioridade: Maxima**

- Adicionar colunas `axial_load`, `lumbar_demand`, `technical_complexity`, `metabolic_potential`, `knee_dominance`, `hip_dominance` (int 1-5) na `exercises_library` se nao existirem
- Criar ferramenta de IA batch para popular as 6 dimensoes nos 913 exercicios usando os 30 de referencia do documento como exemplos (few-shot prompting com Gemini)
- Criar UI de revisao para o treinador validar/corrigir as dimensoes atribuidas pela IA
- Adicionar campo `anatomical_track` na tabela de LMF para seleção inteligente

**Sem esta fase, as Fases 2 e 3 ficam limitadas a heuristicas.**

### Fase 2 — Reestruturacao dos Blocos
**Esforco: Medio | Sem bloqueadores**

Pode ser feita em paralelo com a Fase 1:

- Reestruturar sequencia de blocos: Resp+LMF(2)→Mob(BP1-especifica)→Core(2ex,2planos)→BP1→BP2→[BP3]→Finaliz→Encerr
- Implementar logica de mobilidade especifica ao BP1 (tabela do documento)
- Ajustar core para 2 exercicios / 2 planos distintos com distribuicao semanal T1/T2/T3
- Mover carry para finalizador (Posicao A ou B)
- Adicionar respiracao inter-bloco (nota nos blocos, ~30s nasal 3:6)
- Implementar encerramento por valencia (tabela de protocolos especificos)
- LMF inteligente: 2 regioes por valencia do dia, trilhos distintos

### Fase 3 — Filtros e Regras de Seguranca
**Esforco: Alto | Depende da Fase 1**

- Implementar F1 (conflito lombar): max 2 exercicios LOM>=4/sessao, max 1 hinge pesado/sessao
- Implementar F2 (dominancia acumulada): tracking de sets por padrao entre T1/T2/T3
- Implementar F3 (complexidade sob fadiga): TEC<=2 em bloco metcon/3+
- Implementar F5 (sobreposicao prime movers): mesma lógica LOM>=3
- Implementar regra All Out (AX<=2 E LOM<=2)
- Implementar regra Anti-Metcon (PSE<=8 em bloco nao-Metcon)
- Validacao de volume: 16-18 sets efetivos, max 20, contagem semanal
- Validacao cross-session pos-geracao (volta nos 3 treinos para checar limites semanais)

### Fase 4 — Refinamentos e Extensibilidade
**Esforco: Medio | Nice-to-have**

- Suporte a mesociclos > 4 semanas (input configuravel)
- Modo A e Modo B de rotacao intermensal
- F4 (progressao ensinavel): depende de sistema de regressao com 5 niveis
- Controle neural semanal (1 Alto + 1 Moderado + 1 Metcon)
- Controle articular semanal (joelho, ombro, lombar)
- Janela Q4C (pendente no proprio documento)
- Protocolo 70+ e Adolescentes como presets de publico

---

## Resposta Direta: A IA Consegue Aplicar Tudo Sem Falhas?

**Hoje, nao.** O bloqueador principal e a ausencia das 6 dimensoes nos exercicios. Sem AX, LOM, TEC, os filtros F1-F5 e a regra de all out nao funcionam — a IA nao tem como saber se um exercicio e "pesado para a lombar" ou "complexo demais para metcon".

**Com a Fase 1 completa**, o motor pode aplicar ~85% das regras de forma deterministica (sem depender de LLM para decisoes de seguranca). Os 15% restantes sao regras que dependem de contexto historico do aluno (PSE adaptativo, estagnacao de carga) que requerem dados de sessoes passadas.

A recomendacao e: **Fase 1 primeiro** (popular dimensoes) → **Fase 2** (reestruturar blocos, implementavel agora) → **Fase 3** (filtros, so quando os dados existirem) → **Fase 4** (extensibilidade).

