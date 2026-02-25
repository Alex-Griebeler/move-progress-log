

# Correcao: Exercicios sem `should_track` aparecendo no registro por voz

## Problema identificado

Quando voce seleciona uma prescricao e grava por voz, exercicios que foram marcados para **nao serem registrados** (`should_track = false`) aparecem na sessao. Isso acontece por dois motivos:

1. **A funcao de processamento de voz (backend)** busca TODOS os exercicios da prescricao e envia para a IA como contexto, sem filtrar pelo campo `should_track`. A IA recebe exercicios como aquecimento ou acessorios e pode inclui-los nos dados extraidos.

2. **Logica de "exercicios nao mencionados"**: Apos salvar a sessao em grupo, o sistema insere automaticamente exercicios prescritos que nao foram mencionados no audio (com a observacao "preencher manualmente"). Embora esse trecho ja filtre por `should_track`, ele contradiz a regra de que somente exercicios mencionados no audio devem ser salvos.

## Alteracoes planejadas

### 1. Backend: `supabase/functions/process-voice-session/index.ts`

- Adicionar `should_track` na query de exercicios da prescricao (linha ~249)
- Filtrar exercicios com `should_track = false` antes de montar o prompt da IA
- Assim a IA so recebera como contexto os exercicios que devem ser registrados

### 2. Frontend: `src/components/RecordGroupSessionDialog.tsx`

- Remover o bloco de codigo (linhas ~677-705) que insere automaticamente exercicios prescritos nao mencionados no audio
- Esse comportamento ja foi documentado como indesejado (ver memoria do projeto sobre "critical-issue-exercise-inclusion")
- Os exercicios nao mencionados ja aparecem como **warnings** na tela de validacao, permitindo ao treinador decidir o que fazer

### Resumo das mudancas

```text
Arquivo                                          Tipo de mudanca
──────────────────────────────────────────────────────────────────
supabase/functions/process-voice-session/index.ts  Filtrar should_track na query + prompt
src/components/RecordGroupSessionDialog.tsx        Remover auto-insercao de exercicios nao mencionados
```

Nenhuma mudanca de banco de dados. O registro manual ja esta correto.

