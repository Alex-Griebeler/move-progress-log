

# Correções da Auditoria - Consistência e Robustez

## Resumo

A auditoria externa identificou 5 categorias de problemas. Após verificação no código, **4 são aplicáveis e requerem correção**. Um item (scripts de teste em produção) já está isolado adequadamente.

---

## 1. `plyometrics` com tipo misto em PERIODIZATION_CYCLES

**Problema**: A propriedade `plyometrics` alterna entre `false` (boolean), `"low"` (string) e `true` (boolean) nas semanas S1-S4.

**Correção**: Substituir por um campo tipado com valores padronizados:

```text
plyometrics: "none" | "low" | "full"

S1: "none"
S2: "low"
S3: "full"
S4: "full"
```

Atualizar a funcao `canUsePlyometrics` para usar o novo tipo.

**Arquivos**: `src/constants/backToBasics.ts`

---

## 2. Chave `"base assimetrica"` com espaco e acento em LATERALITY_OPTIONS

**Problema**: A chave `"base assimetrica"` tem espaco, divergindo do padrao snake_case usado em todo o sistema.

**Correcao**:
- Renomear chave para `base_assimetrica`
- Manter label "Base Assimetrica"
- Atualizar `populateExercises.ts` (`mapLaterality` retorna `base_assimetrica`)
- Migrar dados no banco: `UPDATE exercises_library SET laterality = 'base_assimetrica' WHERE laterality = 'base assimetrica'`

**Arquivos**: `src/constants/backToBasics.ts`, `src/utils/populateExercises.ts`

---

## 3. `numericLevel` nao enviado ao banco nos dialogos Add/Edit

**Problema**: O estado `numericLevel` existe em `AddExerciseDialog` e `EditExerciseLibraryDialog`, mas nao e incluido no payload de criacao/edicao. O campo e renderizado na UI mas o valor e descartado.

**Correcao**: Incluir o campo no submit. O banco ja tem um campo `level` (texto) -- usar `numericLevel` para popular esse campo com o valor selecionado (ex: "1", "5", "9").

**Arquivos**: `src/components/AddExerciseDialog.tsx`, `src/components/EditExerciseLibraryDialog.tsx`

---

## 4. `window.location` sem guard em `structuredData.ts`

**Problema**: Todas as funcoes usam `window.location.origin` e `window.location.href` diretamente. Se importadas em contexto SSR, causa `ReferenceError`.

**Correcao**: Criar helper interno:

```typescript
const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : '';
const getHref = () => typeof window !== 'undefined' ? window.location.href : '';
```

Substituir todas as 7 ocorrencias de `window.location`.

**Arquivo**: `src/utils/structuredData.ts`

---

## 5. Conversao de libras hardcoded em AddWorkoutDialog

**Problema**: `AddWorkoutDialog.tsx` usa `0.4536` diretamente em vez da constante `POUND_TO_KG_CONVERSION` de `units.ts`.

**Correcao**: Importar e usar `POUND_TO_KG_CONVERSION` ou `poundsToKg` de `src/constants/units.ts`.

**Arquivo**: `src/components/AddWorkoutDialog.tsx`

---

## 6. `mapLaterality` agrupa incorretamente valores distintos

**Problema**: Tanto "bilateral assimetrica" quanto "unilateral assimetrica" resultam em `"base assimetrica"`, perdendo a informacao de lateralidade.

**Correcao**: Separar em dois valores distintos com base na combinacao:
- `bilateral + assimetrica` -> `base_assimetrica`
- `unilateral + assimetrica` -> `unilateral` (manter como unilateral, ja que a assimetria e da base e nao da lateralidade)

Ou, alternativamente, criar campo `position` separado no schema para base (bilateral/assimetrica/unilateral), mantendo `laterality` puro.

**Arquivo**: `src/utils/populateExercises.ts`

---

## Itens NAO aplicaveis

| Item | Razao |
|------|-------|
| Scripts de teste em producao | Ja isolados em pagina admin com role check |
| `mapLevel` falsos positivos | A ordem das verificacoes (mais especifico primeiro) ja previne o problema citado |

---

## Sequencia de Implementacao

1. Migracao SQL: renomear `laterality = 'base assimetrica'` -> `'base_assimetrica'`
2. `backToBasics.ts`: corrigir `LATERALITY_OPTIONS` e `plyometrics` typing
3. `structuredData.ts`: adicionar guards de `window`
4. `AddExerciseDialog.tsx` e `EditExerciseLibraryDialog.tsx`: conectar `numericLevel`
5. `AddWorkoutDialog.tsx`: usar constante de conversao
6. `populateExercises.ts`: corrigir `mapLaterality`

