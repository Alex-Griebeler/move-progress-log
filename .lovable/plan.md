

## Upload de Word para Prescrição

Sim, é totalmente possível. O documento que você enviou tem uma estrutura bem definida (tabelas com exercício, sets, reps, PSE, método), ideal para extração automática.

### Como vai funcionar

1. O treinador faz upload de um `.docx` na tela de Prescrições
2. Uma edge function recebe o arquivo, extrai o texto das tabelas usando uma lib de parsing
3. A IA (Gemini via Lovable AI Gateway) interpreta o conteúdo e faz o matching com exercícios da `exercises_library` (usando `pg_trgm` similarity)
4. O sistema retorna a prescrição estruturada para revisão antes de salvar

### Componentes a criar/modificar

**1. Edge Function `parse-word-prescription/index.ts`**
- Recebe o arquivo `.docx` como base64
- Usa a lib `mammoth` (ou parsing manual de XML do docx) para extrair texto/tabelas
- Envia o texto extraído para o Lovable AI Gateway com tool calling para retornar JSON estruturado (nome do treino, objetivo, lista de exercícios com sets/reps/pse/método)
- Faz matching dos nomes de exercícios com `exercises_library` via `search_exercises_by_name` (já existe no banco)
- Retorna a prescrição parseada com exercícios matched e confiança do match

**2. Componente `ImportPrescriptionFromWordDialog.tsx`**
- Botão de upload com drag-and-drop para `.docx`
- Tela de progresso durante parsing
- Preview da prescrição extraída com:
  - Nome e objetivo detectados
  - Lista de exercícios com match da biblioteca (verde = match alto, amarelo = match baixo, vermelho = não encontrado)
  - Campos editáveis para corrigir matches incorretos
- Botão "Confirmar e Criar" que usa o `useCreatePrescription` existente

**3. Integração na `PrescriptionsPage.tsx`**
- Novo botão "Importar do Word" ao lado do botão "Nova Prescrição"

### Fluxo de dados

```text
.docx upload → base64 → Edge Function
  → Parse tabelas do Word
  → AI extrai JSON estruturado (tool calling)
  → Match exercícios via pg_trgm
  → Retorna { name, objective, exercises[] }
    → Preview no frontend
      → Confirma → useCreatePrescription()
```

### Detalhes técnicos

- **Parsing do Word**: No Deno (edge function), o `.docx` é um ZIP com XMLs internos. Podemos parsear o XML diretamente ou usar uma abordagem mais simples: extrair todo o texto e enviar para a IA estruturar
- **AI prompt**: Instrução para extrair exercícios no formato `{ name, sets, reps, interval_seconds, pse, training_method, observations }` usando tool calling do gateway
- **Matching**: A função `search_exercises_by_name` já existe no banco com `pg_trgm` — reutilizamos para cada exercício extraído
- **Abreviações**: O documento inclui tabela de abreviações (DB, MB, KB, cl, RR, etc.) — a IA recebe essas abreviações como contexto para interpretar corretamente

