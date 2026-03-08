# Motor de Prescrição por IA — Back to Basics v14.5

## Documento Técnico Completo para Exportação

> **Fabrik Studio Boutique — Body & Mind Fitness**  
> **Versão**: v14.5 — Fase 4  
> **Data**: 08/03/2026  
> **Classificação**: Documento técnico proprietário

---

## ÍNDICE

1. [Visão Geral e Filosofia](#1-visão-geral-e-filosofia)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Input do Motor](#3-input-do-motor)
4. [Pipeline de Geração](#4-pipeline-de-geração)
5. [Seleção de Exercícios](#5-seleção-de-exercícios)
6. [Estrutura da Sessão (9 Fases)](#6-estrutura-da-sessão-9-fases)
7. [Filtros de Segurança](#7-filtros-de-segurança)
8. [Validação Cross-Session](#8-validação-cross-session)
9. [Periodização S1-S4](#9-periodização-s1-s4)
10. [Integração Oura Ring](#10-integração-oura-ring)
11. [Enrichment via LLM](#11-enrichment-via-llm)
12. [Públicos-Alvo e Presets](#12-públicos-alvo-e-presets)
13. [Valências e Combinações](#13-valências-e-combinações)
14. [Metodologias Organizacionais](#14-metodologias-organizacionais)
15. [Sistema de Intensidade (PSE + RR)](#15-sistema-de-intensidade-pse--rr)
16. [Liberação Miofascial (LMF)](#16-liberação-miofascial-lmf)
17. [Protocolos Respiratórios](#17-protocolos-respiratórios)
18. [Sistema de Regressão e Progressão](#18-sistema-de-regressão-e-progressão)
19. [Volume Mínimo Semanal](#19-volume-mínimo-semanal)
20. [Extensibilidade (Fase 4)](#20-extensibilidade-fase-4)
21. [Diferenças Grupo vs Individual](#21-diferenças-grupo-vs-individual)
22. [Banco de Dados e Tabelas](#22-banco-de-dados-e-tabelas)
23. [Dimensões Biomecânicas](#23-dimensões-biomecânicas)
24. [Arquivos do Sistema](#24-arquivos-do-sistema)
25. [Glossário](#25-glossário)

---

## 1. VISÃO GERAL E FILOSOFIA

O **Back to Basics** é o sistema proprietário de periodização da Fabrik Studio Boutique, operando em dois níveis:

- **Macro-ondas**: 7 fases ao longo do ano (Fundação → Refundação)
- **Micro-ondas**: ciclos de 4 semanas (mesociclos) com progressão interna S1→S4

### Princípios Fundamentais

1. **3 treinos semanais distintos** (A/B/C) para grupos; 2-6x para individuais
2. **Exercícios fixos por 4 semanas** — ajusta-se apenas volume e intensidade, nunca os exercícios
3. **Estrutura invariável**: aquecimento multi-fase → blocos principais → encerramento respiratório
4. **Full body** em todos os treinos de grupo; individual pode ser segmentado
5. **Treinos descalços**, em small groups de até 8 alunos ou sessões individuais
6. **Automação guiada pelo treinador** — a IA executa a estrutura selecionada pelo profissional

### Hierarquia de Decisão

| Decisão | Quem Decide |
|---------|-------------|
| Valências do dia (A/B/C) | Treinador — IA nunca altera |
| Fase de periodização (grupo) | Fixa — segue calendário anual |
| Fase de periodização (individual) | Treinador define manualmente |
| Seleção de exercícios | IA — regras determinísticas |
| Nível de regressão | IA — baseado no perfil do aluno |
| Carga absoluta (kg) | Treinador (individual) ou PSE/RR (grupo) |

---

## 2. ARQUITETURA DO SISTEMA

### Arquitetura Híbrida em 3 Camadas

```
┌─────────────────────────────────────────────────────────┐
│  CAMADA 1 — DETERMINÍSTICA                              │
│  Regras de segurança, limites de dose, anti-repetição,  │
│  validação de equipamentos, filtros biomecânicos (F1-F5)│
├─────────────────────────────────────────────────────────┤
│  CAMADA 2 — AUTORREGULAÇÃO                              │
│  Ajuste de volume/intensidade por RIR/RPE, readiness    │
│  Oura Ring, multiplicadores por semana (S1-S4)          │
├─────────────────────────────────────────────────────────┤
│  CAMADA 3 — GENERATIVA (LLM)                            │
│  Gemini 2.5 Flash via Lovable AI Gateway                │
│  Execution cues, mindfulness scripts, frases motivac.   │
│  Non-blocking: se falhar, treino permanece válido       │
└─────────────────────────────────────────────────────────┘
```

### Fluxo Completo de Geração

```
Treinador abre Dialog
  → Seleciona nível do grupo (iniciante/intermediário/avançado)
  → Configura valências A/B/C (máx 2 cada)
  → [Opcional] Define preset de público, semanas, readiness
  → Envia para Edge Function
    → Carrega exercises_library + breathing_protocols + equipment_inventory
    → Aplica filtros de nível, risco, equipamento, audiência
    → Aplica F4 (progressão ensinável)
    → Gera 3 workouts sequencialmente (A → B → C) com anti-repetição
      → Para cada workout: 9 fases de geração
    → Validação cross-session (F2, F5, G12)
    → Enrichment via LLM (non-blocking)
    → Calcula progressão S1-S4 para N semanas
  → Retorna mesociclo com 3 workouts
  → Preview no Dialog (abas: Treinos, Progressão, Segurança)
  → Treinador confirma
```

---

## 3. INPUT DO MOTOR

### Interface TypeScript

```typescript
interface MesocycleInput {
  groupLevel: "iniciante" | "intermediario" | "avancado";
  workouts: WorkoutSlotConfig[];  // 3 slots: A, B, C
  excludeExercises?: string[];     // IDs a evitar
  groupReadiness?: number;         // 0-100, média do Oura Ring

  // Fase 4 — Extensibilidade
  weekCount?: number;              // 3-8 semanas (default: 4)
  audiencePreset?: "adulto" | "senior_70" | "adolescente";
  rotationMode?: "A" | "B";       // A=rotação total, B=seletiva
  retainExerciseIds?: string[];    // Modo B: IDs a manter
}

interface WorkoutSlotConfig {
  slot: "A" | "B" | "C";
  valences: string[];  // máx 2
}
```

### Validações de Input

- `groupLevel` obrigatório
- Exatamente 3 workouts (A, B, C)
- `weekCount` clamped entre 3 e 8
- Mínimo 20 exercícios após filtros (senão erro 400)

---

## 4. PIPELINE DE GERAÇÃO

### Etapa 1: Carregamento de Dados

O motor consulta 3 tabelas do banco de dados:

| Tabela | Campos Usados | Propósito |
|--------|--------------|-----------|
| `exercises_library` | `id, name, movement_pattern, risk_level, level, category, subcategory, movement_plane, equipment_required, default_sets, default_reps, numeric_level, axial_load, lumbar_demand, technical_complexity, metabolic_potential, knee_dominance, hip_dominance` | Fonte principal de exercícios |
| `breathing_protocols` | `id, name, technique, rhythm, duration_seconds, instructions, category, when_to_use` | Protocolos respiratórios reais |
| `equipment_inventory` | `name, is_available` | Validação de disponibilidade |

### Etapa 2: Filtragem em Cadeia

A filtragem é aplicada em sequência rigorosa:

```
Pool completo (exercises_library)
  │
  ├─ filterByLevel()      → numeric_level ≤ threshold por nível
  ├─ filterByRisk()       → risk_level compatível com grupo
  ├─ filterByEquipment()  → equipment_required ∈ equipment_inventory
  ├─ applyAudienceFilters() → limites AX, LOM, TEC por preset
  ├─ applyF4Teachable()   → prioriza exercícios com regressões
  └─ excludeExercises()   → remove IDs explícitos
  │
  └─ Pool filtrado (mín. 20 exercícios)
```

### Etapa 3: Geração Sequencial A → B → C

Os 3 workouts são gerados em sequência. Um `globalExcludeIds` acumula os IDs dos exercícios usados nos blocos principais e finalizadores para garantir **anti-repetição** entre slots.

### Etapa 4: Validação Cross-Session

Após gerar os 3 workouts, o motor valida:
- Equilíbrio de dominâncias (Pull/Push, Knee/Hip)
- Sobreposição de prime movers
- Controle neural e articular semanal

### Etapa 5: Enrichment LLM

Chamada non-blocking ao Gemini 2.5 Flash para gerar cues de execução, scripts de mindfulness e frases motivacionais.

### Etapa 6: Montagem do Mesociclo

Compilação final com metadata, progressão, balanço de padrões e informações de segurança.

---

## 5. SELEÇÃO DE EXERCÍCIOS

### Filtros por Nível

| Nível do Grupo | `numeric_level` Máximo |
|----------------|----------------------|
| Iniciante | ≤ 3 |
| Intermediário | ≤ 6 |
| Avançado | ≤ 9 |

Fallback: se `numeric_level` é `null`, usa campo `level` (texto) com mapeamento:

```
Iniciante → 1, Iniciante/Intermediário → 1.5, Intermediário → 2,
Intermediário/Avançado → 2.5, Avançado → 3, Todos os níveis → 0 (aceito)
```

### Filtro por Risco

| risk_level | Quem pode usar |
|-----------|---------------|
| low / Baixo | Todos |
| medium / Médio | Intermediário + Avançado |
| high / Alto | Apenas Avançado |

### Filtro por Equipamento

Cross-check: `exercise.equipment_required` ⊂ `equipment_inventory.is_available`. Exercícios sem equipamento (peso corporal) passam sempre.

### Método de Seleção Ponderada

Não é shuffle puro. Cada exercício recebe um score:

```
score = random(0, 1)
  + 0.10 se tem equipamento definido (mais variado)
  + 0.15 se plano ≠ sagital (diversidade de planos)
```

Os exercícios são ordenados por score decrescente e os top-N são selecionados.

### Agrupamentos de Padrão para Blocos Principais

```typescript
const SESSION_PATTERN_GROUPS = {
  lower_knee: ["dominancia_joelho", "lunge"],
  lower_hip: ["cadeia_posterior"],
  upper_push: ["empurrar"],
  upper_pull: ["puxar"],
  carry: ["carregar"],
};
```

---

## 6. ESTRUTURA DA SESSÃO (9 FASES v14.5)

Cada sessão de 55 minutos segue esta estrutura invariável:

| # | Fase | Duração | Descrição |
|---|------|---------|-----------|
| 1 | **Abertura** | 3 min | Respiração nasal + LMF (2 regiões, trilhos distintos) |
| 2 | **Mobilidade Específica** | 4 min | Mobilidade específica ao padrão do BP1 |
| 3 | **Core Biplanar** | 5 min | 2 exercícios, 2 planos distintos por slot |
| 4 | **BP1 — Bloco Principal 1** | 10 min | Valência primária: 1 lower_knee + 1 upper_push |
| 5 | **Respiração Inter-bloco** | 0.5 min | Nasal cadenciada 3:6 (~30s) |
| 6 | **BP2 — Bloco Principal 2** | 10 min | Valência secundária: 1 lower_hip + 1 upper_pull |
| 7 | **BP3 — Complementar** | 7 min | Lunge + suplementar (quando 2 valências ou metcon) |
| 8 | **Finalizador** | 4 min | Carry (farmer walk, suitcase, overhead) |
| 9 | **Encerramento** | 4 min | Protocolo respiratório alinhado à valência final |

### Fase 1: Abertura (Respiração + LMF)

**Respiração de abertura**: Seleciona protocolo com `when_to_use = "pre_workout"` ou `"abertura"` do banco `breathing_protocols`. Fallback: nasal cadenciada 3:6.

**LMF (Liberação Miofascial)**:
- 2 regiões de **trilhos anatômicos distintos** (regra de ouro inviolável)
- Seleção baseada na valência dominante:
  - Se lower-dominant (força, potência): 1 de `[gluteos, quadriceps, isquiotibiais, panturrilha, adutores]` + 1 de `[ombro, coluna, pe]`
  - Se upper-dominant: inverso
- Prescrição: 1 série × 30-60s por região, sem intervalo

### Fase 2: Mobilidade Específica ao BP1

- Filtra exercícios `category = "mobilidade"`
- Prioriza subcategorias relevantes ao padrão do BP1:

```typescript
const BP1_MOBILITY_SUBCATEGORIES = {
  dominancia_joelho: ["quadril", "tornozelo", "joelho"],
  cadeia_posterior: ["quadril", "isquiotibiais", "coluna"],
  lunge: ["quadril", "tornozelo", "joelho"],
  empurrar: ["ombro", "toracica", "escapular"],
  puxar: ["ombro", "toracica", "escapular"],
  carregar: ["ombro", "quadril", "coluna"],
};
```

- Seleciona 2 específicos + preenche até 3 com mobilidade geral
- Prescrição: 1 série × 8-10 reps, intervalo 15s (circuito)

### Fase 3: Core Biplanar

Distribuição fixa por slot para cobertura semanal dos 3 planos:

| Slot | Planos de Core |
|------|---------------|
| A | anti_extensão + anti_rotação |
| B | anti_flexão_lateral + anti_extensão |
| C | anti_rotação + anti_flexão_lateral |

- Filtra exercícios `category = "core_ativacao"` com `subcategory` correspondente
- Prescrição: 2 séries × 10-12 reps, intervalo 30s (superset)
- Fallback: qualquer core não usado se plano específico não disponível

### Fases 4-7: Blocos Principais (BP1 + BP2 + BP3)

**BP1 — Valência Primária:**
- 1 exercício lower_knee + 1 exercício upper_push (superset)
- Se valência inclui "potência" e nível ≠ iniciante: adiciona exercício pliométrico antes do par
  - Max plyometric level: intermediário → 11, avançado → 19
  - Exige `technical_complexity ≤ 3`
- Aplica filtro F1 (lombar) sobre o pool antes da seleção
- Se valência é condicionamento: aplica filtro F3 (TEC ≤ 2)

**Respiração Inter-bloco:**
- Nasal cadenciada 3:6, ~30 segundos
- Objetivo: reduzir FC antes do próximo bloco

**BP2 — Valência Secundária:**
- 1 exercício lower_hip + 1 exercício upper_pull (superset)
- Padrões opostos ao BP1 para complementariedade full body
- Mesmos filtros F1 e F3

**BP3 — Bloco Complementar (opcional):**
- Gerado quando: 2 valências ou condicionamento presente
- 1 exercício lunge + 1 suplementar (push ou pull)
- Se metcon: método circuito. Senão: superset

**Configuração por Valência:**

```typescript
const VALENCE_CONFIG = {
  potencia:        { sets: "3-4", reps: "3-5",   interval: 120, pse: "7-8" },
  forca:           { sets: "4-5", reps: "4-6",   interval: 90,  pse: "8-9" },
  hipertrofia:     { sets: "3-4", reps: "8-12",  interval: 60,  pse: "7-8" },
  condicionamento: { sets: "3",   reps: "12-15", interval: 30,  pse: "6-7" },
};
```

### Fase 8: Finalizador (Carry)

- Filtra exercícios com `movement_pattern = "carregar"`
- Aplica filtro F1 (lombar)
- Prescrição: 3 séries × 20-30m, intervalo 60s
- Mínimo recomendado: 2 carries por semana (validado cross-session)

### Fase 9: Encerramento por Valência

Protocolo respiratório específico baseado na última valência trabalhada:

```typescript
const CLOSING_PROTOCOL_MAP = {
  potencia:        ["post_workout", "ativacao_parasimpatica"],
  forca:           ["post_workout", "recuperacao"],
  hipertrofia:     ["post_workout", "recuperacao"],
  condicionamento: ["post_workout", "cool_down"],
};
```

| Valência Final | Protocolo | Duração |
|---------------|-----------|---------|
| Potência | Suspiro Cíclico → Ressonância 5:5 | 1 min + 2 min |
| Força | Nasal Cadenciada 4:6 + Visualização | 2-3 min |
| Hipertrofia | I:E Estendida 4:8 | 2-3 min |
| Metcon | Suspiro Cíclico → Ressonância 5:5 + Mindfulness | 1+2 min + caminhada |

---

## 7. FILTROS DE SEGURANÇA

### F1 — Controle Lombar por Sessão

```
Regra: Máximo 2 exercícios com lumbar_demand ≥ 4 por sessão.
Implementação: applyLumbarFilter() — se 2+ exercícios LOM≥4 já selecionados,
               remove candidatos com LOM≥4 do pool restante.
Adicionalmente: max 1 hinge pesado (cadeia_posterior + LOM≥4) por sessão.
```

### F3 — Complexidade Técnica em MetCon

```
Regra: Em blocos de condicionamento, technical_complexity ≤ 2.
Implementação: filterForMetcon() filtra exercícios com TEC > 2.
Razão: Sob fadiga metabólica, exercícios complexos aumentam risco de lesão.
```

### Regra All-Out

```
Regra: PSE 9-10 só permitido se axial_load ≤ 2 E lumbar_demand ≤ 2.
Implementação: canAllOut(exercise) retorna boolean.
Razão: Esforço máximo com alta carga axial ou lombar é inaceitável.
```

### Regra Anti-Metcon

```
Regra: Em blocos NÃO-metcon, PSE máximo é 8.
Implementação: clampPseForNonMetcon() limita ranges de PSE.
Razão: Preservar qualidade técnica nos blocos de força/hipertrofia.
```

### F4 — Progressão Ensinável (Fase 4)

```
Regra: Priorizar exercícios que possuem pelo menos 1 regressão disponível
       (mesmo movement_pattern, numeric_level inferior).
Implementação: applyF4TeachableProgression() — filtra pool mantendo apenas
               exercícios com regressões se pool resultante ≥ 50% do original.
Razão: Treinador sempre tem opção de simplificar.
```

---

## 8. VALIDAÇÃO CROSS-SESSION

Após gerar os 3 workouts, o motor coleta estatísticas e valida:

### F2 — Equilíbrio de Dominâncias Semanal

```typescript
function validateDominanceBalance(stats, warnings):
  - Push: mín 6 sets/semana
  - Pull: mín 6 sets/semana
  - Knee: mín 6 sets/semana
  - Hip: mín 4 sets/semana
  - Pull/Push ratio: 1.2-1.4x (pull 20-40% > push)
```

### F5 — Sobreposição de Prime Movers

```
Regra: Se o mesmo padrão de movimento aparece em todos os 3 treinos
       com > 15 sets totais → alerta de sobreposição.
```

### G12 — Controle Neural e Articular

```
Regras:
  - Max 2 sessões de alta demanda neural/semana
  - Limites de stress articular semanal:
    - Joelho: max 25 sets com knee_dominance ≥ 4
    - Ombro: max 20 sets (empurrar/puxar com axial_load ≥ 3)
    - Lombar: max 15 sets com lumbar_demand ≥ 3
  - Composição ideal: 1 Alto + 1 Moderado + 1 MetCon
  - Alerta se todas as sessões são de alta demanda neural
```

### Perfil Neural por Slot

```
potencia no slot → "alto"
forca no slot    → "moderado"
condicionamento  → "metcon"
outros           → "moderado"
```

---

## 9. PERIODIZAÇÃO S1-S4

### Progressão do Mesociclo

| Semana | Nome | Volume | Intensidade | PSE | Pliometria | MetCon |
|--------|------|--------|------------|-----|-----------|--------|
| **S1** | Adaptação | 0.7x | 0.7x | 5-6 | Nenhuma | Circuito |
| **S2** | Desenvolvimento | 1.0x | 0.85x | 6-7 | Baixa | Circuito |
| **S3** | Choque 1 | 1.0x | 0.95x | 7-8 | Total | EMOM/Circuito |
| **S4** | Choque 2 | 1.0x | 1.0x | 8-9 | Total | AMRAP/For Time/EMOM |

### Regras de Progressão

- **S1 (Deload)**: −1 série nos blocos principais. Qualidade mantida. Nunca sessão negligenciada
- **S2 (Consolidação)**: Volume baseline completo. Carga do último treino de qualidade
- **S3 (Intensificação)**: Progressão via aumento de carga ou velocidade, não volume
- **S4 (Ápice)**: Intensidade máxima do ciclo. Volume inalterado

### Progressão Intra-Meso (Ranges Descendentes)

Faixas de repetição são dadas como ranges descendentes (ex: 12-8):

| Semana | Ação |
|--------|------|
| S1 | Margem superior do range, carga ~10-15% abaixo da S4 anterior |
| S2 | Margem superior com carga menor |
| S3 | Progressão gradual para margem inferior |
| S4 | Margem inferior com carga máxima |

### Semanas > 4

Para mesociclos de 5-8 semanas, o ciclo se repete: S5=S1, S6=S2, S7=S3, S8=S4.

---

## 10. INTEGRAÇÃO OURA RING

O motor ajusta volume automaticamente baseado no readiness médio do grupo:

| Readiness | Multiplicador | Efeito |
|-----------|--------------|--------|
| 85-100 | 1.1 | +10% volume |
| 65-84 | 1.0 | Normal |
| 45-64 | 0.8 | −20% volume |
| 25-44 | 0.6 | −40% volume |
| 0-24 | 0.5 | −50% volume |

**Implementação**: `calcVolumeMultiplier(groupReadiness)` retorna o fator, que é aplicado via `applyVolumeMultiplier(sets, multiplier)` nos sets de cada exercício.

O multiplicador é **capeado** pelo `volumeMultiplierCap` do preset de audiência (ex: senior_70 cap = 0.8).

---

## 11. ENRICHMENT VIA LLM

### Modelo

Lovable AI Gateway → Google Gemini 2.5 Flash (via tool calling)

### O que é gerado

| Campo | Descrição | Localização |
|-------|-----------|-------------|
| `executionCues` | 1-2 frases de orientação técnica por exercício | `exercise.executionCues` |
| `mindfulnessScript` | 3-4 frases para encerramento (respiração + consciência corporal) | `workout.mindfulnessScript` |
| `motivationalPhrase` | Frase inspiradora por treino | `workout.motivationalPhrase` |

### Comportamento

- **Non-blocking**: se a chamada LLM falhar, os campos ficam `undefined` e o treino permanece 100% válido
- Tool calling com schema estruturado para garantir formato consistente
- Prompt inclui contexto da filosofia Body & Mind Fitness

### Prompt do Sistema (LLM)

```
Você é um treinador funcional especialista da Fabrik Performance (Body & Mind Fitness).
Gere orientações de execução (execution cues) para cada exercício, um script de mindfulness
para o encerramento de cada treino e uma frase motivacional.
Cues: máximo 2 frases, linguagem profissional e acessível.
Mindfulness: 3-4 frases focando em respiração e consciência corporal.
Frases motivacionais: inspiradoras, alinhadas com a filosofia Body & Mind Fitness.
```

---

## 12. PÚBLICOS-ALVO E PRESETS

### 12A. Adulto Executivo (40-60) — PADRÃO

| Restrição | Limite |
|-----------|--------|
| PSE máximo | 10 (sem restrição) |
| Carga Axial (AX) | 5 |
| Demanda Lombar (LOM) | 5 |
| Complexidade Técnica (TEC) | 5 |
| Sets efetivos máx/sessão | 20 |
| Volume multiplier cap | 1.1 |
| Categorias excluídas | Nenhuma |

### 12B. Sênior (70+) — 7 RESTRIÇÕES INVIOLÁVEIS

| # | Restrição | Regra |
|---|-----------|-------|
| 1 | Excêntrico | PROIBIDO excêntrico acentuado |
| 2 | Volume | Máx 2-3 séries/bloco, max 14 sets efetivos/sessão |
| 3 | Metcon | PROIBIDO alta intensidade (FOR TIME, EMOM agressivo) |
| 4 | PSE | Máximo 7. Nunca RM |
| 5 | Foco | Equilíbrio unipodal, mobilidade funcional, sarcopenia |
| 6 | Sessão | 40-45 min |
| 7 | Ênfase | Mín 2 exercícios equilíbrio unipodal/sessão |

**Filtros automáticos**: AX ≤ 2, LOM ≤ 3, TEC ≤ 2, sem pliometria, volume cap 0.8.

### 12C. Adolescentes — 4 PREMISSAS

| # | Premissa |
|---|---------|
| 1 | PROIBIDA carga axial pesada (BB squat, RDL BB). Risco epifisiólise. Usar KB/DB/PC |
| 2 | OBRIGATÓRIO potência/agilidade em todos os treinos |
| 3 | Incluir coordenação, propriocepção, lateralidade, ritmo |
| 4 | FOR TIME e AMRAP bem-vindos. Alta frequência metcon |

**Filtros automáticos**: AX ≤ 3, LOM ≤ 3, TEC ≤ 3, PSE ≤ 8, max 16 sets/sessão, volume cap 0.9.

---

## 13. VALÊNCIAS E COMBINAÇÕES

### As 4 Valências (Hierarquia Neural)

| Valência | Objetivo | Ordem |
|----------|----------|-------|
| **Potência** | Velocidade, coordenação, eficiência neuromuscular | 1º (maior exigência) |
| **Força** | Força máxima funcional com controle técnico | 2º |
| **Hipertrofia** | Tensão mecânica, TUT, correção de assimetrias | 3º |
| **Condicionamento Metabólico** | Resistência cardiovascular e metabólica | 4º (menor exigência) |

> Mobilidade e Estabilidade **NÃO** são valências — são fases obrigatórias.

### Regras de Combinação

- **Máximo**: 2 valências por sessão
- **Ordem obrigatória**: Potência → Força → Hipertrofia → Metcon
- **A IA nunca altera ou sugere substituição** — executa a combinação definida pelo treinador

### 10 Combinações Válidas

```
[potencia], [forca], [hipertrofia], [condicionamento]
[potencia, forca], [potencia, hipertrofia], [potencia, condicionamento]
[forca, hipertrofia], [forca, condicionamento]
[hipertrofia, condicionamento]
```

### Combinações INVÁLIDAS

- 3 valências na mesma sessão — **nunca**
- Qualquer ordem que inverta a hierarquia neural

---

## 14. METODOLOGIAS ORGANIZACIONAIS

### Os 9 Métodos do Sistema

| Método | Contexto | Regras |
|--------|----------|--------|
| **CIRCUITO** | Aquecimento/ativação | 2-4 séries. Sem pausa ou mínima |
| **SUPERSET** | Força principal | Par antagonista/complementar. 1 min após par |
| **TRISET** | Força/Hipertrofia | Trio sinérgico. 1-2 min após 3º. Regra 2+1 |
| **FOR TIME** | Metcon intenso | TC 15-20 min. PSE por volume acumulado |
| **EMOM/E3MOM** | Potência/Metcon | EMOM: 1 exerc./min. E3MOM: 3 exerc. em 3 min |
| **AMRAP** | Condicionamento | Máx rounds em tempo fixo (15 min) |
| **ISOMÉTRICO** | Complementar | Desafio prancha ou wall sit |
| **CLUSTER** | Potência/Força | Mini-pausas intra-série 10-15s |
| **PAUSADO** | Força/Estabilidade | Fase excêntrica 3s ou pausa |

### Regra de TRISET

Para evitar fadiga sistêmica excessiva:
- 2 exercícios de alta demanda + 1 de baixa demanda (isolado)
- ✅ Afundo + supino + tríceps isolado
- ❌ 3 multiarticulares altamente demandantes

### Regra de Complementariedade (Contra Redundância)

> PROIBIDO repetir o mesmo padrão mecânico bilateral pesado do bloco de Força no bloco de Hipertrofia. A IA força variação unilateral ou isolada.

---

## 15. SISTEMA DE INTENSIDADE (PSE + RR)

### Tabela PSE Completa

| PSE | RR | Descrição | Uso |
|-----|----|-----------|----|
| 10 | 0 | Esforço máximo | Nunca prescrito |
| 9.5 | 0+ | Não faria mais reps | Testes de força |
| 9 | 1 | 1 RR | Força máxima — controlado |
| 8.5 | 1-2 | 1-2 RR | **Uso mais frequente** força |
| 8 | 2 | 2 RR | Força/Hipertrofia |
| 7.5 | 2-3 | 2-3 RR | **Uso frequente** |
| 7 | 3 | 3 RR | Hipertrofia base |
| 5-6 | 4-6 | 4-6 RR | Ativação/circuitos |
| 3-4 | — | Leve | Aquecimento |
| 1-2 | — | Pouco/nenhum | Mobilidade |

### PSE por Valência

| Valência | PSE/RR | Reps |
|----------|--------|------|
| Aquecimento | Sem PSE | — |
| Potência | Moderado | 3-6 |
| Força (acumulação) | 2-3 RR | 6-12 |
| Força (intensificação) | 1-2 RR | 4-8 |
| Hipertrofia | 1-2 RR | 6-15 |
| Metcon | 70-80% FC | Variável |

### Zonas de Repetição (Hipertrofia)

| Zona | Reps | Característica |
|------|------|---------------|
| Z1 | 6-8 | Tensão alta |
| Z2 | 8-12 | Zona central |
| Z3 | 12-15 | Controle + densidade |

> Nunca acima de 15 reps para adulto executivo.

---

## 16. LIBERAÇÃO MIOFASCIAL (LMF)

### Regra de Ouro (INVIOLÁVEL)

> Nunca selecionar duas regiões do mesmo trilho anatômico. As duas regiões devem SEMPRE pertencer a trilhos diferentes.

### Regiões por Foco

**Lower-dominant** (força, potência):
- Primário: `gluteos, quadriceps, isquiotibiais, panturrilha, adutores`
- Secundário: `ombro, coluna, pe`

**Upper-dominant**:
- Invertido

### 4 Critérios de Seleção

| # | Critério |
|---|---------|
| 1 | Foco do treino: regiões dos prime movers |
| 2 | Prevenção sobrecarga: não repetir mesma região em 2 treinos consecutivos |
| 3 | Coerência bilateral: se exercício unilateral → TFL ou Adutores |
| 4 | Coluna torácica: obrigatória se empurrar/puxar vertical ou overhead |

---

## 17. PROTOCOLOS RESPIRATÓRIOS

### 6 Protocolos Ativos

| Protocolo | Cadência | Momento |
|-----------|----------|---------|
| **Box Breathing** | 4:4:4:4 | Pré-potência (foco neural) |
| **Ressonância 5,5 bpm** | 5:5 nasal | Pós-metcon, inter-série força |
| **Suspiro Cíclico** | Inspira + 2ª inspira + expira longa (1:2) | Pós-potência, alta ativação simpática |
| **I:E Estendida** | 4:6-8 nasal | Encerramento, transição |
| **Valsalva Controlada** | Inspira → pressão → expira controlada | Compostos de força máxima |
| **Nasal Cadenciada** | 4:6 nasal | Encerramento pós-força |

### Regras Operacionais

| Momento | Protocolo |
|---------|-----------|
| Abertura (obrigatória) | I:E Estendida 4:6 ou Ressonância 5:5 |
| Pré-potência | Box Breathing 4-4-4-4 |
| Intra-série (força) | Valsalva Controlada |
| Inter-série | Ressonância 5:5 |
| Pós-bloco intenso | Suspiro Cíclico |
| Encerramento | Específico por valência (ver tabela) |

---

## 18. SISTEMA DE REGRESSÃO E PROGRESSÃO

### 5 Níveis Obrigatórios

| Nível | Nome | Critério |
|-------|------|---------|
| **Progressão** | Variação avançada | Fase intensificação, padrão consolidado |
| **Nível 3** | Avançado (Exercício Alvo) | Padrão técnico confirmado |
| **Nível 2** | Intermediário | Técnica em desenvolvimento |
| **Nível 1** | Base | Fase inicial, retorno de lesão |
| **Regressão Total** | Auxílio total | Limitação severa, dor ativa |

### F4 — Progressão Ensinável (Filtro Automático)

O motor prioriza exercícios que possuem pelo menos 1 regressão disponível (mesmo `movement_pattern`, `numeric_level` inferior), garantindo que o treinador sempre tenha opção de simplificar.

### Critérios de Ativação

| Fator | Indicação |
|-------|-----------|
| Histórico de lesão | Nível 1 ou 2 na região afetada |
| Nível iniciante | Iniciar em Nível 1 |
| Público 70+ | Nunca Nível 3 com carga axial pesada |
| Adolescentes | Proibido Nível 3 com alta carga axial |
| Retorno pós-ausência | Regredir 1 nível |
| PSE > alvo | Regredir variação |

---

## 19. VOLUME MÍNIMO SEMANAL

### Adulto Executivo — por Padrão (3x/semana)

| Padrão | Mín Sets/Semana |
|--------|----------------|
| Empurrar (H+V) | 12 sets |
| Puxar (H+V) | 15-17 sets (20-40% > Empurrar) |
| Dominância de joelho | 12 sets |
| Dominância de quadril | 12 sets |

### Regra Permanente: Puxar > Empurrar

> Volume semanal de Puxar deve ser 20-40% superior ao volume de Empurrar. Regra permanente e não opcional.

### Padrões Excluídos da Contagem

Potência, Carregar, Estabilidade/Core e Mobilidade NÃO entram — são acessórios.

### Regra de Ajuste

| Regra | Descrição |
|-------|-----------|
| Padrão abaixo do mínimo | Adicionar sets no treino de menor volume |
| Como | SUPERSET complementar no bloco hipertrofia |
| Teto | Máx +4 sets por treino |
| Limite tempo | Respeitar 55 min |
| Proibido | Criar blocos novos — apenas aumentar séries existentes |

---

## 20. EXTENSIBILIDADE (FASE 4)

### Mesociclos > 4 Semanas

O motor suporta 3 a 8 semanas. Semanas além de S4 repetem o ciclo: S5=S1, S6=S2, S7=S3, S8=S4.

### Modo A/B de Rotação Intermensal

- **Modo A** (default): Rotação total — todos os exercícios mudam entre mesociclos
- **Modo B**: Rotação seletiva — `retainExerciseIds` mantém exercícios específicos do mesociclo anterior

No Modo B, os exercícios retidos são garantidos no pool mesmo que `excludeExercises` tente excluí-los.

### Presets de Público-Alvo

| Preset | PSE Max | AX Max | LOM Max | TEC Max | Sets Max | Vol. Cap |
|--------|---------|--------|---------|---------|----------|----------|
| adulto | 10 | 5 | 5 | 5 | 20 | 1.1 |
| senior_70 | 7 | 2 | 3 | 2 | 14 | 0.8 |
| adolescente | 8 | 3 | 3 | 3 | 16 | 0.9 |

---

## 21. DIFERENÇAS GRUPO VS INDIVIDUAL

| Variável | Grupo (Small Group) | Individual (Personal) |
|----------|--------------------|-----------------------|
| Alunos | Até 8 | 1 |
| Formato | 30 ou 55 min | 30-60 min |
| Frequência | 3x/semana fixo (A/B/C) | 2-6x/semana |
| Estrutura | Sempre Full Body | Full Body ou segmentada |
| Carga | PSE/RR exclusivamente | **kg + RR** (histórico) |
| Qualificadores | "leve", "moderada", "alta", "pesada" | Carga absoluta em kg |
| Periodização | Fixa (calendário) | Treinador define |
| Regressão | 5 níveis (grupo heterogêneo) | Simplificada |
| Volume mínimo | Tabela padrão | Variável |
| Exercícios | Fixos 4 semanas | Fixos 4 semanas |

---

## 22. BANCO DE DADOS E TABELAS

### exercises_library (913+ registros)

| Campo | Tipo | Uso no Motor |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `name` | text | Nome do exercício |
| `category` | text | Filtro de fase (lmf, mobilidade, core_ativacao, etc.) |
| `subcategory` | text | Subdivisão (anti_extensao, gluteos, etc.) |
| `movement_pattern` | text | Padrão de movimento (empurrar, puxar, etc.) |
| `risk_level` | text | Baixo/Médio/Alto |
| `level` | text | Nível textual (fallback) |
| `numeric_level` | int | Nível numérico 1-9 (preferido) |
| `movement_plane` | text | Sagital/Frontal/Transverso (ponderação) |
| `equipment_required` | text[] | Lista de equipamentos necessários |
| `default_sets` | text | Sets padrão |
| `default_reps` | text | Reps padrão |
| `axial_load` | int(0-5) | Carga compressiva na coluna |
| `lumbar_demand` | int(0-5) | Demanda lombar |
| `technical_complexity` | int(0-5) | Dificuldade de execução |
| `metabolic_potential` | int(0-5) | Potencial metabólico |
| `knee_dominance` | int(0-5) | Envolvimento cadeia anterior |
| `hip_dominance` | int(0-5) | Envolvimento cadeia posterior |

### breathing_protocols

| Campo | Uso |
|-------|-----|
| `name, technique, rhythm` | Exibição e notas |
| `when_to_use` | Matching por fase (pre_workout, post_workout, etc.) |
| `is_active` | Filtro (só ativos) |

### equipment_inventory

| Campo | Uso |
|-------|-----|
| `name` | Matching com `equipment_required` dos exercícios |
| `is_available` | Filtro de disponibilidade |

---

## 23. DIMENSÕES BIOMECÂNICAS

O sistema classifica exercícios em 6 dimensões (scores 0-5):

| Dimensão | Abreviação | Descrição | Uso no Motor |
|----------|-----------|-----------|-------------|
| Carga Axial | **AX** | Compressão na coluna vertebral | Filtro senior_70 (≤2), regra all-out (≤2) |
| Exigência Lombar | **LOM** | Demanda sobre região lombar | F1 (max 2 LOM≥4/sessão), stress articular |
| Complexidade Técnica | **TEC** | Dificuldade de execução | F3 (≤2 em metcon), filtro senior_70 (≤2) |
| Potencial Metabólico | **MET** | Capacidade de gerar demanda metabólica | Elegibilidade metcon |
| Dominância Joelho | **JOE** | Envolvimento cadeia anterior | Stress articular semanal |
| Dominância Quadril | **QUA** | Envolvimento cadeia posterior | Equilíbrio semanal |

### Regras Derivadas das Dimensões

| Regra | Condição |
|-------|---------|
| All-out permitido | AX ≤ 2 **E** LOM ≤ 2 |
| Elegível para MetCon | TEC ≤ 2 |
| Requer progressão técnica | TEC ≥ 4 |

---

## 24. ARQUIVOS DO SISTEMA

| Arquivo | Responsabilidade |
|---------|------------------|
| `supabase/functions/generate-group-session/index.ts` | Edge Function completa (1661 linhas) |
| `src/constants/backToBasics.ts` | Constantes e tipos TypeScript |
| `src/types/aiSession.ts` | Tipos de input/output |
| `src/hooks/useGenerateGroupSession.ts` | Hook React (mutation) |
| `src/components/GenerateGroupSessionDialog.tsx` | UI (dialog 4 steps) |
| `src/components/MesocyclePreview.tsx` | Preview do mesociclo gerado |
| `docs/AI_PRESCRIPTION_MANUAL_V14.md` | Manual completo da metodologia |
| `docs/AI_PRESCRIPTION_ENGINE.md` | Documentação técnica do motor |

---

## 25. GLOSSÁRIO

| Sigla | Significado |
|-------|-------------|
| AX | Carga Axial (dimensão 0-5) |
| LOM | Demanda Lombar (dimensão 0-5) |
| TEC | Complexidade Técnica (dimensão 0-5) |
| MET | Potencial Metabólico (dimensão 0-5) |
| JOE | Dominância Joelho (dimensão 0-5) |
| QUA | Dominância Quadril (dimensão 0-5) |
| PSE | Percepção Subjetiva de Esforço (1-10) |
| RR | Repetições de Reserva |
| RM | Repetições Máximas |
| LMF | Liberação Miofascial |
| BP1/BP2/BP3 | Bloco Principal 1/2/3 |
| S1-S4 | Semanas do microciclo |
| F1-F5 | Filtros de segurança |
| G4-G12 | Guardrails de geração |
| TUT | Tempo sob Tensão |
| HRV | Variabilidade da Frequência Cardíaca |
| FC | Frequência Cardíaca |
| SNA | Sistema Nervoso Autônomo |
| BB | Barra olímpica |
| DB/KB | Dumbbell / Kettlebell |
| UNL | Unilateral |
| EMOM | Every Minute on the Minute |
| E3MOM | Every 3 Minutes on the Minute |
| AMRAP | As Many Rounds as Possible |
| AFAP | As Fast as Possible |

---

## APÊNDICE A — Macro-onda Anual (7 Fases)

| Período | Fase | Características |
|---------|------|----------------|
| Jan-Mar | Fundação | Alto volume Metcon, 12-15 reps, PSE 2-3 RR |
| Abr-Jun | Acumulação | Volume mantido, intensidade cresce, 6-12 reps |
| Jul-Ago | Intensificação | Volume reduz, 4x8-5, PSE 1-2 RR dominante |
| Set-Out | Manutenção | Testes de força, volume moderado |
| Out-Nov | Acumulação II | Retomada com PAUSADO, Farmer walk |
| Nov-Dez | Intensificação II | EMOM potência + cargas pesadas |
| Jan-Fev | Refundação | Hipertrofia + Metcon, nova base |

## APÊNDICE B — Regras de Pausa Consolidadas

| Método | Pausa |
|--------|-------|
| CIRCUITO | Sem pausa ou 10-15s |
| SUPERSET | 1 min após cada par |
| TRISET | 1-2 min após 3º exercício |
| CLUSTER | 10-15s intra-set; 1-2 min entre séries |
| FOR TIME/E3MOM/AMRAP | Intervalo respiratório interno |

## APÊNDICE C — Princípios Inegociáveis

1. **Minimização do risco de lesão**: Segurança técnica é não-negociável
2. **Qualidade técnica precede carga, volume e intensidade**
3. **Adaptação ao grupo heterogêneo** via tabela regressão/progressão
4. **PSE respeitado** — cronometrar pausas reais
5. **Complementariedade entre blocos** — evitar redundância neural
6. **Sem exaustão sistêmica precoce** — treino é experiência premium
7. **Preservar a experiência premium**: eficiência, segurança e controle

## APÊNDICE D — Retorno Pós-Ausência (>14 dias)

| Variável | Ajuste Automático |
|----------|-------------------|
| Volume | 50-70% do padrão |
| PSE | +1 nível conservador |
| Metcon | Eliminar alta intensidade S1 |
| Potência | Eliminar saltos S1 |
| Semana 2+ | +10-15%/semana até padrão |

---

*Documento gerado em 08/03/2026 — Fabrik Studio Boutique — Body & Mind Fitness*  
*Motor de prescrição v14.5 — Fase 4 — Uso interno e exportação técnica*
