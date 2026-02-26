# Motor de Prescrição por IA — Documentação Completa

> **Última atualização**: 26/02/2026 — Refatoração completa (13 itens corrigidos)

---

## 1. VISÃO GERAL

O motor gera um **mesociclo completo de 4 semanas** com 3 treinos semanais (A, B, C) em **uma única operação**. A arquitetura é **híbrida**: lógica determinística para seleção + **Lovable AI (Gemini 2.5 Flash)** para enrichment criativo. Os treinos são **full body** — a diferenciação entre A, B e C vem exclusivamente das **valências** selecionadas pelo treinador.

### Fluxo Completo

```
Treinador abre Dialog → Seleciona nível do grupo → Configura valências A/B/C (máx 2 cada)
→ Envia para Edge Function → Motor seleciona exercícios (com validação de equipamento)
→ LLM gera execution cues + mindfulness + motivational phrases
→ Retorna mesociclo com 3 workouts → Preview no Dialog → Confirmar
```

### Correções Aplicadas (v2)

| # | Correção | Status |
|---|----------|--------|
| 1 | Anti-repetição entre A/B/C (exercícios da fase principal não se repetem) | ✅ |
| 2 | Breathing phase consulta `breathing_protocols` do banco | ✅ |
| 3 | Validação de equipamento via `equipment_inventory` | ✅ |
| 4 | Progressão S1-S4 com PSE e métodos metcon por ciclo | ✅ |
| 5 | `executionCues`, `mindfulnessScript`, `motivationalPhrase` via Lovable AI | ✅ |
| 6 | Métodos avançados (EMOM/AMRAP/For Time) para condicionamento | ✅ |
| 7 | `totalPatternsBalance` populado com contagem real | ✅ |
| 8 | Progressão pliométrica respeita nível (max fase 11 intermediário, 19 avançado) | ✅ |
| 9 | Campos não usados removidos da query (`functional_group`, `plyometric_phase`) | ✅ |
| 10 | Callback `onMesocycleGenerated` — responsabilidade do frontend | ⏳ |
| 11 | Auth usa anon key + `getClaims()` ao invés de service role | ✅ |
| 12 | Seleção ponderada por diversidade (plano, equipamento) | ✅ |
| 13 | `functional_group` removido da query | ✅ |

---

## 2. INPUT

```typescript
interface MesocycleInput {
  groupLevel: "iniciante" | "intermediario" | "avancado";
  workouts: WorkoutSlotConfig[];  // 3 slots: A, B, C
  excludeExercises?: string[];
  groupReadiness?: number;        // 0-100, média do Oura Ring
}
```

---

## 3. SELEÇÃO DE EXERCÍCIOS

### Filtros (em ordem)

1. **Nível**: `numeric_level` (preferido) ou `level` text
2. **Risco**: high→avançado, medium→não-iniciante
3. **Equipamento**: cross-check com `equipment_inventory.is_available`
4. **Exclusão manual**: IDs em `excludeExercises`
5. **Anti-repetição**: IDs acumulados entre A→B→C (fase principal)
6. **Mínimo**: 20 exercícios após filtros

### Método de Seleção (Ponderada)

Não é mais shuffle puro. Cada exercício recebe um score:
- Base aleatória (0-1)
- +0.1 se tem equipamento definido (mais variado)
- +0.15 se plano ≠ sagital (diversidade de planos)

---

## 4. ESTRUTURA DA SESSÃO (55 min)

| # | Fase | Duração | Fonte |
|---|------|---------|-------|
| 1 | LMF | 3 min | `category = "lmf"`, 3 exercícios |
| 2 | Mobilidade | 5 min | `category = "mobilidade"`, 4 exercícios |
| 3 | Ativação | 5 min | `core_ativacao` + subcategorias ativação, 3 exercícios |
| 4 | Core Triplanar | 7 min | `core_ativacao` + subcategorias triplanares, 1 por plano |
| 5 | Principal | 30 min | Força por `movement_pattern`, full body |
| 6 | Respiração | 5 min | `breathing_protocols` do banco (fallback: Box Breathing) |

---

## 5. INTEGRAÇÃO OURA RING

| Readiness | Multiplier | Efeito |
|-----------|------------|--------|
| 85-100 | 1.1 | +10% volume |
| 65-84 | 1.0 | Normal |
| 45-64 | 0.8 | -20% |
| 25-44 | 0.6 | -40% |
| 0-24 | 0.5 | -50% |

---

## 6. PERIODIZAÇÃO S1-S4

| Semana | Volume | Intensidade | PSE | Pliometria | Metcon |
|--------|--------|-------------|-----|------------|--------|
| S1 | 0.7x | 0.7x | 5-6 | none | circuito |
| S2 | 1.0x | 0.85x | 6-7 | low | circuito |
| S3 | 1.0x | 0.95x | 7-8 | full | emom/circuito |
| S4 | 1.0x | 1.0x | 8-9 | full | amrap/for_time/emom |

---

## 7. ENRICHMENT VIA LLM (Lovable AI)

O motor chama Lovable AI Gateway (Gemini 2.5 Flash) com tool calling para gerar:

- **`executionCues`**: 1-2 frases de orientação por exercício
- **`mindfulnessScript`**: 3-4 frases para a fase de respiração
- **`motivationalPhrase`**: frase inspiradora por treino

A chamada é **non-blocking**: se falhar, os campos ficam vazios e o workout permanece válido.

---

## 8. CAMPOS CONSULTADOS DE `exercises_library`

| Campo | Usado? |
|-------|--------|
| `id` | ✅ |
| `name` | ✅ |
| `category` | ✅ |
| `subcategory` | ✅ |
| `movement_pattern` | ✅ |
| `risk_level` | ✅ |
| `level` | ✅ (fallback) |
| `numeric_level` | ✅ (preferido) |
| `movement_plane` | ✅ (ponderação) |
| `equipment_required` | ✅ (validação) |
| `default_sets` | ✅ |
| `default_reps` | ✅ |

---

## 9. TABELAS CONSULTADAS

| Tabela | Uso |
|--------|-----|
| `exercises_library` | Fonte de exercícios |
| `breathing_protocols` | Técnica de respiração real |
| `equipment_inventory` | Validação de disponibilidade |

---

## 10. ARQUIVOS ENVOLVIDOS

| Arquivo | Responsabilidade |
|---------|------------------|
| `supabase/functions/generate-group-session/index.ts` | Edge Function completa |
| `src/constants/backToBasics.ts` | Constantes e tipos |
| `src/types/aiSession.ts` | Tipos TypeScript |
| `src/hooks/useGenerateGroupSession.ts` | Hook React |
| `src/components/GenerateGroupSessionDialog.tsx` | UI (4 steps) |

---

*Documento atualizado em 26/02/2026 após refatoração completa do motor.*
