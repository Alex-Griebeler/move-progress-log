# 📚 Hub de Documentação - Fabrik Performance

Central de documentação técnica do projeto Fabrik Performance. Todos os guias, checklists e referências organizados por objetivo.

---

## 🎯 Começar Aqui

Se você é novo no projeto ou está procurando algo específico:

### Por Objetivo

| Você quer... | Consulte |
|--------------|----------|
| **Entender nomenclaturas e labels** | [Nomenclatura Padronizada](#nomenclatura) |
| **Escrever textos para UI** | [Microcopy e Linguagem](#microcopy) |
| **Registrar sessões de treino** | [Fluxos de Gravação](#fluxos-de-sessão) |
| **Revisar segurança** | [Segurança e Autenticação](#segurança) |
| **Validar implementações** | [Auditorias e Checklists](#auditorias) |
| **Melhorar SEO** | [SEO e Metadados](#seo) |

---

## 📋 Índice Completo

### Nomenclatura

#### [NOMENCLATURA_PADRONIZADA.md](./NOMENCLATURA_PADRONIZADA.md)
Sistema centralizado de nomenclaturas em `src/constants/navigation.ts`.

**Use quando:**
- Criar novos componentes de navegação
- Adicionar labels em botões e títulos
- Garantir consistência de nomenclatura

**Regras principais:**
- Sentence case (primeira maiúscula)
- 2-3 palavras máximo
- Sem gerúndios ou jargões

---

### Microcopy

#### [MICROCOPY_GUIDE.md](./MICROCOPY_GUIDE.md)
Guia de voz, tom e regras de escrita para toda a interface.

**Use quando:**
- Definir tom de mensagens (sucesso, erro, vazio)
- Escrever CTAs e labels de botão
- Criar estados vazios ou de erro
- Entender a personalidade da marca

**Cobre:**
- Voz e tom da Fabrik
- Regras de capitalização e pontuação
- Padrões por componente (botões, toasts, formulários)
- Palavras bloqueadas vs aprovadas

#### [MICROCOPY_IMPLEMENTATION.md](./MICROCOPY_IMPLEMENTATION.md)
Guia técnico de implementação do sistema de microcopy.

**Use quando:**
- Implementar novos componentes
- Integrar sistema i18n
- Usar utilitários `notify`, `EmptyState`, `ErrorState`
- Criar mutations e queries com feedback adequado

**Cobre:**
- Sistema i18n (`src/i18n/pt-BR.json`)
- API de toasts (`src/lib/notify.ts`)
- Componentes reutilizáveis
- Padrões React Query
- Exemplos completos de CRUD

#### [MICROCOPY_CHECKLIST.md](./MICROCOPY_CHECKLIST.md)
Checklist prático para validar implementações.

**Use quando:**
- Revisar PRs
- Validar features novas
- Garantir conformidade antes de deploy

**Cobre:**
- ✅ Botões e CTAs
- ✅ Toasts (feedback)
- ✅ Estados vazios
- ✅ Estados de erro
- ✅ Formulários e validações
- ✅ Diálogos de confirmação
- ✅ Loading states
- ✅ Acessibilidade

---

### Fluxos de Sessão

#### [SESSION_RECORDING_TYPES.md](./SESSION_RECORDING_TYPES.md)
Guia completo dos 3 métodos de gravação de sessões.

**Use quando:**
- Decidir qual método de gravação usar
- Entender diferenças entre Individual, Grupo e Manual
- Troubleshooting de gravações
- Planejar novos recursos de sessão

**Cobre:**
- Matriz comparativa dos 3 métodos
- Fluxos detalhados de cada tipo
- Diferenças técnicas e de dados
- Guia de decisão rápido
- Erros comuns e soluções
- Best practices

#### [VOICE_RECORDING_FLOW.md](./VOICE_RECORDING_FLOW.md)
Detalhes técnicos do fluxo de gravação por voz.

**Use quando:**
- Debug de problemas de transcrição
- Entender estrutura de dados extraídos
- Trabalhar com Edge Function `process-voice-session`
- Validar fluxo de IA/LLM

**Cobre:**
- Componentes e estados (Individual e Grupo)
- Diagramas de fluxo técnico
- Edge Function: responsabilidades e limites
- Error handling e validações
- Transações de banco de dados

---

### Segurança

#### [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
Checklist de segurança e práticas recomendadas.

**Use quando:**
- Implementar autenticação
- Criar RLS policies
- Validar entrada de usuários
- Revisar segurança antes de deploy

#### [SECURITY_ENHANCEMENTS.md](./SECURITY_ENHANCEMENTS.md)
Melhorias de segurança implementadas e planejadas.

#### [AUTHENTICATION.md](./AUTHENTICATION.md)
Fluxo de autenticação e integração Supabase.

**Use quando:**
- Implementar login/signup
- Configurar permissões de usuário
- Debug de problemas de auth

#### [AUTH_SUMMARY.md](./AUTH_SUMMARY.md)
Resumo executivo do sistema de autenticação.

#### [RATE_LIMITING.md](./RATE_LIMITING.md)
Estratégias de rate limiting implementadas.

---

### SEO

#### [CANONICAL_URLS_ROBOTS.md](./CANONICAL_URLS_ROBOTS.md)
Implementação de URLs canônicas e robots.txt.

#### [OPEN_GRAPH_SEO.md](./OPEN_GRAPH_SEO.md)
Open Graph tags para compartilhamento em redes sociais.

#### [SEO_META_TITLES.md](./SEO_META_TITLES.md)
Estrutura de meta titles e descriptions.

#### [SITEMAP_ROBOTS_SEO.md](./SITEMAP_ROBOTS_SEO.md)
Configuração de sitemap e otimização para crawlers.

#### [STRUCTURED_DATA_SEO.md](./STRUCTURED_DATA_SEO.md)
Schema.org e dados estruturados JSON-LD.

---

### Auditorias

#### [AUDIT_NOMENCLATURA_E_DUPLICACOES.md](./AUDIT_NOMENCLATURA_E_DUPLICACOES.md)
**MAIS RECENTE** - Auditoria spot de nomenclaturas e mapeamento de duplicações.

**Use quando:**
- Validar correções de nomenclatura
- Entender estado atual de conformidade
- Priorizar refatorações

**Cobre:**
- Auditoria de 10 telas críticas
- ~60 não-conformidades identificadas
- Matriz de conformidade por tela
- Mapeamento de 6 duplicações documentais
- Plano de consolidação faseado

#### [NOMENCLATURE_VALIDATION_CHECKLIST.md](./NOMENCLATURE_VALIDATION_CHECKLIST.md)
Checklist para validar nomenclaturas no código.

---

### Outros Recursos

#### [OURA_SYNC_AUTOMATION.md](./OURA_SYNC_AUTOMATION.md)
Sincronização automatizada com Oura Ring API.

#### [REPORTS_PRD.md](./REPORTS_PRD.md)
PRD do módulo de relatórios para alunos.

#### [STUDENTS_MODULE_MIGRATION.md](./STUDENTS_MODULE_MIGRATION.md)
Migração do módulo de alunos.

#### [TESTING_GUIDE.md](./TESTING_GUIDE.md)
Guia de testes e validações.

---

## 🔄 Hierarquia e Relacionamentos

### Fluxo de Trabalho Recomendado

```
1. NOMENCLATURA
   ↓
2. MICROCOPY (GUIDE → IMPLEMENTATION → CHECKLIST)
   ↓
3. IMPLEMENTAÇÃO
   ↓
4. VALIDAÇÃO (CHECKLISTS)
   ↓
5. AUDITORIA
```

### Dependências Entre Documentos

```
NOMENCLATURA_PADRONIZADA.md
  ↓ depende de
MICROCOPY_GUIDE.md
  ↓ implementado via
MICROCOPY_IMPLEMENTATION.md
  ↓ validado por
MICROCOPY_CHECKLIST.md
  ↓ auditado em
AUDIT_NOMENCLATURA_E_DUPLICACOES.md
```

---

## 📝 Convenções de Nomenclatura de Docs

### Prefixos
- **AUDIT_** - Relatórios de auditoria
- **SECURITY_** - Documentos de segurança
- **SEO_** - Otimização para buscadores
- Sem prefixo - Guias gerais e referências

### Tipos
- **_GUIDE** - Guias conceituais e de estilo
- **_IMPLEMENTATION** - Guias técnicos de implementação
- **_CHECKLIST** - Listas de validação
- **_PRD** - Product Requirements Documents
- **_SUMMARY** - Resumos executivos
- **_FLOW** - Diagramas de fluxo técnico

---

## 🆕 Documentos Criados Recentemente

- ✅ **AUDIT_NOMENCLATURA_E_DUPLICACOES.md** (Hoje) - Auditoria spot e mapeamento de duplicações
- ✅ **docs/README.md** (Hoje) - Este hub central

---

## 🔧 Como Manter Esta Documentação

### Ao Criar Novo Documento
1. Adicione entrada neste README na seção apropriada
2. Use convenção de nomenclatura com prefixo/tipo
3. Inclua seção "Use quando:" no topo do documento
4. Adicione cross-references para docs relacionados

### Ao Atualizar Documento Existente
1. Mantenha seção "Use quando:" atualizada
2. Verifique se cross-references ainda são válidos
3. Atualize data de modificação no topo

### Ao Deprecar Documento
1. Mova para `docs/archive/`
2. Adicione nota de depreciação no topo
3. Remova do README ou marque como depreciado

---

## 📞 Contato e Suporte

Para dúvidas sobre:
- **Nomenclatura/Microcopy**: Consultar MICROCOPY_GUIDE.md primeiro
- **Implementação técnica**: Consultar MICROCOPY_IMPLEMENTATION.md
- **Fluxos de sessão**: Consultar SESSION_RECORDING_TYPES.md
- **Auditorias**: Consultar AUDIT_NOMENCLATURA_E_DUPLICACOES.md

---

**Última atualização**: 2025-11-14  
**Versão**: 1.0.0
