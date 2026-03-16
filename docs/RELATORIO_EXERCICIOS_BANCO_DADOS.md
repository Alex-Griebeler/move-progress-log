# Relatório Completo — Banco de Dados de Exercícios

> **Data de geração**: 16/03/2026  
> **Total de exercícios**: 917

---

## 1. DISTRIBUIÇÃO POR CATEGORIA

| Categoria | Total | % |
|-----------|-------|---|
| forca_hipertrofia | 523 | 57.0% |
| core_ativacao | 150 | 16.4% |
| mobilidade | 108 | 11.8% |
| potencia_pliometria | 94 | 10.3% |
| lmf | 32 | 3.5% |
| respiracao | 9 | 1.0% |
| condicionamento_metabolico | 1 | 0.1% |

---

## 2. COBERTURA DE DADOS BIOMECÂNICOS POR CATEGORIA

| Categoria | Total | Boyle | AX | LOM | TEC | MET | JOE | QUA | Plano | Lat | Estab | Risco | Equip |
|-----------|-------|-------|-----|-----|-----|-----|-----|-----|-------|-----|-------|-------|-------|
| forca_hipertrofia | 523 | 522 (99.8%) | 523 | 523 | 523 | 523 | 523 | 523 | 523 | 523 | 523 | 523 | 470 (89.9%) |
| core_ativacao | 150 | 150 (100%) | 150 | 150 | 150 | 150 | 150 | 150 | 150 | 150 | 150 | 150 | 145 (96.7%) |
| mobilidade | 108 | 108 (100%) | 108 | 108 | 108 | 108 | 108 | 108 | 108 | 108 | 108 | 108 | 108 (100%) |
| potencia_pliometria | 94 | 94 (100%) | 93 (98.9%) | 93 | 93 | 93 | 93 | 93 | 94 | 94 | 94 | 94 | 92 (97.9%) |
| lmf | 32 | 32 (100%) | 32 | 32 | 32 | 32 | 32 | 32 | 32 | 32 | 32 | 32 | 32 (100%) |
| respiracao | 9 | 8 (88.9%) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 8 | 2 (22.2%) |
| condicionamento_metabolico | 1 | 1 (100%) | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 1 | 1 (100%) |

**Cobertura geral**: ~99.5% para dimensões biomecânicas principais.

---

## 3. DISTRIBUIÇÃO POR BOYLE SCORE (Dificuldade 1-5)

| Boyle Score | Total | % | Acesso por Nível |
|-------------|-------|---|------------------|
| 1 | 182 | 19.9% | Iniciante, Intermediário, Avançado |
| 2 | 281 | 30.7% | Iniciante, Intermediário, Avançado |
| 3 | 341 | 37.2% | Intermediário, Avançado |
| 4 | 87 | 9.5% | Avançado |
| 5 | 24 | 2.6% | Avançado |
| NULL | 2 | 0.2% | — |

**Observação**: Iniciantes acessam **463 exercícios** (Boyle ≤ 2), Intermediários **804** (Boyle ≤ 3), Avançados **915** (todos).

---

## 4. DISTRIBUIÇÃO POR NÍVEL DE RISCO

| Risco | Total | % |
|-------|-------|---|
| medium | 471 | 51.4% |
| low | 398 | 43.4% |
| high | 47 | 5.1% |
| NULL | 1 | 0.1% |

---

## 5. DISTRIBUIÇÃO POR NÍVEL TEXTUAL

| Nível | Total | % |
|-------|-------|---|
| Intermediário | 440 | 48.0% |
| Iniciante | 316 | 34.5% |
| Avançado | 91 | 9.9% |
| Intermediário/Avançado | 21 | 2.3% |
| Interm./Avançado | 18 | 2.0% |
| Inic./Interm. | 10 | 1.1% |
| Todos os níveis | 8 | 0.9% |
| Iniciante/Interm. | 4 | 0.4% |
| Iniciante/Intermediário | 2 | 0.2% |
| NULL | 7 | 0.8% |

---

## 6. PADRÕES DE MOVIMENTO (Força/Hipertrofia)

| Padrão | Total | % (de 523) |
|--------|-------|------------|
| empurrar | 125 | 23.9% |
| puxar | 116 | 22.2% |
| cadeia_posterior | 106 | 20.3% |
| lunge | 83 | 15.9% |
| dominancia_joelho | 67 | 12.8% |
| carregar | 25 | 4.8% |
| NULL | 1 | 0.2% |

**Ratio Push:Pull** = 125:116 = 1.08:1 (próximo do ideal 1:1 na biblioteca)

---

## 7. SUBCATEGORIAS POR CATEGORIA

### 7.1 Força / Hipertrofia (523)
| Subcategoria | Total |
|-------------|-------|
| horizontal | 129 |
| vertical | 73 |
| (sem subcategoria) | 52 |
| lunge | 38 |
| ênfase_quadril | 30 |
| empurrar | 24 |
| carregamento | 22 |
| dobradura_quadril | 21 |
| puxar | 15 |
| deadlift_unilateral | 15 |
| agachamento | 14 |
| ponte_hip_thrust | 14 |
| deadlift_bilateral | 12 |
| lunge_slideboard | 12 |
| ênfase_joelho | 10 |
| agachamento_lateral | 10 |
| flexao_joelhos_nordica | 9 |
| agachamento_bilateral | 8 |
| agachamento_unilateral | 6 |
| base_assimetrica_split_squat | 5 |
| rdl_stiff | 4 |

### 7.2 Core / Ativação (150)
| Subcategoria | Total |
|-------------|-------|
| anti_extensao | 36 |
| ativacao_gluteos | 34 |
| anti_rotacao | 30 |
| (sem subcategoria) | 24 |
| ativacao_escapular | 13 |
| anti_flexao_lateral | 10 |
| estabilidade_dinamica | 3 |

### 7.3 Mobilidade (108)
| Subcategoria | Total |
|-------------|-------|
| quadril | 40 |
| coluna_toracica | 26 |
| (sem subcategoria) | 8 |
| ombro | 8 |
| tornozelo | 6 |
| isquiotibiais | 6 |
| integrados | 5 |
| protocolos | 4 |
| mobilidade | 3 |
| global | 2 |

### 7.4 Potência / Pliometria (94)
| Subcategoria | Total |
|-------------|-------|
| potencia | 30 |
| (sem subcategoria) | 20 |
| sagital | 15 |
| pliometria_unilateral | 6 |
| pliometria_bilateral | 6 |
| frontal | 5 |
| pliometria_lateral | 4 |
| pliometria_multidirecional | 4 |
| transverso | 3 |
| pliometria | 1 |

### 7.5 LMF (32)
| Subcategoria | Total |
|-------------|-------|
| regioes | 10 |
| ativacao_gluteos | 5 |
| panturrilha | 4 |
| ativacao_escapular | 2 |
| ativacao_ombro | 2 |
| coluna_toracica | 2 |
| pe | 1 |
| peitoral | 1 |
| ativacao_quadril | 1 |
| isquiotibiais | 1 |
| agachamento_unilateral | 1 |
| quadril_tfl | 1 |
| gluteo_piriforme | 1 |

### 7.6 Respiração (9)
| Subcategoria | Total |
|-------------|-------|
| protocolos | 8 |
| (sem subcategoria) | 1 |

---

## 8. LATERALIDADE

| Lateralidade | Total | % |
|-------------|-------|---|
| bilateral | 577 | 62.9% |
| unilateral | 328 | 35.8% |
| alternada | 11 | 1.2% |
| NULL | 1 | 0.1% |

---

## 9. PLANO DE MOVIMENTO

| Plano | Total | % |
|-------|-------|---|
| sagital | 720 | 78.5% |
| frontal | 98 | 10.7% |
| transverso | 93 | 10.1% |
| sagittal (typo) | 5 | 0.5% |
| NULL | 1 | 0.1% |

⚠️ **Atenção**: 5 exercícios com "sagittal" (inglês) ao invés de "sagital" (português padronizado).

---

## 10. TIPO DE CONTRAÇÃO

| Tipo | Total | % |
|------|-------|---|
| Concêntrica-Excêntrica | 256 | 27.9% |
| Isométrica | 191 | 20.8% |
| Mista | 171 | 18.6% |
| Pliométrica / Potência | 84 | 9.2% |
| Dinâmica controlada (ênfase excêntrica) | 64 | 7.0% |
| Concêntrica | 60 | 6.5% |
| Alongamento Ativo | 42 | 4.6% |
| Excêntrica | 22 | 2.4% |
| Dinâmica controlada | 9 | 1.0% |
| Isotônico | 9 | 1.0% |
| Dinâmica explosiva | 6 | 0.7% |
| NULL | 2 | 0.2% |
| Excêntrica controlada | 1 | 0.1% |

---

## 11. POSIÇÃO DE ESTABILIDADE

| Posição | Total | % |
|---------|-------|---|
| em_pe_bilateral | 445 | 48.5% |
| decubito_dorsal | 100 | 10.9% |
| prancha | 65 | 7.1% |
| ponte | 52 | 5.7% |
| ajoelhado | 52 | 5.7% |
| em_pe_split | 36 | 3.9% |
| suspenso | 34 | 3.7% |
| sentado | 32 | 3.5% |
| em_pe_assimetrica | 29 | 3.2% |
| semi_ajoelhado | 28 | 3.1% |
| quadrupede | 21 | 2.3% |
| decubito_ventral | 12 | 1.3% |
| decubito_lateral | 8 | 0.9% |
| em_pe_unilateral | 3 | 0.3% |

---

## 12. MODIFICADOR DE SUPERFÍCIE

| Modificador | Total | % |
|------------|-------|---|
| nenhum | 847 | 92.4% |
| slide | 29 | 3.2% |
| pe_elevado | 15 | 1.6% |
| pe_parede | 15 | 1.6% |
| suspenso_trx | 5 | 0.5% |
| pes_elevados | 4 | 0.4% |
| deficit | 2 | 0.2% |

---

## 13. ÊNFASE (TOP 15)

| Ênfase | Total |
|--------|-------|
| Core (estabilização) | 143 |
| (sem ênfase) | 143 |
| Ombro + cotovelo | 121 |
| Dorsal + bíceps | 105 |
| Potência | 93 |
| Quadril | 92 |
| Joelho + quadril | 81 |
| Joelho | 65 |
| Core + Pegada | 21 |
| Respiração | 8 |
| Quadril + isquiotibiais | 6 |
| Quadril + core | 4 |
| Dorsal + romboides + bíceps | 3 |
| Quadril + lombar | 2 |
| Core (anti-rotação) | 2 |

---

## 14. ALERTAS E INCONSISTÊNCIAS ENCONTRADAS

| # | Alerta | Severidade | Detalhes |
|---|--------|------------|----------|
| 1 | Typo no plano de movimento | Baixa | 5 exercícios com "sagittal" (inglês) ao invés de "sagital" |
| 2 | Exercícios sem ênfase | Média | 143 exercícios sem campo `emphasis` preenchido |
| 3 | Condicionamento metabólico | Info | Apenas 1 exercício — isso é **intencional** (metcon usa exercícios de outras categorias) |
| 4 | Boyle score NULL | Baixa | 2 exercícios sem boyle_score |
| 5 | Equipamento faltando | Média | 53 exercícios de força sem `equipment_required` |
| 6 | Nível textual inconsistente | Baixa | Variações como "Interm./Avançado" vs "Intermediário/Avançado" |
| 7 | Core anti_flexão_lateral baixo | Média | Apenas 10 exercícios — pool limitado para slot B e C |

---

## 15. RESUMO DE CAPACIDADE POR NÍVEL

| Nível do Grupo | Exercícios Disponíveis | % do Total |
|----------------|----------------------|------------|
| Iniciante (Boyle ≤ 2) | 463 | 50.5% |
| Intermediário (Boyle ≤ 3) | 804 | 87.7% |
| Avançado (Boyle ≤ 5) | 915 | 99.8% |

---

*Relatório gerado automaticamente em 16/03/2026 a partir de queries ao banco de dados.*
