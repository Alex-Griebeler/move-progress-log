# Motor de Prescrição por IA — Documentação Completa

> **Objetivo**: Documentar 100% da lógica atual do motor de geração de mesociclo com IA para permitir reconstrução do zero.

---

## 1. VISÃO GERAL

O motor gera um **mesociclo completo de 4 semanas** com 3 treinos semanais (A, B, C) em **uma única operação**. A arquitetura é **100% determinística** (sem chamada a LLM). Os treinos são **full body** — a diferenciação entre A, B e C vem exclusivamente das **valências** selecionadas pelo treinador.

### Fluxo Completo

```
Treinador abre Dialog → Seleciona nível do grupo → Configura valências A/B/C (máx 2 cada)
→ Envia para Edge Function → Motor seleciona exercícios → Retorna mesociclo com 3 workouts
→ Preview no Dialog → Confirmar
```

---

## 2. INPUT (O que o treinador configura)

```typescript
interface MesocycleInput {
  groupLevel: "iniciante" | "intermediario" | "avancado";
  workouts: WorkoutSlotConfig[];  // 3 slots: A, B, C
  excludeExercises?: string[];    // IDs de exercícios a evitar
  groupReadiness?: number;        // 0-100, média do Oura Ring do grupo
}

interface WorkoutSlotConfig {
  slot: "A" | "B" | "C";
  valences: string[];  // máx 2 por slot
}
```

### Valores default na UI

```typescript
A: ["forca"]
B: ["hipertrofia"]  
C: ["condicionamento"]
```

---

## 3. TAXONOMIA DE EXERCÍCIOS

### 3.1 Categorias (Nível 1)

| Chave | Label | Usado em |
|-------|-------|----------|
| `respiracao` | Respiração | Fase final |
| `lmf` | Liberação Miofascial | Fase 1 |
| `mobilidade` | Mobilidade | Fase 2 |
| `core_ativacao` | Core & Ativação | Fases 3 e 4 |
| `potencia_pliometria` | Potência & Pliometria | Bloco opcional |
| `forca_hipertrofia` | Força & Hipertrofia | Fase principal |
| `condicionamento_metabolico` | Condicionamento Metabólico | Formato de sessão (não categoria de exercício) |

### 3.2 Padrões de Movimento (somente `forca_hipertrofia`)

| Chave | Label | Subcategorias |
|-------|-------|---------------|
| `empurrar` | Empurrar | horizontal, vertical |
| `puxar` | Puxar | horizontal, vertical |
| `dominancia_joelho` | Dominância de Joelho | — |
| `cadeia_posterior` | Cadeia Posterior | enfase_quadril, enfase_joelho |
| `lunge` | Lunge | — |
| `carregar` | Carregar | — |

### 3.3 Agrupamentos para Seleção (SESSION_PATTERN_GROUPS)

```typescript
const SESSION_PATTERN_GROUPS = {
  lower_knee: ["dominancia_joelho", "lunge"],
  lower_hip: ["cadeia_posterior"],
  upper_push: ["empurrar"],
  upper_pull: ["puxar"],
  carry: ["carregar"],
};
```

### 3.4 Subcategorias de Core (para triplanar)

| Subcategory | Tipo |
|-------------|------|
| `anti_extensao` | Core Triplanar |
| `anti_flexao_lateral` | Core Triplanar |
| `anti_rotacao` | Core Triplanar |
| `ativacao_escapular` | Ativação |
| `ativacao_gluteos` | Ativação |
| `escapula` | Ativação |
| `gluteos_estabilidade` | Ativação |
| `pe_tornozelo` | Ativação |
| `corretivos_quadril` | Ativação |

### 3.5 Condicionamento Metabólico

Não é uma categoria de exercício — é um **formato de sessão**. Exercícios elegíveis vêm das categorias:

```typescript
const CONDICIONAMENTO_ELIGIBLE_CATEGORIES = [
  "core_ativacao",
  "potencia_pliometria", 
  "forca_hipertrofia",
];
```

---

## 4. ESTRUTURA DA SESSÃO (55 min)

Cada treino gerado segue esta estrutura fixa de 6 fases:

| # | Fase | Duração | Fonte dos Exercícios |
|---|------|---------|---------------------|
| 1 | LMF | 3 min | `category = "lmf"`, 3 exercícios |
| 2 | Mobilidade | 5 min | `category = "mobilidade"`, 4 exercícios |
| 3 | Ativação | 5 min | `category = "core_ativacao"` + subcategorias de ativação, 3 exercícios |
| 4 | Core Triplanar | 7 min | `category = "core_ativacao"` + subcategorias triplanares, 3 exercícios (1 por plano) |
| 5 | Principal | 30 min | Exercícios de força por `movement_pattern`, distribuição full body |
| 6 | Respiração | 5 min | Bloco fixo (Box Breathing), sem exercícios do banco |

### Detalhes por Fase

#### Fase 1 — LMF
- Método: `autoliberacao`
- Sets: 1 | Reps: 30-60s | Intervalo: 0
- Nota: "Foco nas áreas de maior tensão - foam roller, bola, stick"

#### Fase 2 — Mobilidade
- Método: `circuito`
- Sets: 1 | Reps: 8-10 | Intervalo: 15s

#### Fase 3 — Ativação
- Filtra por `category = "core_ativacao"` E `subcategory` IN lista de ativação
- Método: `circuito`
- Sets: 2 | Reps: 10 | Intervalo: 20s

#### Fase 4 — Core Triplanar
- Filtra por `category = "core_ativacao"` E `subcategory` IN `[anti_extensao, anti_flexao_lateral, anti_rotacao]`
- Tenta pegar 1 exercício de cada subcategoria
- Fallback: qualquer core triplanar não usado
- Método: `circuito`
- Sets: 2 | Reps: 10-12 | Intervalo: 30s
- **Validação**: `checkCoreTriplanar()` verifica se os 3 planos estão presentes

#### Fase 5 — Principal (Full Body)

Distribuição fixa para TODOS os slots (A, B, C):

| Bloco | Padrões | Quantidade | Método |
|-------|---------|------------|--------|
| Membros Inferiores | `lower_knee` + `lower_hip` | 1 knee + 1 hip = 2 | superset |
| Membros Superiores | `upper_push` + `upper_pull` | 1 push + 1 pull = 2 | superset |
| Potência & Pliometria | `category = "potencia_pliometria"` | 2 | tradicional |
| Carregamento | `carry` | 1 | tradicional |

**Potência & Pliometria**: Só aparece quando `valences.includes("potencia")` E `groupLevel !== "iniciante"`.

Parâmetros definidos pela valência primária:

```typescript
const VALENCE_CONFIG = {
  potencia:        { sets: "3-4", reps: "3-5",   interval: 120, pse: "7-8" },
  forca:           { sets: "4-5", reps: "4-6",   interval: 90,  pse: "8-9" },
  hipertrofia:     { sets: "3-4", reps: "8-12",  interval: 60,  pse: "7-8" },
  condicionamento: { sets: "3",   reps: "12-15", interval: 30,  pse: "6-7" },
};
```

Se valência inclui `condicionamento`, método = `circuito`; caso contrário, `tradicional`.

#### Fase 6 — Respiração
- Bloco fixo, sem exercícios do banco
- Nota: "Box Breathing: 4s inspira, 4s segura, 4s expira, 4s segura. 5 ciclos."

---

## 5. SELEÇÃO DE EXERCÍCIOS

### 5.1 Filtros Aplicados (em ordem)

1. **Por nível**: Exercícios com `level` compatível com o `groupLevel`
   - `"Todos os níveis"` sempre passa
   - Exercício deve ter `levelValue <= groupLevelValue`
   - Mapeamento: Iniciante=1, Ini/Inter=1.5, Intermediário=2, Inter/Avançado=2.5, Avançado=3

2. **Por risco**: 
   - `risk_level = "high"` → só para avançado
   - `risk_level = "medium"` → excluído para iniciante
   - `risk_level = "low"` → sempre incluso

3. **Exclusão manual**: IDs em `excludeExercises` são removidos

4. **Validação mínima**: Precisa de pelo menos 20 exercícios após filtros

### 5.2 Método de Seleção

- `selectExercisesByPattern()`: Filtra por `movement_pattern` (para força)
- `selectExercisesByCategory()`: Filtra por `category` (para LMF, mobilidade, core, pliometria)
- Ambos usam **shuffle aleatório** (Fisher-Yates) + `.slice(0, count)`
- **Não há anti-repetição entre treinos A/B/C** — cada treino seleciona independentemente

### 5.3 Campos Consultados do Banco

```sql
SELECT id, name, movement_pattern, functional_group, risk_level, level, 
       category, subcategory, movement_plane, equipment_required, 
       default_sets, default_reps, plyometric_phase
FROM exercises_library
```

---

## 6. INTEGRAÇÃO OURA RING (MEL-IA-002)

### Volume Multiplier

O readiness médio do grupo ajusta automaticamente o volume de séries:

| Readiness Score | Multiplier | Efeito |
|----------------|------------|--------|
| 85-100 | 1.1 | +10% volume |
| 65-84 | 1.0 | Volume normal |
| 45-64 | 0.8 | -20% volume |
| 25-44 | 0.6 | -40% volume |
| 0-24 | 0.5 | -50% volume |

### Aplicação

```typescript
function applyVolumeMultiplier(sets: string, multiplier: number): string
// "3-4" com multiplier 0.8 → "2-3"
// "3" com multiplier 1.1 → "3" (arredonda)
```

O multiplier é aplicado ao `sets` de cada bloco da fase principal. O warning é mostrado na UI se readiness < 45.

---

## 7. PERIODIZAÇÃO DO MESOCICLO (S1-S4)

Os treinos A, B, C se repetem por 4 semanas. A progressão é via multiplicadores:

| Semana | Nome | Volume Mult | Intensidade Mult | PSE | Pliometria |
|--------|------|-------------|-------------------|-----|------------|
| S1 | Adaptação | 0.7 | 0.7 | 5-6 | none |
| S2 | Desenvolvimento | 1.0 | 0.85 | 6-7 | low |
| S3 | Choque 1 | 1.0 | 0.95 | 7-8 | full |
| S4 | Choque 2 | 1.0 | 1.0 | 8-9 | full |

### Progressão Metcon

Para treinos com valência `condicionamento`:
- S2: Aumentar repetições
- S3: Reduzir intervalo / aumentar carga / aumentar densidade
- S4: Reduzir intervalo / aumentar carga / aumentar densidade

### Métodos Disponíveis por Ciclo

- S1: tradicional, circuito
- S2: tradicional, superset
- S3: tradicional, superset, triset, emom, cluster
- S4: tradicional, superset, triset, emom, amrap, for_time, cluster

**NOTA IMPORTANTE**: A progressão S1-S4 é calculada nos `metadata.recommendedProgression` do output, mas **NÃO é aplicada na geração dos exercícios**. O motor gera UM treino base e retorna os multiplicadores para o frontend aplicar visualmente.

---

## 8. VALÊNCIAS DE TREINO

### 4 Valências Disponíveis

| Chave | Label |
|-------|-------|
| `potencia` | Potência |
| `forca` | Força |
| `hipertrofia` | Hipertrofia |
| `condicionamento` | Condicionamento Metabólico |

### Combinações Válidas (máx 2 por sessão)

```
[potencia], [forca], [hipertrofia], [condicionamento]
[potencia, forca], [forca, hipertrofia]
[potencia, condicionamento], [hipertrofia, condicionamento]
```

A UI não valida combinações — apenas limita a 2 seleções por slot.

---

## 9. NOMENCLATURA GERADA

```typescript
function generateWorkoutName(slot, valences):
  // Slot: A→"Power", B→"Build", C→"Flow"
  // Valência: potencia→"Explosive", forca→"Strength", hipertrofia→"Hyper", condicionamento→"MetCon"
  // Exemplo: "Build Strength + Hyper"
```

---

## 10. OUTPUT (Estrutura do Mesociclo Gerado)

```typescript
interface GeneratedMesocycle {
  id: string;
  groupLevel: "iniciante" | "intermediario" | "avancado";
  workouts: GeneratedWorkout[];  // 3 workouts (A, B, C)
  createdAt: string;
  metadata: {
    groupReadiness?: number | null;
    volumeMultiplier?: number;
    totalPatternsBalance: Record<string, number>;  // sempre {} (não implementado)
    recommendedProgression: {
      s1: { volumeMultiplier: number; intensityMultiplier: number };
      s2: { volumeMultiplier: number; intensityMultiplier: number };
      s3: { volumeMultiplier: number; intensityMultiplier: number };
      s4: { volumeMultiplier: number; intensityMultiplier: number };
    };
  };
}

interface GeneratedWorkout {
  id: string;
  slot: "A" | "B" | "C";
  name: string;           // "Power Strength + Hyper"
  valences: string[];
  totalDuration: number;   // sempre 55
  phases: SessionPhase[];  // 6 fases
  coveredPatterns: string[];
  coreTriplanarCheck: {
    anti_extensao: boolean;
    anti_flexao_lateral: boolean;
    anti_rotacao: boolean;
  };
  mindfulnessScript?: string;   // nunca preenchido (placeholder para LLM)
  motivationalPhrase?: string;  // nunca preenchido (placeholder para LLM)
}

interface SessionPhase {
  id: string;
  name: string;
  order: number;
  duration: number;
  blocks: ExerciseBlock[];
  notes?: string;
}

interface ExerciseBlock {
  id: string;
  name: string;
  method: string;
  exercises: GeneratedExercise[];
  restBetweenSets: number;
  notes?: string;
}

interface GeneratedExercise {
  id: string;
  exerciseLibraryId: string;
  name: string;
  movementPattern: string;
  subcategory?: string;
  sets: string;
  reps: string;
  interval: number;
  pse?: string;
  executionCues?: string;  // nunca preenchido (placeholder para LLM)
  riskLevel: string;
  equipment?: string[];
}
```

---

## 11. VALIDAÇÕES E WARNINGS

| Validação | Quando | Tipo |
|-----------|--------|------|
| Input inválido (groupLevel ou workouts) | Antes da geração | HTTP 400 |
| < 20 exercícios após filtros | Antes da geração | HTTP 400 |
| Core triplanar incompleto | Após geração de cada workout | Warning na resposta |
| Readiness < 45 | Após calcular volume multiplier | Warning na resposta |
| Sem autenticação | Início | HTTP 401 |

---

## 12. ARQUIVOS ENVOLVIDOS

| Arquivo | Responsabilidade |
|---------|------------------|
| `supabase/functions/generate-group-session/index.ts` | Edge Function — todo o motor de geração |
| `src/constants/backToBasics.ts` | Constantes, tipos, helpers do sistema Back to Basics |
| `src/types/aiSession.ts` | Tipos TypeScript para input/output |
| `src/hooks/useGenerateGroupSession.ts` | Hook React para chamar a edge function |
| `src/components/GenerateGroupSessionDialog.tsx` | UI do dialog (3 steps + preview) |
| `docs/AI_PROVIDERS.md` | Decisões sobre providers de IA |

---

## 13. LIMITAÇÕES E PROBLEMAS CONHECIDOS

### Funcionalidades NÃO Implementadas (placeholders)

1. **`mindfulnessScript`**: Campo existe no tipo mas nunca é preenchido. Era para LLM gerar.
2. **`motivationalPhrase`**: Idem.
3. **`executionCues`**: Idem. Deveria ter dicas de execução por exercício.
4. **`totalPatternsBalance`**: Sempre retorna `{}`. Deveria ter contagem de padrões cobertos.

### Problemas de Lógica

1. **Sem anti-repetição entre A/B/C**: Cada treino seleciona exercícios independentemente. O mesmo exercício pode aparecer em A e B.
2. **Seleção puramente aleatória**: `shuffleArray` sem peso por adequação, uso recente, ou diversidade.
3. **Condicionamento Metabólico não diferencia método**: Quando valência é `condicionamento`, usa `circuito` mas com os mesmos exercícios de força. Não aplica EMOM/AMRAP/For Time.
4. **Progressão S1-S4 é só metadata**: Os multiplicadores estão no output mas não geram 4 versões diferentes. O frontend deveria aplicar, mas não há evidência de uso.
5. **Breathing phase estática**: Sempre Box Breathing. Não consulta a tabela `breathing_protocols`.
6. **Sem validação de equipamento**: Não verifica `equipment_inventory`.
7. **Sem uso de LLM**: Apesar do nome "IA", a geração é 100% determinística. Os campos que dependeriam de LLM estão vazios.

### Problemas de Dados

1. **`functional_group`**: Campo consultado mas nunca usado na lógica.
2. **`plyometric_phase`**: Campo consultado mas nunca usado. A progressão de pliometria (19 fases) existe nas constantes mas não é aplicada.
3. **`movement_plane`**: Consultado mas não usado para balanceamento sagital/frontal/transverso.

---

## 14. CONSTANTES COMPLETAS RELEVANTES

### Níveis de Aluno

```typescript
STUDENT_LEVELS = {
  iniciante:     { monthsTraining: 0-6,   plyometricsAllowed: false, maxRiskLevel: "medium" },
  intermediario: { monthsTraining: 6-24,  plyometricsAllowed: true,  maxRiskLevel: "medium" },
  avancado:      { monthsTraining: 24+,   plyometricsAllowed: true,  maxRiskLevel: "high" },
};
```

### Estrutura do Mesociclo

```typescript
MESOCYCLE_STRUCTURE = {
  weeks: 4,
  workoutsPerWeek: 3,
  workoutSlots: {
    A: { days: ["Segunda", "Quinta"] },
    B: { days: ["Terça", "Sexta"] },
    C: { days: ["Quarta", "Sábado"] },
  },
};
```

### Aquecimento (6 Etapas — definido mas NÃO usado no motor)

1. LMF (2-3 min)
2. Mobilidade Articular (2 min)
3. Ativação Muscular (2 min)
4. Movimento Integrado (2 min)
5. Potencialização SNC (1 min)
6. Específico (1-2 min)

**NOTA**: O motor usa uma estrutura simplificada de 4 fases preparatórias (LMF, Mobilidade, Ativação, Core), não as 6 etapas definidas em `WARMUP_PHASES`.

### Pliometria (19 Progressões — definidas mas NÃO usadas)

Existem 19 fases de progressão pliométrica definidas em `PLYOMETRIC_PHASES`, mas o motor simplesmente seleciona 2 exercícios aleatórios da categoria `potencia_pliometria` sem considerar a fase do aluno.

### Métodos de Treino (11 — parcialmente usados)

```
tradicional, superset, triset, circuito, emom, amrap, for_time, 
cluster, complexo, rest_pause, drop_set
```

O motor usa apenas: `tradicional`, `superset`, `circuito`.

### Core Triplanar

```typescript
CORE_TRIPLANAR = {
  anti_extensao:        { examples: ["Prancha frontal", "Dead bug", "Rollout", "Body saw"] },
  anti_flexao_lateral:  { examples: ["Prancha lateral", "Farmer's carry uni", "Side plank row"] },
  anti_rotacao:         { examples: ["Pallof press", "Bird dog", "Renegade row"] },
};
```

### Pirâmide Mobilidade/Estabilidade (definida mas NÃO usada)

```
Pé (Estável) → Tornozelo (Móvel) → Joelho (Estável) → Quadril (Móvel)
→ Lombar (Estável) → Torácica (Móvel) → Escapular (Estável) → Ombro (Móvel)
```

### Estações de Treino (definidas mas NÃO usadas no motor)

```typescript
TRAINING_STATIONS = {
  a: { focus: "Membros Inferiores", patterns: lower_knee + lower_hip },
  b: { focus: "Membros Superiores", patterns: upper_push + upper_pull },
  c: { focus: "Core/Carry/Breath", patterns: carry },
};
```

---

## 15. TABELAS DO BANCO ENVOLVIDAS

| Tabela | Uso |
|--------|-----|
| `exercises_library` | Fonte de todos os exercícios |
| `breathing_protocols` | NÃO consultada (deveria ser) |
| `equipment_inventory` | NÃO consultada (deveria ser) |
| `session_templates` | Existe para salvar templates, mas NÃO usada pelo motor |

### Campos Relevantes de `exercises_library`

| Campo | Tipo | Usado pelo motor? |
|-------|------|-------------------|
| `id` | uuid | ✅ |
| `name` | text | ✅ |
| `category` | text | ✅ (para LMF, mobilidade, core, pliometria) |
| `subcategory` | text | ✅ (para core triplanar e ativação) |
| `movement_pattern` | text | ✅ (para força/hipertrofia) |
| `risk_level` | text | ✅ (filtro) |
| `level` | text | ✅ (filtro) |
| `default_sets` | text | ✅ (fallback) |
| `default_reps` | text | ✅ (fallback) |
| `equipment_required` | text[] | ❌ (copiado mas não validado) |
| `functional_group` | text | ❌ |
| `movement_plane` | text | ❌ |
| `plyometric_phase` | integer | ❌ |
| `numeric_level` | integer | ❌ |
| `contraction_type` | text | ❌ (não consultado) |
| `laterality` | text | ❌ (não consultado) |
| `position` | text | ❌ (não consultado) |

---

## 16. UI DO DIALOG (GenerateGroupSessionDialog)

### Steps

| Step | Tela | Ação |
|------|------|------|
| `level` | Selecionar nível (3 cards) + ver estrutura ABC | Botão "Próximo" |
| `valences` | Configurar valências por slot (badges clicáveis, máx 2) | Botão "Gerar Mesociclo" |
| `generating` | Loading spinner | Automático |
| `preview` | Visualizar 3 workouts com fases, blocos, exercícios e core check | Botão "Confirmar" |

### Callback

```typescript
onMesocycleGenerated?: (mesocycle: GeneratedMesocycle) => void
```

Atualmente nenhuma página passa esse callback — o dialog é standalone.

---

*Documento gerado em 24/02/2026 para reconstrução do motor de prescrição por IA.*
