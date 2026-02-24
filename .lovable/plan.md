
## Simplificacao da Taxonomia: 2 Niveis (Categoria + Padrao de Movimento)

### Problema Atual

A taxonomia tem 3 niveis redundantes:
- **Grupo Funcional** e **Padrao de Movimento** dizem quase a mesma coisa (ex: `empurrar_horizontal` aparece nos dois)
- Padroes de movimento misturam **tipo de base** com o padrao real (ex: `agachamento_bilateral` e `agachamento_unilateral` sao o mesmo padrao "agachamento" com bases diferentes -- a base ja existe no campo `laterality`)
- "Locomocao" vira parte de Potencia/Pliometria

### Nova Estrutura: 2 Niveis

```text
CATEGORIA (Nivel 1 - filtro principal na UI)
  └── PADRAO DE MOVIMENTO (Nivel 2 - filtro granular)
       + laterality (atributo separado: bilateral, unilateral, alternado, base assimetrica)
```

### As 7 Categorias + Seus Padroes de Movimento

| Categoria | Padroes de Movimento |
|---|---|
| **respiracao** | respiracao |
| **lmf** | lmf |
| **mobilidade** | mobilidade_tornozelo, mobilidade_quadril, mobilidade_toracica, mobilidade_integrada |
| **core_ativacao** | anti_extensao, anti_flexao_lateral, anti_rotacao, ativacao_gluteos, ativacao_escapular |
| **potencia_pliometria** | pliometria_bilateral, pliometria_unilateral, pliometria_lateral, pliometria_multidirecional, atletico (ex-locomocao) |
| **forca_hipertrofia** | empurrar_horizontal, empurrar_vertical, puxar_horizontal, puxar_vertical, agachamento, lunge, hip_hinge, ponte, nordica, carregar |
| **condicionamento_metabolico** | (formato de sessao - usa exercicios das categorias 4, 5 e 6) |

Nota sobre pliometria: mantem-se a distincao bilateral/unilateral/lateral porque representa progressoes reais (fases 1-19), nao apenas uma base diferente do mesmo movimento.

### O que muda em cada arquivo

---

#### 1. `src/constants/backToBasics.ts`

**Remover:**
- `FUNCTIONAL_GROUPS` (constante inteira)
- `FunctionalGroup` (tipo)
- `PATTERN_TO_FUNCTIONAL_GROUP` (mapeamento inteiro)
- `GROUP_TO_CATEGORY` (mapeamento inteiro)

**Atualizar:**
- `EXERCISE_CATEGORIES`: as 7 novas categorias
- `MOVEMENT_PATTERNS`: padroes limpos (sem base misturada)
  - `agachamento_bilateral/unilateral/lateral` viram apenas `agachamento`
  - `deadlift_bilateral/unilateral` + `rdl_stiff` viram `hip_hinge`
  - `ponte_hip_thrust` vira `ponte`
  - `base_assimetrica_split_squat` + `lunge` + `lunge_slideboard` viram `lunge`
  - `flexao_joelhos_nordica` vira `nordica`
  - `gluteos_estabilidade` + `ativacao_gluteos` viram `ativacao_gluteos`
  - `escapula` + `ativacao_geral` viram `ativacao_escapular`
  - `pliometria_unilateral_lateral_medial` vira `pliometria_multidirecional`
  - `locomocao` vira `atletico`

**Adicionar:**
- `PATTERN_TO_CATEGORY`: mapeamento direto padrao → categoria (substitui o caminho padrao → grupo → categoria)
- `SESSION_PATTERN_GROUPS`: agrupamentos para a IA montar sessoes (substitui o uso de functional_group no generate-group-session):
  ```text
  lower_knee: [agachamento, lunge, nordica]
  lower_hip: [hip_hinge, ponte]
  upper_push: [empurrar_horizontal, empurrar_vertical]
  upper_pull: [puxar_horizontal, puxar_vertical]
  carry: [carregar]
  core: [anti_extensao, anti_flexao_lateral, anti_rotacao]
  activation: [ativacao_gluteos, ativacao_escapular]
  ```
- `CONDICIONAMENTO_ELIGIBLE_CATEGORIES`: ["core_ativacao", "potencia_pliometria", "forca_hipertrofia"]

**Atualizar `TRAINING_STATIONS`:** usar `SESSION_PATTERN_GROUPS` em vez de functional groups

---

#### 2. Migracao SQL (banco de dados)

Renomear valores nas colunas `category` e `movement_pattern` da tabela `exercises_library`:

```sql
-- Categorias
UPDATE exercises_library SET category = 'forca_hipertrofia' WHERE category = 'forca';
UPDATE exercises_library SET category = 'core_ativacao' WHERE category IN ('core', 'ativacao');
UPDATE exercises_library SET category = 'potencia_pliometria' WHERE category IN ('pliometria', 'locomocao');

-- Padroes de movimento (limpar base)
UPDATE exercises_library SET movement_pattern = 'agachamento'
  WHERE movement_pattern IN ('agachamento_bilateral', 'agachamento_unilateral', 'agachamento_lateral', 'dominancia_joelho');
UPDATE exercises_library SET movement_pattern = 'lunge'
  WHERE movement_pattern IN ('base_assimetrica_split_squat', 'lunge_slideboard');
UPDATE exercises_library SET movement_pattern = 'hip_hinge'
  WHERE movement_pattern IN ('deadlift_bilateral', 'deadlift_unilateral', 'rdl_stiff', 'dominancia_quadril');
UPDATE exercises_library SET movement_pattern = 'ponte'
  WHERE movement_pattern = 'ponte_hip_thrust';
UPDATE exercises_library SET movement_pattern = 'nordica'
  WHERE movement_pattern = 'flexao_joelhos_nordica';
UPDATE exercises_library SET movement_pattern = 'carregar'
  WHERE movement_pattern IN ('carregamento', 'carregamentos');
UPDATE exercises_library SET movement_pattern = 'anti_extensao'
  WHERE movement_pattern = 'core_anti_extensao';
UPDATE exercises_library SET movement_pattern = 'anti_flexao_lateral'
  WHERE movement_pattern = 'core_anti_flexao_lateral';
UPDATE exercises_library SET movement_pattern = 'anti_rotacao'
  WHERE movement_pattern = 'core_anti_rotacao';
UPDATE exercises_library SET movement_pattern = 'ativacao_gluteos'
  WHERE movement_pattern IN ('gluteos_estabilidade', 'ativacao_gluteos');
UPDATE exercises_library SET movement_pattern = 'ativacao_escapular'
  WHERE movement_pattern IN ('escapula', 'ativacao_geral');
UPDATE exercises_library SET movement_pattern = 'pliometria_multidirecional'
  WHERE movement_pattern = 'pliometria_unilateral_lateral_medial';
UPDATE exercises_library SET movement_pattern = 'atletico'
  WHERE movement_pattern = 'locomocao';
UPDATE exercises_library SET movement_pattern = 'pliometria_bilateral'
  WHERE movement_pattern = 'pliometria_bilateral_linear';
UPDATE exercises_library SET movement_pattern = 'pliometria_unilateral'
  WHERE movement_pattern = 'pliometria_unilateral_linear';
UPDATE exercises_library SET movement_pattern = 'pliometria_lateral'
  WHERE movement_pattern = 'pliometria_unilateral_lateral';
```

A coluna `functional_group` permanece no banco (para nao quebrar nada), mas deixa de ser usada no codigo. Pode ser removida numa migracao futura.

---

#### 3. `supabase/functions/import-exercises/index.ts`

- Simplificar `SUBCATEGORY_MAP` para apenas 2 campos: `movement_pattern` e `category` (remover `functional_group`)
- Mapear subcategorias do JSON para os padroes limpos:
  - `agachamento_bilateral` → movement_pattern: `agachamento`
  - `deadlift_bilateral` → movement_pattern: `hip_hinge`
  - etc.
- Continuar populando `functional_group` no DB com o mesmo valor de `movement_pattern` (compatibilidade), mas sem logica especifica

---

#### 4. `src/hooks/useExercisesLibrary.ts`

- Remover re-exports de `FUNCTIONAL_GROUPS`, `PATTERN_TO_FUNCTIONAL_GROUP`, `GROUP_TO_CATEGORY`
- Adicionar re-export de `PATTERN_TO_CATEGORY`, `SESSION_PATTERN_GROUPS`
- Remover `functional_group` do `ExerciseFilters` (o filtro de categoria + padrao de movimento cobre tudo)

---

#### 5. `src/pages/ExercisesLibraryPage.tsx`

- Remover o dropdown "Grupo Funcional" da UI
- Os filtros ficam: Busca + Categoria + Padrao de Movimento + Risco (+ "Mais filtros")

---

#### 6. `src/components/AddExerciseDialog.tsx` e `EditExerciseLibraryDialog.tsx`

- Substituir auto-fill de `PATTERN_TO_FUNCTIONAL_GROUP` + `GROUP_TO_CATEGORY` por `PATTERN_TO_CATEGORY` direto
- Remover imports de `FUNCTIONAL_GROUPS`, `PATTERN_TO_FUNCTIONAL_GROUP`, `GROUP_TO_CATEGORY`

---

#### 7. `supabase/functions/generate-group-session/index.ts`

- Substituir queries por `functional_group` por queries usando `movement_pattern` + `SESSION_PATTERN_GROUPS`
- Ex: em vez de `WHERE functional_group IN ('dominancia_joelho', 'dominancia_quadril')`, usar `WHERE movement_pattern IN ('agachamento', 'lunge', 'nordica', 'hip_hinge', 'ponte')`

---

#### 8. `supabase/functions/suggest-exercise/index.ts`

- Substituir filtro por `functional_group` por filtro por `movement_pattern`
- Atualizar chamada a `search_exercises_by_name` (ou criar nova RPC sem functional_group)

---

#### 9. DB Function `search_exercises_by_name`

- Migracao para substituir parametro `p_functional_group` por `p_movement_pattern`

---

### Sequencia de Execucao

1. Atualizar `backToBasics.ts` (remover grupo funcional, limpar padroes, novos mapeamentos)
2. Criar migracao SQL (renomear categorias + padroes + atualizar RPC)
3. Atualizar `useExercisesLibrary.ts` (filtros e re-exports)
4. Atualizar `ExercisesLibraryPage.tsx` (remover dropdown grupo funcional)
5. Atualizar `AddExerciseDialog.tsx` e `EditExerciseLibraryDialog.tsx` (auto-fill direto)
6. Atualizar `import-exercises` (mapeamento simplificado)
7. Atualizar `generate-group-session` (usar SESSION_PATTERN_GROUPS)
8. Atualizar `suggest-exercise` (filtro por movement_pattern)
9. Re-importar exercicios via `/admin/diagnosticos`
