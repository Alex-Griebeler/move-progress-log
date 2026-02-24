

## Adicao: Popular movement_plane para TODOS os exercicios (incluindo forca)

### Situacao atual

- A coluna `movement_plane` ja existe na tabela `exercises_library`
- A UI ja permite filtrar e editar por plano de movimento para qualquer exercicio
- O problema: a Edge Function `import-exercises` NAO extrai o plano de movimento do JSON, entao a maioria dos exercicios tem `movement_plane = null`

### O que o JSON fornece

O plano de movimento aparece de duas formas no JSON:

1. **Via tags**: exercicios com `"plano_frontal"` nas tags (ex: Side Lunge, Windmill, Skater Jump)
2. **Via subcategoria estrutural**: categorias como Locomocao tem subdivisoes `frontal`, `sagital`, `transverso`
3. **Implicito pela subcategoria**: `empurrar_horizontal` e `puxar_horizontal` sao predominantemente sagital; `empurrar_vertical` e `puxar_vertical` tambem sao sagital (plano dominante)

### Logica de preenchimento na importacao

```text
1. Se tags contem "plano_frontal"     → movement_plane = "frontal"
2. Se tags contem "plano_transverso"  → movement_plane = "transverse"
3. Se tags contem "plano_sagital"     → movement_plane = "sagittal"
4. Se subcategoria JSON = "frontal"   → movement_plane = "frontal"
5. Se subcategoria JSON = "transverso"→ movement_plane = "transverse"
6. Se subcategoria JSON = "sagital"   → movement_plane = "sagittal"
7. Default (sem info explicita)       → movement_plane = "sagittal"
   (a maioria dos exercicios de forca tradicionais opera no plano sagital)
```

O default `sagittal` e seguro porque exercicios como agachamento, supino, remada, deadlift, lunge (frente/tras) sao predominantemente sagitais. Os exercicios que NAO sao sagitais (side lunge, windmill, lateral raise) tem tags explicitas no JSON.

### Alteracoes tecnicas

#### 1. `supabase/functions/import-exercises/index.ts`

Adicionar funcao para extrair plano de movimento das tags e subcategoria:

```text
function extractMovementPlane(tags: string[], subcategoryKey: string): string {
  // Checar tags primeiro
  if (tags.includes("plano_frontal")) return "frontal";
  if (tags.includes("plano_transverso")) return "transverse";
  if (tags.includes("plano_sagital")) return "sagittal";
  
  // Checar subcategoria estrutural (para categorias como locomocao)
  if (subcategoryKey === "frontal") return "frontal";
  if (subcategoryKey === "transverso") return "transverse";
  if (subcategoryKey === "sagital") return "sagittal";
  
  // Default
  return "sagittal";
}
```

No upsert do exercicio, incluir: `movement_plane: extractMovementPlane(tags, subcategoryKey)`

#### 2. `src/constants/backToBasics.ts`

Nenhuma mudanca adicional necessaria -- `MOVEMENT_PLANES` ja esta definido com sagittal, frontal, transverse.

#### 3. `subcategory` vs `movement_plane`

Com esta mudanca, a logica de `subcategory` do plano anterior se ajusta:

| Categoria | subcategory | movement_plane |
|---|---|---|
| forca (empurrar/puxar) | horizontal / vertical | sagittal / frontal / transverse |
| mobilidade | -- | sagittal / frontal / transverse |
| core_ativacao | -- | sagittal / frontal / transverse |
| potencia_pliometria | -- | sagittal / frontal / transverse |

Ou seja: `subcategory` fica reservado para a subdivisao do padrao de movimento (horizontal/vertical para empurrar/puxar), e `movement_plane` e o atributo universal de plano de movimento para TODOS os exercicios.

### Sequencia

Esta alteracao se encaixa no passo 6 do plano anterior (atualizar `import-exercises`). Nao adiciona passos novos -- apenas enriquece a logica de importacao que ja sera reescrita.

Apos a re-importacao via `/admin/diagnosticos`, todos os exercicios terao `movement_plane` populado.

