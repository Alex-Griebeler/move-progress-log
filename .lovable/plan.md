

# Fase B.2: Tratamento de Orfaos + Melhorias na Criacao Manual

## 1. Exercicios Orfaos - Diagnostico

A importacao inseriu 432 novos exercicios e atualizou 53 existentes. Restam **~301 exercicios sem `numeric_level`** (orfaos - estavam no banco antes do JSON oficial):

| Situacao | Quantidade | Acao |
|----------|-----------|------|
| Usados em prescricoes ou sessoes | 59 | Manter (nao podem ser excluidos) |
| Nao usados em lugar nenhum | 242 | Excluir com seguranca |

### Passo 1A: Excluir orfaos nao utilizados
- Rodar uma migracao SQL que deleta exercicios onde `numeric_level IS NULL` e que NAO estejam referenciados em `prescription_exercises` nem em `exercises` (sessoes).
- Isso reduz a biblioteca de ~774 para ~532 exercicios limpos.

### Passo 1B: Manter os 59 orfaos usados
- Estes ficam como estao. Podem ser enriquecidos manualmente depois pelo trainer via o dialog de edicao.

---

## 2. Melhorias no Dialog de Criacao Manual

### 2A: Validacao de duplicatas em tempo real
- Ao digitar o nome, buscar exercicios com nome similar (normalizado, sem acentos).
- Mostrar alerta amarelo: "Exercicio similar encontrado: [nome]" com link para ver o existente.
- Usar debounce de 300ms para nao sobrecarregar.

### 2B: Auto-preenchimento de categoria
- Quando o usuario selecionar um `movement_pattern`, preencher automaticamente o campo `category` baseado no mapeamento padronizado (ex: `empurrar_horizontal` -> `forca`, `core_anti_rotacao` -> `core`).
- O usuario pode alterar manualmente se necessario.

### 2C: Escala numerica de nivel (1-9)
- Substituir o select textual de "Nivel" pelo novo `NUMERIC_LEVEL_SCALE` (1-9) ja criado em `backToBasics.ts`.
- Mostrar label descritivo (ex: "Nivel 3 - Iniciante").
- Salvar em `numeric_level` (inteiro) em vez de `level` (texto).

---

## Detalhes Tecnicos

### Migracao SQL (orfaos)
```sql
DELETE FROM exercises_library
WHERE numeric_level IS NULL
  AND id NOT IN (SELECT exercise_library_id FROM prescription_exercises)
  AND name NOT IN (SELECT DISTINCT exercise_name FROM exercises);
```

### Validacao de duplicatas (AddExerciseDialog.tsx)
- Hook `useDebounce` ja existe no projeto.
- Query de busca: `supabase.from('exercises_library').select('id, name').ilike('name', '%normalized%').limit(5)`
- Exibir resultado como `Alert` amarelo abaixo do campo de nome.

### Auto-fill de categoria (AddExerciseDialog.tsx)
- Criar mapa `PATTERN_TO_CATEGORY` no `backToBasics.ts`:
```text
empurrar_horizontal -> forca
core_anti_extensao  -> core
pliometria_*        -> pliometria
mobilidade_*        -> mobilidade
locomocao           -> locomocao
...
```
- No `onValueChange` do select de `movement_pattern`, chamar `setCategory(PATTERN_TO_CATEGORY[pattern])`.

### Arquivos modificados
1. `supabase/migrations/` - SQL para deletar orfaos nao usados
2. `src/constants/backToBasics.ts` - Adicionar `PATTERN_TO_CATEGORY`
3. `src/components/AddExerciseDialog.tsx` - Validacao de duplicatas + auto-fill + nivel numerico
4. `src/components/EditExerciseLibraryDialog.tsx` - Mesmas melhorias de consistencia
5. `src/hooks/useExercisesLibrary.ts` - Hook para busca de duplicatas

