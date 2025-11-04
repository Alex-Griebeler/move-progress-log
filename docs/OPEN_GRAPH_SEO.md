# Open Graph e Twitter Cards - Guia de Implementação SEO

## 📋 Visão Geral

Este documento explica a implementação completa de **Open Graph tags** e **Twitter Cards** para o projeto Fabrik Performance, garantindo previews bonitos e profissionais em todas as redes sociais.

---

## 🎯 O Que São Open Graph e Twitter Cards?

### Open Graph Protocol
Protocolo criado pelo Facebook que permite controlar como URLs aparecem quando compartilhadas em redes sociais.

**Plataformas que usam:**
- 📘 Facebook
- 💼 LinkedIn
- 📱 WhatsApp
- 💬 Slack
- 📧 Aplicativos de email

### Twitter Cards
Sistema próprio do Twitter (X) para controlar previews de links.

**Plataformas que usam:**
- 🐦 Twitter/X
- 💬 Discord (prioriza Twitter Cards)
- 📱 Outros apps de mensagens

---

## 🛠️ Implementação

### 1. Hook `useOpenGraph`

**Localização**: `src/hooks/useOpenGraph.ts`

Hook customizado para gerenciar dinamicamente todas as meta tags de Open Graph e Twitter Cards.

```typescript
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";

useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: 'Página · Fabrik Performance',
  description: 'Descrição da página',
  type: 'website',
  url: true,
});
```

### 2. Tags Geradas Automaticamente

#### Open Graph Tags
```html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />
<meta property="og:image:secure_url" content="..." />
<meta property="og:image:type" content="image/webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="..." />
<meta property="og:type" content="website" />
<meta property="og:url" content="..." />
<meta property="og:site_name" content="Fabrik Performance" />
<meta property="og:locale" content="pt_BR" />
```

#### Twitter Card Tags
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="..." />
<meta name="twitter:image:alt" content="..." />
```

---

## 📐 Especificações de Imagens

### Dimensões Recomendadas

| Tipo | Dimensões | Aspecto | Uso |
|------|-----------|---------|-----|
| **Large Image** | 1200x630px | 1.91:1 | Facebook, LinkedIn, WhatsApp |
| **Summary** | 1200x1200px | 1:1 | Twitter summary card |
| **Mínimo** | 600x315px | 1.91:1 | Funciona mas qualidade menor |
| **Máximo** | 8MB | - | Limite de tamanho de arquivo |

### Formatos Suportados
- ✅ JPG/JPEG
- ✅ PNG
- ✅ WebP (recomendado)
- ❌ GIF (não animado)
- ❌ SVG (não suportado)

### Imagem Padrão Fabrik
**Caminho**: `/logo-fabrik.webp`

Configurada em `FABRIK_OG_DEFAULTS` como imagem padrão para todas as páginas.

---

## 🎨 Tipos de Open Graph

### `type: 'website'`
Usado para páginas institucionais e listagens.

**Exemplos:**
- Dashboard
- Lista de alunos
- Biblioteca de exercícios
- Prescrições
- Protocolos

```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: 'Dashboard · Fabrik Performance',
  type: 'website',
  url: true,
});
```

### `type: 'profile'`
Usado para páginas de perfil de pessoas.

**Exemplos:**
- Detalhe do aluno

```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: `${student.name} · Fabrik Performance`,
  description: `Perfil e acompanhamento de treino de ${student.name}`,
  type: 'profile',
  url: true,
});
```

### `type: 'article'`
Usado para artigos e posts de blog.

**Exemplo futuro:**
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: 'Como HIIT Melhora Performance',
  description: 'Descubra os benefícios do treinamento...',
  type: 'article',
  url: true,
});
```

### `type: 'product'`
Usado para produtos e serviços.

**Exemplo futuro:**
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: 'Personal Training Small Group',
  description: 'Treinos personalizados em grupos de até 8 alunos',
  type: 'product',
  url: true,
});
```

---

## 📱 Tipos de Twitter Card

### `summary_large_image`
Preview com imagem grande (padrão Fabrik).

**Quando usar:**
- Páginas com conteúdo visual
- Landing pages
- Artigos de blog
- Produtos/serviços

**Dimensões:** 1200x630px (1.91:1)

### `summary`
Preview com imagem pequena (thumbnail).

**Quando usar:**
- Perfis de usuário
- Páginas de texto simples
- Listagens básicas

**Dimensões:** 1200x1200px (1:1)

---

## 🎯 Implementação por Página

### 1. Dashboard (Index.tsx)
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: 'Dashboard · Fabrik Performance',
  type: 'website',
  url: true,
});
```

### 2. Lista de Alunos (StudentsPage.tsx)
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: `${NAV_LABELS.students} · Fabrik Performance`,
  description: 'Gestão de alunos e acompanhamento de treinos personalizados.',
  type: 'website',
  url: true,
});
```

### 3. Detalhe do Aluno (StudentDetailPage.tsx)
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: `${student.name} · Fabrik Performance`,
  description: `Perfil e acompanhamento de treino de ${student.name}.`,
  type: 'profile',
  url: true,
});
```

### 4. Biblioteca de Exercícios (ExercisesLibraryPage.tsx)
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: `${NAV_LABELS.exercises} · Fabrik Performance`,
  description: 'Biblioteca completa de exercícios funcionais, HIIT, yoga e mindfulness.',
  type: 'website',
  url: true,
});
```

### 5. Prescrições (PrescriptionsPage.tsx)
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: `${NAV_LABELS.prescriptions} · Fabrik Performance`,
  description: 'Prescrições de treino personalizadas com exercícios, séries e intensidade.',
  type: 'website',
  url: true,
});
```

### 6. Protocolos (RecoveryProtocolsPage.tsx)
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: `${NAV_LABELS.protocols} · Fabrik Performance`,
  description: 'Protocolos de recuperação com imersão no gelo, exposição ao calor e mindfulness.',
  type: 'website',
  url: true,
});
```

### 7. Admin - Usuários (AdminUsersPage.tsx)
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: `${NAV_LABELS.adminUsers} · Fabrik Performance`,
  description: 'Administração de usuários e permissões do sistema.',
  type: 'website',
  url: true,
});
```

### 8. Admin - Diagnósticos (AdminDiagnosticsPage.tsx)
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: `${NAV_LABELS.adminDiagnostics} · Fabrik Performance`,
  description: 'Diagnósticos e monitoramento do sistema.',
  type: 'website',
  url: true,
});
```

### 9. Comparar Alunos (StudentsComparisonPage.tsx)
```typescript
useOpenGraph({
  ...FABRIK_OG_DEFAULTS,
  title: `${NAV_LABELS.studentsComparison} · Fabrik Performance`,
  description: 'Comparação de métricas e desempenho entre alunos.',
  type: 'website',
  url: true,
});
```

---

## 🔍 Validação e Testes

### Ferramentas de Debug

#### 1. Facebook Sharing Debugger
- **URL**: https://developers.facebook.com/tools/debug/
- **Testa**: Open Graph tags
- **Cache**: Limpa cache do Facebook
- **Plataformas**: Facebook, WhatsApp, LinkedIn

**Como usar:**
1. Cole a URL da página
2. Clique em "Debug"
3. Veja preview e erros
4. Clique em "Scrape Again" para limpar cache

#### 2. Twitter Card Validator
- **URL**: https://cards-dev.twitter.com/validator
- **Testa**: Twitter Cards
- **Preview**: Visual do card no Twitter

**Como usar:**
1. Cole a URL da página
2. Veja preview do card
3. Verifique erros de validação

#### 3. LinkedIn Post Inspector
- **URL**: https://www.linkedin.com/post-inspector/
- **Testa**: Open Graph no LinkedIn
- **Cache**: Limpa cache do LinkedIn

#### 4. OpenGraph.xyz
- **URL**: https://opengraph.xyz/
- **Testa**: Preview em múltiplas plataformas
- **Visual**: Facebook, Twitter, LinkedIn, Slack, WhatsApp

---

## 📋 Checklist de Validação

### Obrigatórios
- [x] `og:title` presente e único por página
- [x] `og:description` presente e descritivo (max 160 chars)
- [x] `og:image` presente e URL absoluta
- [x] `og:type` correto para tipo de página
- [x] `og:url` canônica e sem query params
- [x] `twitter:card` definido
- [x] Imagem tem dimensões mínimas (600x315px)
- [x] Imagem é acessível via HTTPS

### Recomendados
- [x] `og:site_name` consistente
- [x] `og:locale` configurado (pt_BR)
- [x] `og:image:alt` descritivo
- [x] `og:image:width` e `og:image:height` especificados
- [x] Imagem otimizada (< 1MB recomendado)
- [x] Twitter Card type apropriado

---

## 🎨 Boas Práticas

### Títulos (og:title)
✅ **DO:**
- Mantenha entre 40-60 caracteres
- Inclua o nome da marca: "Página · Fabrik Performance"
- Seja descritivo e específico
- Use título H1 da página + brand

❌ **DON'T:**
- Títulos genéricos: "Dashboard"
- Mais de 60 caracteres (será cortado)
- Keywords stuffing
- Títulos duplicados entre páginas

### Descrições (og:description)
✅ **DO:**
- 125-155 caracteres ideais
- Descreva o benefício/conteúdo
- Inclua keywords naturalmente
- Call-to-action quando apropriado

❌ **DON'T:**
- Mais de 200 caracteres (será cortado)
- Copiar description da meta tag (pode, mas personalize)
- Descrições vagas: "Uma página sobre..."
- Excesso de emojis ou símbolos

### Imagens (og:image)
✅ **DO:**
- Use 1200x630px para melhor compatibilidade
- Formato WebP ou JPG otimizado
- Texto legível (se houver texto na imagem)
- Alto contraste e qualidade
- URL absoluta (https://dominio.com/image.jpg)

❌ **DON'T:**
- Imagens muito pequenas (< 600x315px)
- Texto muito pequeno ou ilegível
- Fundos complexos demais
- Imagens genéricas de stock photos
- Caminhos relativos (/image.jpg)

---

## 🚀 Próximos Passos (Futuro)

### Fase 1: Imagens Customizadas ✨
- [ ] Criar imagem OG específica para cada tipo de página
- [ ] Landing page hero image (1200x630px)
- [ ] Logo + gradiente para páginas internas
- [ ] Template dinâmico para perfis de alunos

### Fase 2: Open Graph Avançado
- [ ] `article:author` para blog posts
- [ ] `article:published_time` para artigos
- [ ] `profile:first_name` e `profile:last_name` para perfis
- [ ] `product:price` para produtos/serviços

### Fase 3: Twitter Cards Avançado
- [ ] Player Card para vídeos
- [ ] Summary Card with Large Image para artigos
- [ ] Twitter Site (@fabrikperformance)
- [ ] Twitter Creator para autores

### Fase 4: Analytics
- [ ] Rastrear compartilhamentos sociais
- [ ] A/B test de diferentes imagens
- [ ] Monitorar CTR de links compartilhados

---

## 🔗 Referências

### Documentação Oficial
- [Open Graph Protocol](https://ogp.me/)
- [Facebook Sharing Best Practices](https://developers.facebook.com/docs/sharing/webmasters/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [LinkedIn Share Plugin](https://www.linkedin.com/developers/tools/plugins/sharing)

### Ferramentas
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [OpenGraph.xyz](https://www.opengraph.xyz/)
- [Social Share Preview](https://socialsharepreview.com/)

### Guias
- [Moz: Open Graph Meta Tags](https://moz.com/blog/meta-data-templates-123)
- [Ahrefs: Open Graph Meta Tags](https://ahrefs.com/blog/open-graph-meta-tags/)
- [Buffer: Social Media Image Sizes](https://buffer.com/library/ideal-image-sizes-social-media-posts/)

---

**Última atualização**: 2024-01-15  
**Responsável**: Sistema SEO Fabrik Performance  
**Status**: ✅ Implementado em todas as páginas
