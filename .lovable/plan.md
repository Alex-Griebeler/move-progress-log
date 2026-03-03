

# Plano: Migrar Banco de Exercícios com Novos Campos de Classificação

## Resumo

Adicionar 9 novas colunas à `exercises_library`, importar os dados da planilha (exceto MetCon), migrar a escala numérica de 1-9 para 1-5, e reclassificar exercícios órfãos por heurística.

## Decisões Consolidadas

- **Escala**: migrar tudo para 1-5 (`boyle_score` substitui `numeric_level`)
- **Órfãos**: manter e reclassificar por heurística
- **MetCon**: não importar (será tratado separadamente)

---

## Fase 1 — Migração do Banco (SQL)

Adicionar colunas à tabela `exercises_library`:

```sql
ALTER TABLE exercises_library
  ADD COLUMN IF NOT EXISTS boyle_score integer,
  ADD COLUMN IF NOT EXISTS axial_load integer,
  ADD COLUMN IF NOT EXISTS lumbar_demand integer,
  ADD COLUMN IF NOT EXISTS technical_complexity integer,
  ADD COLUMN IF NOT EXISTS metabolic_potential integer,
  ADD COLUMN IF NOT EXISTS knee_dominance integer,
  ADD COLUMN IF NOT EXISTS hip_dominance integer,
  ADD COLUMN IF NOT EXISTS primary_muscles text[],
  ADD COLUMN IF NOT EXISTS emphasis text;
```

Migrar `numeric_level` (1-9) → `boyle_score` (1-5) para exercícios existentes:

```sql
UPDATE exercises_library
SET boyle_score = CASE
  WHEN numeric_level <= 2 THEN 1
  WHEN numeric_level <= 4 THEN 2
  WHEN numeric_level <= 6 THEN 3
  WHEN numeric_level <= 8 THEN 4
  WHEN numeric_level = 9 THEN 5
END
WHERE numeric_level IS NOT NULL AND boyle_score IS NULL;
```

Atualizar constantes `NUMERIC_LEVEL_SCALE` para escala 1-5 e ajustar `level` (Iniciante/Intermediário/Avançado) conforme novo mapeamento.

## Fase 2 — Atualizar Edge Function `import-exercises`

Modificar a Edge Function para aceitar o formato da planilha (novo payload com colunas `exercicio_pt`, `aliases_origem`, `Padrao_movimento`, `boyle_score`, `AX`, `LOM`, `TEC`, `MET`, `JOE`, `QUA`, `grupo_muscular`, `Ênfase`).

Lógica de matching:
1. Normalizar `exercicio_pt` e comparar com `name` do DB
2. Se não match direto, tentar `aliases_origem` (split por `;`)
3. Se ainda sem match, usar `pg_trgm` similarity > 0.6
4. Converter `Padrao_movimento` da planilha para o par (category, movement_pattern) correto do DB usando mapeamento:

```text
Squat → forca_hipertrofia / dominancia_joelho
Hinge → forca_hipertrofia / cadeia_posterior
Push  → forca_hipertrofia / empurrar
Pull  → forca_hipertrofia / puxar
Carry → forca_hipertrofia / carregar
Lunge → forca_hipertrofia / lunge
Core  → core_ativacao
Estab_* → core_ativacao (subcategoria correspondente)
LMF   → lmf
Mobilidade → mobilidade
Potencia → potencia_pliometria
```

5. Filtrar exercícios com `Padrao_movimento = "MetCon"` — ignorar
6. Preencher `boyle_score`, `axial_load`, `lumbar_demand`, `technical_complexity`, `metabolic_potential`, `knee_dominance`, `hip_dominance`, `primary_muscles`, `emphasis`

## Fase 3 — Reclassificar Órfãos

Para os ~150 exercícios no DB sem match na planilha, derivar scores por heurística:

| Campo | Regra |
|-------|-------|
| `boyle_score` | Já calculado da migração `numeric_level` → 1-5 |
| `axial_load` | `category=core_ativacao/mobilidade/lmf` → 1; `movement_pattern=carregar` → 4; `deadlift` no nome → 4; default → 2 |
| `lumbar_demand` | Similar ao axial_load com ajustes |
| `technical_complexity` | Baseado no `boyle_score`: 1→1, 2→2, 3→3, 4→4, 5→5 |
| `metabolic_potential` | `category=potencia_pliometria` → 4; `core_ativacao` → 2; default → 3 |
| `knee_dominance` | `movement_pattern=dominancia_joelho/lunge` → 4; `cadeia_posterior` → 1; default → 2 |
| `hip_dominance` | Inverso do knee_dominance |

Isto será executado como um UPDATE na Edge Function após o import.

## Fase 4 — Atualizar Código Frontend

### 4.1. `src/constants/backToBasics.ts`
- Substituir `NUMERIC_LEVEL_SCALE` (1-9) por escala 1-5 (Boyle)
- Adicionar constantes para as novas dimensões (labels dos scores)

### 4.2. `src/hooks/useExercisesLibrary.ts`
- Adicionar novos campos à interface `ExerciseLibrary` e `CreateExerciseInput`
- Adicionar filtros para `boyle_score`, `axial_load`, etc.

### 4.3. `src/pages/ExercisesLibraryPage.tsx`
- Exibir novas colunas nos cards/tabela (AX, LOM, TEC, MET, JOE, QUA)
- Adicionar filtros por score range

### 4.4. Dialogs de edição de exercício
- Adicionar campos para os novos scores (inputs numéricos 0-5)

### 4.5. `src/pages/AdminDiagnosticsPage.tsx`
- Adicionar botão para importar planilha XLSX (além do JSON existente)
- Relatório de matching (matched, inserted, orphans, skipped MetCon)

## Ordem de Execução

1. Migração SQL (adicionar colunas + converter numeric_level → boyle_score)
2. Atualizar Edge Function `import-exercises` com novo formato
3. Atualizar constantes e interfaces TypeScript
4. Atualizar UI (filtros, cards, dialogs)
5. Executar importação da planilha via Admin Diagnostics
6. Verificar dados importados

## O que NÃO muda

- Tabelas `prescription_exercises`, `exercises`, `exercise_adaptations` — sem alteração
- Coluna `numeric_level` mantida por compatibilidade (mas `boyle_score` passa a ser a referência)
- Fluxo de prescrição manual permanece igual
- Motor de prescrição IA será atualizado em etapa futura

