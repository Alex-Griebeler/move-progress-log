

# Comparação: Diretrizes ChatGPT vs. Edge Function Atual

## Resultado da Análise

A Edge Function `process-voice-session` já implementa **100% das regras** do seu ChatGPT customizado, e vai além em vários pontos. Segue o comparativo detalhado:

## Cobertura Completa (já implementado)

| Diretriz ChatGPT | Status na Edge Function |
|---|---|
| 1 lb = 0,4536 kg | Constante `POUND_TO_KG_CONVERSION` (linha 23) |
| Halteres/Kettlebell duplo (×2) | 14 cenários documentados no prompt (linhas 346-512) |
| Barra bilateral ("de cada lado" ×2) | Regra completa + recálculo determinístico (linhas 379-402) |
| Landmine (NÃO ×2) | Cenário explícito (linhas 351-354, 504-507) |
| Sandbag (carga direta) | Cenário explícito (linhas 357-358, 509-512) |
| Peso corporal (usar weight_kg) | Lógica completa com/sem peso cadastrado (linhas 322-329) |
| Elástico (nunca converter para kg) | Regra explícita (linhas 331-336) |
| Correções no meio do áudio | Instrução na transcrição E na extração (linhas 314-320) |
| Nunca inventar dados / inferir reps | Proibições explícitas (linhas 280-285) |
| Campos não informados = null (nunca 0) | Regra reforçada + sanitização server-side (linhas 514-525, 748-756) |
| Registrar maior carga por exercício | `is_best_set: true` (linhas 531-533) |
| Arredondar para 1 casa decimal | `roundToDecimal` (linha 62) |
| Alertas de Precisão | Campo `precision_alerts` no JSON de saída (linha 589) |
| Pontos de Atenção Técnicos | Campo `tech_points` no JSON de saída (linhas 559-565) |
| Prioridade: exatidão > fidelidade > clareza | Linha 278 |

## Funcionalidades EXTRAS (que o ChatGPT NÃO tem)

A Edge Function vai **além** das diretrizes do ChatGPT em:

1. **Recálculo determinístico server-side**: Após o Gemini extrair os dados, a função recalcula `load_kg` matematicamente e sobrescreve o valor do LLM se divergir >0.1kg (linhas 758-785). O ChatGPT confia apenas na própria resposta.

2. **Normalização de formato**: `normalizeBreakdown()` corrige automaticamente formatos errados como `"(25 lb) de cada lado + 5 kg"` → `"(25 lb + 5 kg) de cada lado"` (linhas 644-669).

3. **Detecção de desvios da prescrição**: Compara exercícios executados vs. prescritos e gera alertas de omissão, substituição e desvio de volume (linhas 794-883).

4. **Observações clínicas categorizadas**: Extrai observações com categorias (dor/mobilidade/força/técnica/geral) e severidade (alta/média/baixa), que o ChatGPT não estrutura.

5. **Segmentação multi-áudio**: Suporte a múltiplos segmentos de gravação com merge inteligente por aluno.

6. **Validação de propriedade**: JWT + verificação de trainer_id para segurança.

## Itens do ChatGPT que NÃO se aplicam

| Diretriz ChatGPT | Por que não se aplica |
|---|---|
| "Armazenamento interno em memória" | Conceito de conversa do ChatGPT. Nossa API é stateless — o banco de dados faz esse papel. |
| "Controle de envio por data+horário" | Idem — o frontend controla isso via dialogs de setup. |
| "Substituir versões anteriores quando houver correção" | O multi-segment merge já faz isso automaticamente. |
| Coluna "RR" (Recorde de Referência) | Não temos esse conceito no schema atual. Seria um PR tracker — já existe separadamente via `pr-detector`. |

## Conclusão

**Não há gaps a corrigir.** A implementação atual é uma versão mais robusta e segura do que o ChatGPT customizado oferece, com camadas adicionais de validação matemática, normalização e segurança que um chatbot conversacional não consegue garantir.

Os bugs identificados na auditoria anterior (exercícios com `reps=null` descartados no merge, `weight_kg` não enviado no individual, audio segments não salvos no group) continuam sendo as prioridades reais de correção — mas são bugs de **frontend/integração**, não de lógica de extração.

