# AI Providers — Decisões de Consolidação (MEL-IA-009)

## Provider por Categoria

| Categoria | Provider | Modelo | Justificativa |
|-----------|----------|--------|---------------|
| **Extração estruturada (voz)** | Google (via Lovable AI) | gemini-2.5-flash | Custo-benefício ideal para transcrição + extração JSON. Multimodal nativo (áudio). |
| **Sugestão de exercícios** | Google (via Lovable AI) | gemini-2.5-flash | Baixa latência, bom para matching semântico com listas curtas (pré-filtradas por pg_trgm). |
| **Assistente contextual** | Google (via Lovable AI) | gemini-2.5-flash | Streaming SSE, contexto grande (perfil + métricas + sessões). |
| **Geração de sessão (grupo)** | Google (via Lovable AI) | gemini-2.5-flash | Seleção de exercícios com raciocínio sobre volume e periodização. |
| **Alternativas (progressão/regressão)** | Google (via Lovable AI) | gemini-2.5-flash | Raciocínio biomecânico sobre complexidade e taxonomia. |
| **Recomendação de protocolos** | Regras determinísticas | N/A | Baseado em adaptation_rules + Oura metrics. Sem modelo de IA. |
| **Relatórios de aluno** | Google (via Lovable AI) | gemini-2.5-flash | Geração de análise textual (força, consistência, atenção). |
| **Voice Realtime** | OpenAI | gpt-4o-realtime | Único provider com Realtime API (WebSocket + áudio bidirecional). |

## Decisões Arquiteturais

### 1. Provider Único para Texto (Gemini 2.5 Flash)
- **Motivo**: Lovable AI Gateway elimina necessidade de API keys externas
- **Vantagem**: Custo zero de setup, rate limiting gerenciado pelo gateway
- **Trade-off**: Dependência de um único provider para texto

### 2. OpenAI Apenas para Realtime
- **Motivo**: Único provider com API de áudio bidirecional em tempo real
- **Requisito**: `OPENAI_API_KEY` como secret no Supabase
- **Uso**: Exclusivamente na edge function `voice-session`

### 3. Sem Fallback Automático (v1)
- **Decisão**: Na v1, não implementar `callWithFallback()` 
- **Justificativa**: O Lovable AI Gateway já tem alta disponibilidade. Fallback entre providers diferentes (Gemini → OpenAI) pode gerar inconsistências nos prompts
- **Futuro**: Reavaliar quando houver incidentes de disponibilidade

## Edge Functions e Seus Providers

| Edge Function | Provider | Modelo |
|---------------|----------|--------|
| `process-voice-session` | Google (Gemini SDK direto) | gemini-2.0-flash-exp |
| `voice-session` | OpenAI Realtime | gpt-4o-realtime-preview |
| `suggest-exercise` | Lovable AI Gateway | gemini-2.5-flash |
| `suggest-exercise-alternatives` | Lovable AI Gateway | gemini-2.5-flash |
| `chat-helper` | Lovable AI Gateway | gemini-2.5-flash |
| `generate-group-session` | Lovable AI Gateway | gemini-2.5-flash |
| `generate-student-report` | Lovable AI Gateway | gemini-2.5-flash |
| `generate-protocol-recommendations` | Regras (sem IA) | N/A |

## Secrets Necessários

| Secret | Usado por | Gerenciado por |
|--------|-----------|----------------|
| `LOVABLE_API_KEY` | Todas via Lovable AI Gateway | Auto-provisionado |
| `OPENAI_API_KEY` | `voice-session` | Manual (Supabase secrets) |
| `GOOGLE_AI_API_KEY` | `process-voice-session` | Manual (Supabase secrets) |

## Migração Futura

Para migrar `process-voice-session` de Google AI SDK direto para Lovable AI Gateway:
1. Remover `@google/generative-ai` do import
2. Usar `fetch` para o gateway com `audio` como base64 em mensagem multimodal
3. Testar latência e qualidade de transcrição
4. Remover `GOOGLE_AI_API_KEY` dos secrets

> **Nota**: Essa migração não é prioritária pois o SDK direto funciona bem para áudio e a extração estruturada requer `responseMimeType: "application/json"` que pode não estar disponível via gateway.
