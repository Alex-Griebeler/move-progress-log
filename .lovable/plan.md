

# Fase B: Importar e Padronizar Exercicios do JSON

## Contexto

A base atual tem **344 exercicios** no banco, e o JSON categorizado traz **491 exercicios** como fonte oficial da Fabrik. Existem problemas de duplicatas, nomenclatura inconsistente e categorias divergentes entre as duas fontes.

## Problemas Identificados

### 1. Duplicatas no banco atual
Exercicios com nome identico duplicados:
- `Agachamento Frontal` (2x)
- `Agachamento Livre` (2x)
- `Box Jump` (2x)
- `Roda abdominal` (2x)

### 2. Nomenclatura inconsistente
O banco atual mistura convencoes:

| Banco atual | JSON oficial |
|------------|-------------|
| `Flexão de braços ajoelhado` | `Flexão de braços AJ` |
| `Agachamento (peso corporal)` | `Agachamento peso corporal` |
| `Agachamento Goblet` | `Agachamento taça` |
| `Agachamento Frontal` | `Agachamento frontal BB` |
| `Barra fixa (chin-up)` | `Barra supinada` |
| `Barra fixa (pull-up)` | `Barra pronada` |
| `Remada Unilateral com Haltere` | `Remada serrote no BCO 1KB/DB` |
| `Farmer Walk` / `Farmer carry caminhando` / `Farmer carry estatico` | Nomenclatura diferente no JSON |
| Nomes em ingles (`Bicycle Crunch`, `Russian Twist`) | JSON usa pt-BR padronizado |

### 3. Exercicios "orfaos" no banco
~50 exercicios com `level = NULL` e sem metadados - foram inseridos sem padronizacao (provavelmente importacao generica anterior). Exemplos:
- `Agachamento com salto`, `Agachamento Goblet`, `Agachamento lateral`
- `Bear Hug Carry`, `Bottoms-Up Kettlebell Carry`, `Cross Body Carry`
- `Bicycle Crunch`, `Bird Dog`, `Copenhagen Plank`

### 4. Categorias de movement_pattern divergentes
O JSON organiza por subcategoria (ex: `empurrar_horizontal > flexao_de_bracos > supino`) enquanto o banco usa `movement_pattern` direto. O mapeamento e:

| Categoria JSON | movement_pattern no banco |
|----------------|--------------------------|
| `empurrar > empurrar_horizontal` | `empurrar_horizontal` |
| `empurrar > empurrar_vertical` | `empurrar_vertical` |
| `puxar > puxar_horizontal` | `puxar_horizontal` |
| `puxar > puxar_vertical` | `puxar_vertical` |
| `dominancia_de_joelho` | `dominancia_joelho` |
| `dominancia_de_quadril` | `dominancia_quadril` |
| `estabilidade > anti_extensao` | `core_anti_extensao` |
| `estabilidade > anti_flexao_lateral` | `core_anti_flexao_lateral` |
| `estabilidade > anti_rotacao` | `core_anti_rotacao` |
| `carregamentos` | `carregar` |
| `liberacao_miofascial` | `lmf` |
| `pliometria` | `pliometria_*` |
| `exercicios_nao_convencionais` | `locomocao` |
| `mobilidade_e_ativacao` | `mobilidade_*` / `ativacao_*` |

### 5. Lateralidade nao padronizada
O banco usa `bilateral`, `unilateral`, `asymmetric`. O JSON usa `bilateral`, `unilateral`, `alternado`, `assimetrica`. Precisamos mapear `alternado` e `assimetrica` para valores aceitos.

---

## Plano de Execucao

### Passo 1: Limpar duplicatas existentes
Remover as 4 duplicatas exatas ja identificadas, mantendo o registro mais antigo.

### Passo 2: Criar edge function de importacao
Uma edge function `import-exercises` que:

1. Le o JSON categorizado
2. Para cada exercicio do JSON:
   - Busca correspondencia no banco por nome (match exato ou fuzzy normalizado)
   - Se encontrar: **atualiza** com `numeric_level`, `position`, `tags`, `laterality` (do campo `base`), `equipment_required`, `category`, `subcategory`
   - Se nao encontrar: **insere** como novo exercicio
3. Mapeia automaticamente:
   - `base` do JSON para `laterality` (`alternado` -> `alternado`, `assimetrica` -> `assimetrica` -- expandir constantes)
   - subcategoria do JSON para `movement_pattern` e `category`
   - `nivel` (1-9) para `numeric_level`
   - `posicao` para `position`
   - `tags` para `tags[]`
   - `equipamento` para `equipment_required[]`
4. Gera log de: exercicios inseridos, atualizados, e nao mapeados

### Passo 3: Tratar exercicios "orfaos"
Exercicios do banco que nao tem correspondencia no JSON:
- **Carregar**: 18 exercicios em ingles (Bear Hug Carry, Bottoms-Up KB Carry, etc.) que nao existem no JSON. Opcoes:
  - Manter como estao e adicionar `numeric_level` estimado
  - Marcar como `deprecated` para revisao futura
- **Core generico**: 21 exercicios como Bird Dog, Dead Bug, Pallof Press - muitos existem no JSON com nomes similares. Serao mapeados pela edge function.

### Passo 4: Atualizar constantes do frontend
- Expandir `LATERALITY_OPTIONS` para incluir `alternado` e `assimetrica`
- Adicionar constante `NUMERIC_LEVEL_SCALE` (1-9) ao `backToBasics.ts`
- Adicionar constante `POSITION_OPTIONS` com as posicoes do JSON

---

## Detalhes Tecnicos

### Edge function `import-exercises`
- Recebe o JSON como corpo do POST
- Usa `UPSERT` baseado no nome normalizado (lowercase, trim, acentos removidos)
- Retorna relatorio: `{ inserted: number, updated: number, skipped: string[], orphans: string[] }`
- Protegida por role `admin` ou `trainer`

### Mapeamento de lateralidade
```text
JSON "base"       -> DB "laterality"
bilateral          -> bilateral
unilateral         -> unilateral
alternado          -> alternado
assimetrica        -> assimetrica
```

### Mapeamento de movement_pattern
```text
JSON path                              -> DB movement_pattern
empurrar.empurrar_horizontal.*         -> empurrar_horizontal
empurrar.empurrar_vertical.*           -> empurrar_vertical
puxar.puxar_horizontal.*               -> puxar_horizontal
puxar.puxar_vertical.*                 -> puxar_vertical
dominancia_de_joelho.*                 -> dominancia_joelho
dominancia_de_quadril.*                -> dominancia_quadril
carregamentos.*                        -> carregar
estabilidade.anti_extensao             -> core_anti_extensao
estabilidade.anti_flexao_lateral       -> core_anti_flexao_lateral
estabilidade.anti_rotacao              -> core_anti_rotacao
liberacao_miofascial.*                 -> lmf
pliometria.bilateral_linear            -> pliometria_bilateral_linear
pliometria.unilateral_linear           -> pliometria_unilateral_linear
pliometria.unilateral_lateral          -> pliometria_unilateral_lateral
pliometria.unilateral_lateral_medial   -> pliometria_unilateral_lateral_medial
exercicios_nao_convencionais.*         -> locomocao
mobilidade_e_ativacao.mobilidade_*     -> mobilidade_* (por regiao)
mobilidade_e_ativacao.ativacao_*       -> ativacao_geral
```

### Resultado esperado
- ~491 exercicios do JSON importados/atualizados
- ~50 exercicios orfaos do banco marcados para revisao
- 4 duplicatas removidas
- Total estimado: ~500-520 exercicios unicos
- 100% com `numeric_level`, `position` e `tags` preenchidos (para os vindos do JSON)

