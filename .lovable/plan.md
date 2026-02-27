

# Padronizar nomes de respiração e melhorar seleção de exercícios

## Objetivo
Renomear todos os protocolos de respiração para iniciarem com "Respiração" e garantir que o combobox de seleção filtre progressivamente conforme o usuário digita.

## 1. Renomear exercícios no banco de dados

Atualizar 4 registros na tabela `exercises_library` que ainda nao iniciam com "Respiração":

| Nome atual | Novo nome |
|---|---|
| Box Breathing (4-4-4-4) | Respiração Box Breathing (4-4-4-4) |
| Manobra de Valsalva Controlada | Respiração Manobra de Valsalva Controlada |
| Nasal Cadenciada + Visualização | Respiração Nasal Cadenciada + Visualização |
| Suspiro Cíclico (Cyclic Sighing) | Respiração Suspiro Cíclico (Cyclic Sighing) |

Tambem atualizar os mesmos nomes na tabela `breathing_protocols` para manter consistencia.

## 2. Melhorar o ExerciseCombobox

O componente `ExerciseCombobox` ja usa o `cmdk` que faz filtragem automatica conforme o usuario digita. Porem, atualmente ele nao mostra nenhum exercicio ate o usuario abrir o popover. Melhorias:

- Aumentar a altura maxima da lista para mostrar mais resultados visiveis (de 300px para 400px)
- Garantir que o campo de busca receba foco automatico ao abrir
- Mostrar contagem de resultados no rodape da lista para feedback visual

## Detalhes tecnicos

- **Dados**: UPDATE via insert tool para `exercises_library` e `breathing_protocols`
- **UI**: Ajuste no `ExerciseCombobox.tsx` para melhorar a experiencia de filtragem progressiva
- Nenhuma mudanca de schema necessaria

