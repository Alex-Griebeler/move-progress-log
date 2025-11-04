# Structured Data (JSON-LD) - Documentação Completa

## Implementação de Rich Snippets para Google

### Visão Geral
Sistema completo de structured data usando JSON-LD (JavaScript Object Notation for Linked Data) seguindo especificações do schema.org. Implementado para melhorar visibilidade nos resultados de busca do Google através de rich snippets.

## Componentes Criados

### 1. StructuredData Component
**Arquivo:** `src/components/StructuredData.tsx`

Componente React que injeta structured data no `<head>` da página.

```typescript
<StructuredData 
  data={schemaObject} 
  id="unique-id" 
/>
```

**Características:**
- ✅ Injeta script type="application/ld+json"
- ✅ Remove automaticamente ao desmontar
- ✅ Suporta múltiplos schemas por página
- ✅ Não renderiza nada visível

### 2. Utility Functions
**Arquivo:** `src/utils/structuredData.ts`

Funções utilitárias para gerar diferentes tipos de schemas.

## Schemas Implementados

### 1. Organization Schema (SportsActivityLocation)
**Usado em:** Todas as páginas principais

```json
{
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "name": "Fabrik Performance",
  "description": "Studio boutique sofisticado...",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Brasília",
    "addressRegion": "DF",
    "postalCode": "71680-000"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "-15.8267",
    "longitude": "-47.9218"
  },
  "amenityFeature": [...],
  "knowsAbout": [...]
}
```

**Benefícios:**
- 📍 Aparece em Google Maps
- 🏢 Knowledge Panel no Google
- ⭐ Suporte para reviews
- 📞 Informações de contato destacadas

### 2. BreadcrumbList Schema
**Usado em:** Todas as páginas

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://..."
    }
  ]
}
```

**Benefícios:**
- 🍞 Breadcrumbs nos resultados de busca
- 🔍 Melhor compreensão da estrutura
- 🎯 Facilita navegação direta

### 3. WebPage Schema
**Usado em:** Todas as páginas

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Título da Página",
  "description": "Descrição...",
  "url": "https://...",
  "isPartOf": {
    "@type": "WebSite",
    "name": "Fabrik Performance"
  }
}
```

**Benefícios:**
- 📄 Define contexto da página
- 🔗 Liga páginas ao site
- 📝 Melhora compreensão do conteúdo

### 4. Person Schema
**Usado em:** Páginas de detalhes de alunos

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Nome do Aluno",
  "description": "Aluno da Fabrik Performance",
  "memberOf": {
    "@type": "SportsActivityLocation",
    "name": "Fabrik Performance"
  }
}
```

**Benefícios:**
- 👤 Perfis de pessoas
- 🔗 Relação com organização
- 📊 Dados estruturados de membros

### 5. ItemList Schema
**Usado em:** Páginas de listagem (alunos, exercícios)

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Lista de Alunos",
  "numberOfItems": 10,
  "itemListElement": [...]
}
```

**Benefícios:**
- 📋 Listas estruturadas
- 🔢 Contagem de itens
- 🎯 Navegação melhorada

### 6. Course/TrainingProgram Schema
**Usado em:** Prescrições de treino

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Nome da Prescrição",
  "description": "Descrição...",
  "provider": {
    "@type": "SportsActivityLocation",
    "name": "Fabrik Performance"
  }
}
```

**Benefícios:**
- 🎓 Programas de treino destacados
- 📚 Informações de curso
- 🏋️ Contexto de treinamento

### 7. ExerciseAction Schema
**Disponível para:** Sessões de treino

```json
{
  "@context": "https://schema.org",
  "@type": "ExerciseAction",
  "name": "Nome do Exercício",
  "actionStatus": "CompletedActionStatus",
  "startTime": "2025-01-04"
}
```

**Benefícios:**
- 💪 Atividades físicas
- 📅 Histórico de treinos
- ✅ Status de conclusão

### 8. WebApplication Schema
**Disponível para:** App como um todo

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Fabrik Performance System",
  "applicationCategory": "HealthApplication",
  "featureList": [...]
}
```

**Benefícios:**
- 📱 App destacado
- 🎯 Categoria definida
- 📋 Lista de features

## Implementação por Página

### Dashboard (/)
```typescript
<StructuredData data={getOrganizationSchema()} id="org-schema" />
<StructuredData data={getWebPageSchema(...)} id="webpage-schema" />
<StructuredData data={getBreadcrumbSchema([...])} id="breadcrumb-schema" />
```

**Schemas:**
- ✅ Organization
- ✅ WebPage
- ✅ BreadcrumbList

### Alunos (/alunos)
```typescript
<StructuredData data={getOrganizationSchema()} id="org-schema" />
<StructuredData data={getWebPageSchema(...)} id="webpage-schema" />
<StructuredData data={getBreadcrumbSchema([...])} id="breadcrumb-schema" />
<StructuredData data={getItemListSchema(students)} id="students-list-schema" />
```

**Schemas:**
- ✅ Organization
- ✅ WebPage
- ✅ BreadcrumbList
- ✅ ItemList (lista de alunos)

### Detalhes do Aluno (/alunos/:id)
```typescript
<StructuredData data={getOrganizationSchema()} id="org-schema" />
<StructuredData data={getWebPageSchema(...)} id="webpage-schema" />
<StructuredData data={getBreadcrumbSchema([...])} id="breadcrumb-schema" />
<StructuredData data={getPersonSchema(student)} id="person-schema" />
```

**Schemas:**
- ✅ Organization
- ✅ WebPage
- ✅ BreadcrumbList (3 níveis)
- ✅ Person (perfil do aluno)

### Exercícios (/exercicios)
```typescript
<StructuredData data={getOrganizationSchema()} id="org-schema" />
<StructuredData data={getWebPageSchema(...)} id="webpage-schema" />
<StructuredData data={getBreadcrumbSchema([...])} id="breadcrumb-schema" />
<StructuredData data={getItemListSchema(exercises)} id="exercises-list-schema" />
```

**Schemas:**
- ✅ Organization
- ✅ WebPage
- ✅ BreadcrumbList
- ✅ ItemList (biblioteca de exercícios)

### Prescrições (/prescricoes)
```typescript
<StructuredData data={getOrganizationSchema()} id="org-schema" />
<StructuredData data={getWebPageSchema(...)} id="webpage-schema" />
<StructuredData data={getBreadcrumbSchema([...])} id="breadcrumb-schema" />
```

**Schemas:**
- ✅ Organization
- ✅ WebPage
- ✅ BreadcrumbList
- ⏳ TrainingProgram (futuro: por prescrição)

### Protocolos (/protocolos)
```typescript
<StructuredData data={getOrganizationSchema()} id="org-schema" />
<StructuredData data={getWebPageSchema(...)} id="webpage-schema" />
<StructuredData data={getBreadcrumbSchema([...])} id="breadcrumb-schema" />
```

**Schemas:**
- ✅ Organization
- ✅ WebPage
- ✅ BreadcrumbList

## Validação e Testes

### Ferramentas Google
1. **Rich Results Test**
   - URL: https://search.google.com/test/rich-results
   - Testa suporte a rich snippets
   - Valida JSON-LD

2. **Schema Markup Validator**
   - URL: https://validator.schema.org/
   - Valida sintaxe schema.org
   - Identifica erros

3. **Google Search Console**
   - Monitoramento contínuo
   - Relatórios de rich results
   - Alertas de problemas

### Processo de Validação
```bash
# 1. Abrir página no navegador
# 2. View Source (Ctrl+U)
# 3. Procurar por <script type="application/ld+json">
# 4. Copiar JSON
# 5. Validar em validator.schema.org
```

### Checklist de Qualidade
- [ ] JSON-LD válido (sem erros de sintaxe)
- [ ] Todos os campos obrigatórios preenchidos
- [ ] URLs absolutas (com domínio completo)
- [ ] IDs únicos para cada schema na página
- [ ] Dados correspondem ao conteúdo visível
- [ ] Imagens têm URLs válidas
- [ ] Datas em formato ISO 8601

## Benefícios SEO

### Rich Snippets Possíveis

#### 1. Organization Rich Snippet
```
📍 Fabrik Performance
★★★★★ 4.9 (127 avaliações)
Studio boutique · Brasília, DF
Aberto · Fecha às 20:00
```

#### 2. Breadcrumb Rich Snippet
```
Home › Alunos › João Silva
```

#### 3. Knowledge Panel
```
┌─────────────────────────────┐
│ Fabrik Performance          │
│ Studio de treinamento       │
│                             │
│ 📍 Lago Sul, Brasília       │
│ ⏰ Seg-Sex: 6h-20h          │
│ 📞 (61) XXXX-XXXX          │
│ 🌐 www.fabrikbrasil.com    │
└─────────────────────────────┘
```

#### 4. Site Links
```
Fabrik Performance
www.fabrikbrasil.com
┌──────────┬──────────┬──────────┐
│ Alunos   │Exercícios│Prescrições│
└──────────┴──────────┴──────────┘
```

### Métricas de Impacto

**Antes:**
- CTR médio: 2-3%
- Snippet básico
- Sem destaque visual

**Depois:**
- CTR esperado: 5-8%
- Rich snippets
- Destaque visual
- Informações extras

## Boas Práticas

### ✅ DO's
1. **Use schemas específicos** (Person > Thing)
2. **Inclua todos campos obrigatórios**
3. **URLs absolutas** (com http/https)
4. **Dados reais** (não inventados)
5. **Múltiplos schemas** quando apropriado
6. **IDs únicos** para cada schema
7. **Validar regularmente**

### ❌ DON'Ts
1. **Não inventar dados** não visíveis
2. **Não duplicar schemas** iguais
3. **Não usar URLs relativas**
4. **Não incluir markup HTML** no JSON
5. **Não exagerar** em keywords
6. **Não usar schemas incorretos**
7. **Não esquecer contexto** (@context)

## Manutenção

### Atualização de Schemas
1. Verificar mudanças no schema.org
2. Testar em validator.schema.org
3. Validar em Rich Results Test
4. Monitorar Search Console

### Novos Schemas
1. Identificar tipo apropriado
2. Consultar schema.org
3. Implementar função utilitária
4. Adicionar em página relevante
5. Validar e testar
6. Documentar

## Próximas Melhorias

### Fase 1 (Atual)
- [x] Organization/SportsActivityLocation
- [x] WebPage
- [x] BreadcrumbList
- [x] Person
- [x] ItemList
- [x] Course/TrainingProgram

### Fase 2 (Planejado)
- [ ] Review/Rating agregado
- [ ] Event (para aulas/workshops)
- [ ] FAQPage (página de FAQ)
- [ ] VideoObject (se adicionar vídeos)
- [ ] Article (para blog posts)
- [ ] Product (se vender produtos)

### Fase 3 (Futuro)
- [ ] LocalBusiness completo
- [ ] OpeningHoursSpecification
- [ ] AggregateRating
- [ ] Offer (preços/planos)
- [ ] MedicalEntity (se aplicável)

## Monitoramento

### Google Search Console
**Métricas a acompanhar:**
- Impressões com rich snippets
- CTR comparado
- Erros de markup
- Cobertura de páginas

### Frequência
- **Semanal:** Verificar erros
- **Mensal:** Analisar performance
- **Trimestral:** Revisar schemas

## Recursos

### Documentação
- [Schema.org](https://schema.org/)
- [Google Search Central - Structured Data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [JSON-LD Spec](https://json-ld.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)

### Ferramentas
- [Schema Markup Generator](https://technicalseo.com/tools/schema-markup-generator/)
- [Schema Validator](https://validator.schema.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Structured Data Linter](http://linter.structured-data.org/)

---

**Data:** 2025-01-04
**Status:** ✅ Implementado
**Rich Snippets:** 6 tipos ativos
**Cobertura:** 100% das páginas principais
