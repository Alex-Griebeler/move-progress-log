# Relatório Completo — Motor de Prescrição por IA (Back to Basics v14.5)

> **Data de geração**: 16/03/2026  
> **Fonte**: `supabase/functions/generate-group-session/index.ts` (1745 linhas)

---

## 1. VISÃO GERAL DA ARQUITETURA

O motor de prescrição por IA gera um **mesociclo completo** (3-8 semanas, default 4) com **3 treinos semanais (A, B, C)** em uma única operação. A arquitetura é **híbrida em 3 camadas**:

| Camada | Responsabilidade | Tecnologia |
|--------|-----------------|------------|
| **Determinística** | Seleção de exercícios, filtros de segurança, periodização | Edge Function (TypeScript/Deno) |
| **Autorregulação** | Ajuste de volume/intensidade via Oura Ring readiness | Multiplicadores automáticos |
| **Generativa (LLM)** | Execution cues, mindfulness scripts, frases motivacionais | Lovable AI (Gemini 2.5 Flash) |

---

## 2. INPUT DA GERAÇÃO

```typescript
interface MesocycleInput {
  groupLevel: "iniciante" | "intermediario" | "avancado";
  workouts: WorkoutSlotConfig[];  // 3 slots: A, B, C (máx 2 valências cada)
  excludeExercises?: string[];    // IDs de exercícios a excluir
  groupReadiness?: number;        // 0-100, média do Oura Ring
  weekCount?: number;             // 3-8 semanas (default 4)
  audiencePreset?: "adulto" | "senior_70" | "adolescente";
  rotationMode?: "A" | "B";      // A=rotação total, B=seletiva
  retainExerciseIds?: string[];   // Modo B: IDs a manter
}
```

### Valências suportadas
- **Potência** — sets 3-4, reps 3-5, intervalo 120s, PSE 7-8
- **Força** — sets 4-5, reps 4-6, intervalo 90s, PSE 8-9
- **Hipertrofia** — sets 3-4, reps 8-12, intervalo 60s, PSE 7-8
- **Condicionamento** — sets 3, reps 12-15, intervalo 45s, PSE 6-7

---

## 3. ESTRUTURA DA SESSÃO (55 minutos, 9-10 fases)

| # | Fase | Duração | Ordem | Fonte de Exercícios |
|---|------|---------|-------|---------------------|
| 1 | **Abertura** (Respiração + LMF) | 3 min | 1 | `breathing_protocols` + `lmf` (2 regiões, trilhos distintos) |
| 2 | **Mobilidade Específica ao BP1** | 4 min | 2 | `mobilidade` (subcats baseadas no padrão do BP1) |
| 3 | **Core Biplanar** | 5 min | 3 | `core_ativacao` (2 planos por slot, cobertura semanal) |
| 4 | **BP1 — Valência Primária** | 10 min | 4 | `forca_hipertrofia` (1 lower knee + 1 upper push em superset) |
| 5 | **Respiração Inter-bloco** | 0.5 min | 5 | Respiração nasal 3:6 |
| 6 | **BP2 — Valência Secundária** | 10 min | 6 | `forca_hipertrofia` (1 lower hip + 1 upper pull em superset) |
| 7 | **Respiração Inter-bloco** | 0.5 min | 7 | Respiração nasal 3:6 |
| 8 | **BP3 — Complementar** (opcional) | 7 min | 8 | Lunge + suplementar upper (quando ≥2 valências ou metcon) |
| 9 | **Finalizador — Carry** | 4 min | 9 | `carregar` pattern (pode ser omitido se sem exercícios) |
| 10 | **Encerramento** | 4 min | 10 | `breathing_protocols` (protocolo alinhado à valência final) |

---

## 4. PIPELINE DE FILTRAGEM DE EXERCÍCIOS

A seleção segue esta sequência rigorosa:

### 4.1 Filtros Primários
1. **Nível (Boyle Score)**: Iniciante ≤ 2, Intermediário ≤ 3, Avançado ≤ 5
2. **Risco**: `high` → apenas avançado; `medium` → não-iniciante
3. **Equipamento**: Cross-check com `equipment_inventory.is_available`
4. **Exclusão manual**: IDs em `excludeExercises`
5. **Mínimo**: 20 exercícios após filtros (warning se menor)

### 4.2 Filtros de Segurança v14.5
| Filtro | Regra | Implementação |
|--------|-------|---------------|
| **F1** (Lombar) | Máx 2 exercícios LOM ≥ 4 por sessão | `applyLumbarFilter()` |
| **F3** (Metcon) | TEC ≤ 2 em blocos de condicionamento | `filterForMetcon()` |
| **All-out** | PSE 9-10 só se AX ≤ 2 E LOM ≤ 2 | `canAllOut()` |
| **Anti-Metcon** | PSE máx 8 em blocos não-metcon | `clampPseForNonMetcon()` |
| **F4** (Teachable) | Prioriza exercícios com regressões disponíveis | `applyF4TeachableProgression()` |

### 4.3 Seleção Ponderada
Não é shuffle puro — cada exercício recebe score:
- Base aleatória (0-1)
- +0.1 se tem equipamento definido (mais variado)
- +0.15 se plano ≠ sagital (diversidade de planos)

---

## 5. DISTRIBUIÇÃO CORE BIPLANAR POR SLOT

| Slot | Planos do Core |
|------|---------------|
| A | anti_extensão + anti_rotação |
| B | anti_flexão_lateral + anti_extensão |
| C | anti_rotação + anti_flexão_lateral |

**Resultado**: Cobertura triplanar completa na semana (cada plano aparece em 2 dos 3 slots).

---

## 6. MOBILIDADE ESPECÍFICA AO BP1

| Padrão BP1 | Subcategorias de Mobilidade |
|------------|---------------------------|
| dominancia_joelho | quadril, tornozelo, joelho |
| cadeia_posterior | quadril, isquiotibiais, coluna |
| lunge | quadril, tornozelo, joelho |
| empurrar | ombro, torácica, escapular |
| puxar | ombro, torácica, escapular |
| carregar | ombro, quadril, coluna |

---

## 7. PADRÕES DE MOVIMENTO (Full Body por Sessão)

| Grupo | Padrões | Bloco |
|-------|---------|-------|
| Lower Knee | dominancia_joelho, lunge | BP1 |
| Lower Hip | cadeia_posterior | BP2 |
| Upper Push | empurrar | BP1 |
| Upper Pull | puxar | BP2 |
| Carry | carregar | Finalizador |

**Anti-repetição**: Exercícios usados em A são excluídos de B e C (na fase principal).

---

## 8. PERIODIZAÇÃO S1-S4

| Semana | Volume | Intensidade | PSE | Pliometria | Metcon |
|--------|--------|-------------|-----|------------|--------|
| S1 | 0.7x | 0.7x | 5-6 | none | circuito |
| S2 | 1.0x | 0.85x | 6-7 | low | circuito |
| S3 | 1.0x | 0.95x | 7-8 | full | emom/circuito |
| S4 | 1.0x | 1.0x | 8-9 | full | amrap/for_time/emom |

> Semanas além de S4 repetem o ciclo: S5=S1, S6=S2, etc.

---

## 9. AUTORREGULAÇÃO VIA OURA RING

| Readiness Score | Multiplicador | Efeito |
|-----------------|--------------|--------|
| 85-100 | 1.1x | +10% volume |
| 65-84 | 1.0x | Normal |
| 45-64 | 0.8x | -20% volume |
| 25-44 | 0.6x | -40% volume |
| 0-24 | 0.5x | -50% volume |

---

## 10. PRESETS DE PÚBLICO-ALVO (Fase 4)

| Preset | PSE Max | AX Max | LOM Max | TEC Max | Sets Max | Restrições |
|--------|---------|--------|---------|---------|----------|------------|
| **Adulto** | 10 | 5 | 5 | 5 | 20 | Nenhuma |
| **Senior 70+** | 7 | 2 | 3 | 2 | 14 | Sem pliometria, foco estabilidade |
| **Adolescente** | 8 | 3 | 3 | 3 | 16 | Foco aprendizagem motora |

---

## 11. VALIDAÇÃO CROSS-SESSION (Pós-geração)

### 11.1 Equilíbrio de Dominância (F2)
- Push mínimo semanal: 6 sets
- Pull mínimo semanal: 6 sets
- Knee mínimo semanal: 6 sets
- Hip mínimo semanal: 4 sets
- **Pull/Push ratio ideal**: 1.2x — 1.4x

### 11.2 Controle Neural e Articular (G12)
- Máx 2 sessões de alta demanda neural/semana
- Máx 2 hinges pesados/semana
- **Limites articulares semanais** (em sets com carga significativa):
  - Joelho: 25 sets
  - Ombro: 20 sets
  - Lombar: 15 sets

### 11.3 Sobreposição de Prime Movers (F5)
- Alerta se mesmo padrão aparece em todos os 3 treinos com > 15 sets totais

---

## 12. ENRICHMENT VIA LLM (Lovable AI)

**Modelo**: `google/gemini-2.5-flash`  
**Método**: Tool calling (structured output)  
**Non-blocking**: Se falhar, campos ficam vazios — workout permanece válido.

### Outputs gerados:
| Output | Descrição | Formato |
|--------|-----------|---------|
| `executionCues` | 1-2 frases de orientação por exercício | String por exercício |
| `mindfulnessScript` | 3-4 frases para encerramento | String por workout |
| `motivationalPhrase` | Frase inspiradora | String por workout |

---

## 13. PROTOCOLO DE ENCERRAMENTO POR VALÊNCIA

| Valência Final | Tipo de Protocolo |
|---------------|-------------------|
| Potência | post_workout, ativação_parasimpática |
| Força | post_workout, recuperação |
| Hipertrofia | post_workout, recuperação |
| Condicionamento | post_workout, cool_down |

---

## 14. TABELAS CONSULTADAS

| Tabela | Uso | Registros |
|--------|-----|-----------|
| `exercises_library` | Fonte principal de exercícios | 917 |
| `breathing_protocols` | Protocolos de respiração/mindfulness | Dinâmico |
| `equipment_inventory` | Validação de equipamento disponível | 38 tipos |

---

## 15. MODO A/B DE ROTAÇÃO INTERMENSAL

- **Modo A** (default): Rotação total — todos os exercícios mudam entre mesociclos
- **Modo B**: Rotação seletiva — `retainExerciseIds` mantém exercícios específicos do mesociclo anterior

---

## 16. FLUXO COMPLETO (Diagrama)

```
Treinador → Dialog (4 steps)
  ↓
1. Seleciona nível do grupo
2. Configura valências A/B/C (máx 2 cada)
3. (Opcional) Preset, semanas, exclusões
4. Preview
  ↓
Edge Function: generate-group-session
  ↓
[Query exercises_library + breathing_protocols + equipment_inventory]
  ↓
[Filtros: nível → risco → equipamento → exclusão → mínimo 20]
  ↓
[Filtros segurança: F1, F3, All-out, F4]
  ↓
[Geração: Abertura → Mobilidade → Core → BP1 → Resp → BP2 → Resp → BP3 → Carry → Encerramento]
  ↓
[Anti-repetição entre A/B/C]
  ↓
[Validação cross-session: F2, F5, G12]
  ↓
[LLM Enrichment (non-blocking)]
  ↓
[Periodização S1-S4 calculada]
  ↓
Retorna mesociclo completo → Preview → Confirmar
```

---

*Relatório gerado automaticamente em 16/03/2026.*
