

# Plano Completo: Prescrição de Sessões por IA com Biblioteca de Exercícios Expandida

## Visão Geral

Este plano abrange duas frentes integradas de trabalho:

1. **Atualização e Expansão da Biblioteca de Exercícios** - Normalizar classificações, adicionar novos campos e importar ~120 exercícios faltantes
2. **Módulo de Geração de Sessões por IA** - Implementar prescrição automática de treinos em small groups seguindo a metodologia "Back to Basics"

---

## Parte 1: Biblioteca de Exercícios

### Diagnóstico Atual

| Aspecto | Estado Atual | Estado Desejado |
|---------|--------------|-----------------|
| Total de exercícios | ~280 | ~400+ |
| Padrões de movimento | 24 valores inconsistentes | 23 valores normalizados |
| Core triplanar | Não segmentado | Segmentado em 3 categorias |
| Campos de metadados | 8 campos | 16 campos |
| Links de vídeo | Nenhum | ~100 vídeos |
| Progressões de pliometria | Ausentes | 19 fases documentadas |

### Novos Campos para `exercises_library`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `video_url` | TEXT | Link YouTube/Drive para demonstração |
| `equipment_required` | TEXT[] | Equipamentos necessários |
| `prerequisites` | JSONB | Pré-requisitos (exercícios/habilidades) |
| `risk_level` | TEXT | 'low', 'medium', 'high' |
| `category` | TEXT | Categoria principal |
| `subcategory` | TEXT | Subcategoria detalhada |
| `plyometric_phase` | INTEGER | Fase 1-19 para pliométricos |
| `default_sets` | TEXT | Séries padrão sugeridas |
| `default_reps` | TEXT | Repetições padrão sugeridas |

### Sistema de Classificação Normalizado

**Padrões de Movimento (23 valores):**

- **Força**: empurrar_horizontal, empurrar_vertical, puxar_horizontal, puxar_vertical, dominancia_joelho, dominancia_quadril, carregar
- **Core**: core_anti_extensao, core_anti_flexao_lateral, core_anti_rotacao
- **Ativação**: ativacao_escapula, ativacao_gluteos, ativacao_flexores_quadril
- **Mobilidade**: mobilidade_tornozelo, mobilidade_quadril, mobilidade_toracica, mobilidade_integrada
- **Pliometria**: pliometria_bilateral_linear, pliometria_unilateral_linear, pliometria_unilateral_lateral, pliometria_unilateral_lateral_medial
- **Preparação**: lmf, potencializacao_snc

### Novas Tabelas

**`equipment_inventory`** - 38 tipos de equipamentos da Fabrik:
- Kettlebells (8kg a 32kg)
- Halteres (2kg a 12kg)
- Medicine Balls, Slam Balls, Sand Bags
- Barras (olímpica, hexagonal)
- TRX, Bandas, Mini Bands
- Boxes, Bolas Suíças, Air Bike, Yoke
- Equipamentos de recuperação (banheira de gelo, sauna)

**`breathing_protocols`** - Técnicas de respiração e mindfulness:
- Box Breathing (4-4-4-4)
- Respiração 4-7-8
- Respiração Wim Hof
- Physiological Sigh
- Respiração diafragmática

---

## Parte 2: Geração de Sessões por IA

### Arquitetura Híbrida em 3 Camadas

```text
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 1: DETERMINÍSTICA (Regras + Evidência)               │
│ - Metodologia Back to Basics                                │
│ - Limites de dose (máx 2 valências por sessão)              │
│ - Gates de segurança (pliometria, risco)                    │
│ - Validação de equipamentos                                 │
│ - Ajustes por ciclo S1-S4                                   │
├─────────────────────────────────────────────────────────────┤
│ CAMADA 2: AUTORREGULAÇÃO (Heurística)                       │
│ - Ajuste por RIR/RPE + readiness                            │
│ - Soft deload quando qualidade técnica cai                  │
├─────────────────────────────────────────────────────────────┤
│ CAMADA 3: GENERATIVA (LLM) — Somente Linguagem              │
│ - Nome elegante da sessão                                   │
│ - Cues de execução por exercício                            │
│ - Frases motivacionais                                      │
│ - Script de mindfulness                                     │
└─────────────────────────────────────────────────────────────┘
```

### Formatos de Sessão

**Tradicional (50-55 min):**
1. Preparação (8-10 min) - Aquecimento em 6 etapas
2. Ativação/Core (5-8 min) - Core triplanar obrigatório
3. Principal (25-30 min) - Máx 2 valências, estações A/B/C
4. Cool Down (5-8 min) - Respiração + mindfulness

**Time Efficient (30 min):**
1. Preparação Comprimida (5 min) - Sem LMF
2. Principal (20-22 min) - Máx 1 valência, alta densidade
3. Mindfulness Integrado (3-5 min)

### Ciclos de Periodização

| Semana | Nome | Volume | PSE | Métodos | Pliometria |
|--------|------|--------|-----|---------|------------|
| S1 | Recuperação | 60-70% | 5-6 | Circuito leve | Não |
| S2 | Adaptação | 80-90% | 6-7 | Tradicional, Superset | Baixa |
| S3 | Choque | 100% | 7-8 | EMOM, Cluster, Triset | Sim |
| S4 | Choque | 100% | 8-9 | AMRAP, For Time | Sim |

### Valências de Treino

Lista fixa para sessões:
- Força
- Potência
- Hipertrofia
- Resistência Muscular
- Condicionamento Metabólico

**Combinações válidas (máx 2):**
- Força + Potência
- Força + Hipertrofia
- Potência + Condicionamento
- Hipertrofia + Resistência Muscular

### Organização em Estações (Small Groups até 8 alunos)

```text
ESTAÇÃO A: MEMBROS INFERIORES
├── Dominância de joelho/quadril
└── Foco: força, potência ou hipertrofia

ESTAÇÃO B: MEMBROS SUPERIORES
├── Empurrar/puxar
└── Complementar à estação A

ESTAÇÃO C: CORE/CARRY/BREATH (opcional)
├── Core triplanar
├── Carregamentos
└── Respiração guiada
```

---

## Artefatos a Criar

### Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `equipment_inventory` | Inventário de equipamentos |
| `breathing_protocols` | Protocolos de respiração e mindfulness |
| `session_templates` | Templates de sessão gerados |

### Backend

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/generate-group-session/index.ts` | Edge function com motor determinístico + LLM |

### Frontend - Constantes e Tipos

| Arquivo | Descrição |
|---------|-----------|
| `src/constants/backToBasics.ts` | Fases, valências, ciclos, regras |
| `src/constants/equipment.ts` | Inventário de equipamentos |
| `src/types/aiSession.ts` | Interfaces TypeScript |

### Frontend - Hooks

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useGenerateGroupSession.ts` | Mutation para gerar sessão |
| `src/hooks/useEquipmentInventory.ts` | Query de equipamentos |
| `src/hooks/useBreathingProtocols.ts` | Query de protocolos |

### Frontend - Componentes

| Arquivo | Descrição |
|---------|-----------|
| `src/components/GenerateGroupSessionDialog.tsx` | Dialog multi-step de geração |
| `src/components/SessionPreview.tsx` | Visualização da sessão gerada |
| `src/components/PhaseBlock.tsx` | Card de cada fase |
| `src/components/StationCard.tsx` | Card de estação A/B/C |
| `src/components/RiskLevelBadge.tsx` | Badge de nível de risco |
| `src/components/ExerciseVideoPreview.tsx` | Preview de vídeo |
| `src/components/CoreTriplanarIndicator.tsx` | Check visual do core |

---

## Artefatos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/hooks/useExercisesLibrary.ts` | Novos campos, constantes normalizadas |
| `src/components/AddExerciseDialog.tsx` | Novos campos (vídeo, risco, equipamentos) |
| `src/components/EditExerciseLibraryDialog.tsx` | Novos campos |
| `src/pages/ExercisesLibraryPage.tsx` | Novos filtros (categoria, risco) |
| `src/pages/PrescriptionsPage.tsx` | Botão "Gerar com IA" |
| `src/i18n/pt-BR.json` | Textos da nova funcionalidade |

---

## Fluxo do Usuário (Dialog de Geração)

**Step 1: Formato e Objetivo**
- Escolher: Time Efficient (30 min) ou Tradicional (50-55 min)
- Selecionar ciclo: S1, S2, S3 ou S4
- Escolher valências (máx 2)

**Step 2: Configuração do Grupo**
- Foco: Inferior, Superior ou Full Body
- Nível médio do grupo
- Opções: Incluir pliometria, incluir LMF

**Step 3: Geração**
- Loading com animação
- "Montando sua sessão Back to Basics..."

**Step 4: Preview e Ajuste**
- Visualização por fases/blocos/estações
- Indicadores de core triplanar
- Botão "Trocar" por exercício
- Botão "Regenerar" por bloco

**Step 5: Confirmação**
- Resumo final
- "Salvar como Prescrição"

---

## Regras de Negócio (Motor Determinístico)

### Core Triplanar Obrigatório
Toda sessão deve incluir pelo menos 1 exercício de cada:
- Anti-extensão (prancha frontal, dead bug, rolamentos)
- Anti-flexão lateral (prancha lateral, farmer's carry)
- Anti-rotação (Pallof press, bird dog)

### Gates de Segurança
- Pliometria: Só se nível ≥ intermediário E ciclo ≥ S2
- Exercícios high_risk: Verificar prerequisites
- Validar equipamentos disponíveis antes de salvar

### Pirâmide Mobilidade/Estabilidade
```text
PÉ         → Estável
TORNOZELO  → Móvel
JOELHO     → Estável
QUADRIL    → Móvel
LOMBAR     → Estável
TORÁCICA   → Móvel
ESCAPULAR  → Estável
OMBRO      → Móvel
```

---

## Cronograma de Execução

| Fase | Descrição | Estimativa |
|------|-----------|------------|
| 1 | Migrações de banco (novos campos + tabelas) | 1 dia |
| 2 | Scripts de normalização de dados | 0.5 dia |
| 3 | Seed de equipamentos e respiração | 0.5 dia |
| 4 | Importação de exercícios novos | 1 dia |
| 5 | Atualização de constantes e interfaces | 0.5 dia |
| 6 | Atualização dos dialogs de exercícios | 1 dia |
| 7 | Atualização da página de biblioteca | 0.5 dia |
| 8 | Edge function (motor determinístico) | 2 dias |
| 9 | Integração LLM para linguagem | 1 dia |
| 10 | Dialog multi-step de geração | 2 dias |
| 11 | Componentes de preview (fases, estações) | 1.5 dias |
| 12 | Integração na PrescriptionsPage | 0.5 dia |
| 13 | Testes e ajustes | 1 dia |
| **Total** | | **13 dias** |

---

## Ordem de Execução

1. Executar migrações de banco (novos campos em exercises_library)
2. Criar tabelas auxiliares (equipment_inventory, breathing_protocols, session_templates)
3. Executar scripts de normalização de movement_pattern
4. Seed de equipamentos e protocolos de respiração
5. Importar exercícios novos da planilha
6. Atualizar constantes e interfaces no frontend
7. Atualizar dialogs de criação/edição de exercícios
8. Atualizar página de biblioteca com novos filtros
9. Criar constantes Back to Basics e tipos de sessão
10. Implementar edge function com motor determinístico
11. Adicionar camada LLM para linguagem
12. Criar dialog multi-step de geração
13. Criar componentes de preview
14. Integrar na página de prescrições
15. Testes end-to-end

