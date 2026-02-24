
## Separar Padroes de Movimento (somente Forca) das Categorias

### Problema atual

O objeto `MOVEMENT_PATTERNS` em `backToBasics.ts` mistura os 6 padroes de movimento reais de Forca/Hipertrofia com valores que sao, na verdade, categorias (respiracao, lmf, mobilidade, core, ativacao, pliometria, atletico). Isso cria confusao na UI e na logica de geracao de sessoes.

### O que muda

`MOVEMENT_PATTERNS` passa a conter **somente** os 6 padroes de forca:

| Padrao | Label |
|---|---|
| empurrar | Empurrar |
| puxar | Puxar |
| dominancia_joelho | Dominancia de Joelho |
| dominancia_quadril | Dominancia de Quadril |
| lunge | Lunge |
| carregar | Carregar |

As demais categorias (Core, Mobilidade, Respiracao, LMF, Potencia/Pliometria) continuam sendo filtradas pelo campo `category` -- nao precisam de "movement_pattern".

### Atributos universais de cada exercicio (independente de categoria)

Todos os exercicios, de qualquer categoria, possuem estes atributos:

1. **Lateralidade** (execucao): bilateral, unilateral, alternado
2. **Base** (posicao dos apoios): bilateral, assimetrica, unilateral -- mapeado na coluna `position`
3. **Plano de Movimento**: sagittal, frontal, transverse -- coluna `movement_plane`
4. **Tipo de Contracao**: coluna `contraction_type`
5. **Nivel (1-9)**: coluna `numeric_level`

O campo `movement_pattern` so e preenchido para exercicios da categoria `forca_hipertrofia`. Para as demais categorias, fica `NULL` ou vazio.

### Detalhes tecnicos

#### 1. `src/constants/backToBasics.ts`

- **`MOVEMENT_PATTERNS`**: remover respiracao, lmf, mobilidade, core, ativacao, pliometria, atletico. Manter somente os 6 padroes de forca.
- **`PATTERN_TO_CATEGORY`**: simplificar para mapear apenas os 6 padroes para `forca_hipertrofia`. Remover entradas de respiracao, lmf, etc.
- **`SESSION_PATTERN_GROUPS`**: manter os grupos de forca (lower_knee, lower_hip, upper_push, upper_pull, carry). Remover core, activation, mobility, plyometrics, lmf, breathing -- a IA usara o campo `category` diretamente para selecionar exercicios dessas categorias.

#### 2. `supabase/functions/import-exercises/index.ts`

- No `SUBCATEGORY_MAP`, as entradas de core, ativacao, mobilidade, pliometria e locomocao continuam mapeando para a `category` correta, mas o campo `movement_pattern` sera setado como `NULL` para essas categorias (ja que padrao de movimento so se aplica a forca).
- Apenas exercicios mapeados para `category: "forca_hipertrofia"` terao `movement_pattern` preenchido.

#### 3. `supabase/functions/generate-group-session/index.ts`

- Para selecionar exercicios de Core, Mobilidade, Pliometria e LMF, a logica passa a filtrar por `category` em vez de `movement_pattern`.
- Para selecionar exercicios de Forca, continua usando `movement_pattern` (empurrar, puxar, etc.).
- A cobertura triplanar no Core e Mobilidade usa o campo `movement_plane` (sagittal/frontal/transverse) como filtro.

#### 4. UI (filtros na biblioteca de exercicios)

- O dropdown de "Padrao de Movimento" so aparece quando a categoria selecionada e Forca/Hipertrofia.
- Para outras categorias, os filtros disponiveis sao os atributos universais: plano de movimento, lateralidade, base, tipo de contracao e nivel.

#### 5. Migracao SQL

- Limpar valores de `movement_pattern` para exercicios que nao sao de forca:

```text
UPDATE exercises_library
SET movement_pattern = NULL
WHERE category != 'forca_hipertrofia';
```

Isso garante que o banco reflete a regra: padrao de movimento so existe para forca.

### Resumo visual

```text
CATEGORIA (todas)          PADRAO DE MOVIMENTO (so forca)
---------------------      ----------------------------
Respiracao                 (sem padrao)
LMF                        (sem padrao)
Mobilidade                 (sem padrao)
Core / Ativacao            (sem padrao)
Potencia / Pliometria      (sem padrao)
Forca / Hipertrofia   -->  Empurrar (H/V)
                           Puxar (H/V)
                           Dom. Joelho
                           Dom. Quadril
                           Lunge
                           Carregar

ATRIBUTOS UNIVERSAIS (todos os exercicios):
  - Lateralidade
  - Base (position)
  - Plano de Movimento (movement_plane)
  - Tipo de Contracao
  - Nivel (1-9)
```
