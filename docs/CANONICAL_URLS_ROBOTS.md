# Canonical URLs e Meta Robots - Documentação

## Implementação Completa de Controle de Indexação

### Visão Geral
Sistema completo para gerenciar canonical URLs e meta robots tags, controlando como buscadores indexam e tratam o conteúdo. Essencial para evitar conteúdo duplicado e otimizar SEO.

## Hook useSEOHead

### Arquivo
`src/hooks/useSEOHead.ts`

### Funcionalidade
Hook React que gerencia dinamicamente:
1. **Canonical URLs** - Define URL canônica da página
2. **Meta Robots** - Controla diretivas de indexação

### Uso Básico

```typescript
import { useSEOHead } from "@/hooks/useSEOHead";

// URL canônica automática
useSEOHead({ canonical: true });

// URL canônica customizada
useSEOHead({ canonical: "https://fabrik.com/pagina" });

// Controle de robots
useSEOHead({ 
  canonical: true,
  robots: { index: false, follow: true }
});
```

## Canonical URLs

### O que é?
Tag `<link rel="canonical">` que indica aos buscadores qual é a URL "oficial" de uma página, mesmo quando o mesmo conteúdo está acessível por múltiplas URLs.

### Problemas que Resolve

#### 1. Parâmetros de URL
```
❌ Sem Canonical:
/alunos
/alunos?page=1
/alunos?sort=name
/alunos?page=1&sort=name

✅ Com Canonical:
Todas apontam para: /alunos
```

#### 2. Trailing Slash
```
❌ Duplicado:
/exercicios
/exercicios/

✅ Canonical:
Ambas apontam para: /exercicios
```

#### 3. HTTP vs HTTPS
```
❌ Duplicado:
http://fabrik.com/page
https://fabrik.com/page

✅ Canonical:
Ambas apontam para: https://fabrik.com/page
```

#### 4. WWW vs não-WWW
```
❌ Duplicado:
www.fabrik.com/page
fabrik.com/page

✅ Canonical:
Ambas apontam para: https://fabrik.com/page
```

### Implementação
```html
<!-- Resultado no HTML -->
<link rel="canonical" href="https://fabrik.com/alunos">
```

### Comportamento do Hook
```typescript
// canonical: true
// Remove query params (?page=1) e hash (#section)
// Usa: window.location.href limpo

// canonical: string
// Usa exatamente a URL fornecida
```

## Meta Robots

### O que é?
Tag `<meta name="robots">` que dá instruções específicas aos buscadores sobre como tratar a página.

### Diretivas Disponíveis

#### 1. Index/NoIndex
```typescript
// Permitir indexação
robots: { index: true }
// <meta name="robots" content="index">

// Bloquear indexação
robots: { index: false }
// <meta name="robots" content="noindex">
```

#### 2. Follow/NoFollow
```typescript
// Seguir links da página
robots: { follow: true }
// <meta name="robots" content="follow">

// Não seguir links
robots: { follow: false }
// <meta name="robots" content="nofollow">
```

#### 3. NoArchive
```typescript
// Não salvar cache da página
robots: { noarchive: true }
// <meta name="robots" content="noarchive">
```

#### 4. NoSnippet
```typescript
// Não exibir snippet nos resultados
robots: { nosnippet: true }
// <meta name="robots" content="nosnippet">
```

#### 5. NoImageIndex
```typescript
// Não indexar imagens da página
robots: { noimageindex: true }
// <meta name="robots" content="noimageindex">
```

### Combinações Comuns
```typescript
// Página privada
robots: { index: false, follow: false }
// <meta name="robots" content="noindex, nofollow">

// Página de busca
robots: { index: false, follow: true }
// <meta name="robots" content="noindex, follow">

// Página temporária
robots: { index: false, follow: false, noarchive: true }
// <meta name="robots" content="noindex, nofollow, noarchive">
```

## Presets SEO

### SEO_PRESETS
Configurações pré-definidas para casos comuns:

```typescript
import { SEO_PRESETS } from "@/hooks/useSEOHead";

// 1. Páginas públicas
SEO_PRESETS.public
// canonical: true, index: true, follow: true

// 2. Páginas privadas
SEO_PRESETS.private
// canonical: true, index: false, follow: false

// 3. Páginas de busca/filtros
SEO_PRESETS.search
// canonical: true, index: false, follow: true

// 4. Páginas temporárias
SEO_PRESETS.temporary
// canonical: true, index: false, follow: false, noarchive: true

// 5. Páginas de detalhe
SEO_PRESETS.detail
// canonical: true, index: true, follow: true, nosnippet: false
```

## Implementação por Página

### Padrão para Páginas Privadas
```typescript
const MyPrivatePage = () => {
  usePageTitle("Título");
  useSEOHead(SEO_PRESETS.private);
  
  return <div>Conteúdo</div>;
};
```

### Dashboard (/)
```typescript
useSEOHead(SEO_PRESETS.private);
// Página privada - requer autenticação
```
**Resultado:**
```html
<link rel="canonical" href="https://fabrik.com/">
<meta name="robots" content="noindex, nofollow">
```

### Alunos (/alunos)
```typescript
useSEOHead(SEO_PRESETS.private);
// Lista de alunos é privada
```
**Resultado:**
```html
<link rel="canonical" href="https://fabrik.com/alunos">
<meta name="robots" content="noindex, nofollow">
```

### Detalhes do Aluno (/alunos/:id)
```typescript
useSEOHead(SEO_PRESETS.private);
// Informações pessoais são privadas
```
**Resultado:**
```html
<link rel="canonical" href="https://fabrik.com/alunos/123">
<meta name="robots" content="noindex, nofollow">
```

### Exercícios (/exercicios)
```typescript
useSEOHead(SEO_PRESETS.private);
// Biblioteca interna é privada
```

### Prescrições (/prescricoes)
```typescript
useSEOHead(SEO_PRESETS.private);
// Prescrições são privadas
```

### Protocolos (/protocolos)
```typescript
useSEOHead(SEO_PRESETS.private);
// Protocolos são privados
```

### Admin - Usuários
```typescript
useSEOHead(SEO_PRESETS.private);
// Área administrativa é privada
```

### Admin - Diagnóstico
```typescript
useSEOHead(SEO_PRESETS.private);
// Diagnósticos são privados
```

### Comparação de Alunos
```typescript
useSEOHead(SEO_PRESETS.private);
// Comparações são privadas
```

## Páginas Públicas (Futuras)

Se no futuro houver páginas públicas (ex: landing page, blog):

```typescript
// Landing Page Pública
const LandingPage = () => {
  usePageTitle("Fabrik Performance");
  useSEOHead(SEO_PRESETS.public);
  
  return <div>Conteúdo público</div>;
};
// Resultado: index, follow
```

```typescript
// Página de Blog Post
const BlogPost = () => {
  usePageTitle("Título do Post");
  useSEOHead({
    canonical: true,
    robots: { index: true, follow: true }
  });
  
  return <div>Conteúdo do post</div>;
};
```

```typescript
// Página de Busca no Blog
const BlogSearch = () => {
  usePageTitle("Busca");
  useSEOHead(SEO_PRESETS.search); // noindex, follow
  
  return <div>Resultados de busca</div>;
};
```

## Benefícios SEO

### 1. Evita Conteúdo Duplicado
- ✅ Google não penaliza por duplicação
- ✅ PageRank consolidado na URL canônica
- ✅ Métricas unificadas

### 2. Controle de Indexação
- ✅ Páginas privadas não aparecem no Google
- ✅ Áreas administrativas protegidas
- ✅ Informações sensíveis não indexadas

### 3. Melhor Crawl Budget
- ✅ Buscadores focam em conteúdo importante
- ✅ Não desperdiçam tempo em páginas privadas
- ✅ Indexação mais eficiente

### 4. Proteção de Privacidade
- ✅ Dados de alunos não aparecem em buscas
- ✅ Informações confidenciais protegidas
- ✅ Compliance com LGPD/GDPR

## Validação e Testes

### 1. Verificar no HTML
```bash
# 1. Abrir página
# 2. View Source (Ctrl+U)
# 3. Procurar por:
<link rel="canonical" href="...">
<meta name="robots" content="...">
```

### 2. Ferramentas de Validação

#### Google Search Console
- Testa renderização
- Verifica canonical
- Mostra como Google vê

#### Screaming Frog
- Audita canonical URLs
- Identifica duplicações
- Verifica robots tags

#### Browser DevTools
```javascript
// Console do navegador
document.querySelector('link[rel="canonical"]').href
document.querySelector('meta[name="robots"]').content
```

### 3. Teste de Duplicação
```bash
# URLs que devem ter MESMA canonical:
/alunos
/alunos?page=1
/alunos?sort=name
/alunos/

# Todas devem apontar para:
https://fabrik.com/alunos
```

## Boas Práticas

### ✅ DO's

1. **Sempre use canonical em páginas**
```typescript
✅ useSEOHead({ canonical: true });
```

2. **NoIndex para conteúdo privado**
```typescript
✅ useSEOHead(SEO_PRESETS.private);
```

3. **URLs absolutas em canonical**
```typescript
✅ canonical: "https://fabrik.com/page"
❌ canonical: "/page"
```

4. **Consistência na aplicação**
```typescript
✅ Todas as páginas com SEO configurado
❌ Algumas sim, outras não
```

5. **Testar regularmente**
```typescript
✅ Verificar após deploys
✅ Auditar periodicamente
```

### ❌ DON'Ts

1. **Não omitir canonical**
```typescript
❌ // Sem configuração
```

2. **Não usar canonical para cross-domain**
```typescript
❌ canonical: "https://outro-site.com/page"
```

3. **Não indexar conteúdo privado**
```typescript
❌ useSEOHead({ 
  canonical: true,
  robots: { index: true } // ERRADO para páginas privadas
});
```

4. **Não misturar index e noindex**
```typescript
❌ // Inconsistência
Page A: noindex
Page B (similar): index
```

5. **Não ignorar query params importantes**
```typescript
❌ /page?importante=valor → /page
✅ Manter params essenciais na canonical
```

## Cenários Especiais

### 1. Paginação
```typescript
// Página 1 (canonical principal)
useSEOHead({ 
  canonical: "https://fabrik.com/alunos",
  robots: { index: true, follow: true }
});

// Páginas 2, 3, etc (não indexar)
useSEOHead({ 
  canonical: "https://fabrik.com/alunos",
  robots: { index: false, follow: true }
});
```

### 2. Filtros de Busca
```typescript
// Lista sem filtros
useSEOHead(SEO_PRESETS.public);

// Lista COM filtros (não indexar)
useSEOHead(SEO_PRESETS.search);
```

### 3. Páginas Temporárias
```typescript
// Promoção ou evento temporário
useSEOHead(SEO_PRESETS.temporary);
// noindex, nofollow, noarchive
```

### 4. Páginas A/B Test
```typescript
// Variante A (canonical para original)
useSEOHead({ 
  canonical: "https://fabrik.com/original",
  robots: { index: false, follow: false }
});

// Variante B (canonical para original)
useSEOHead({ 
  canonical: "https://fabrik.com/original",
  robots: { index: false, follow: false }
});
```

## Monitoramento

### Google Search Console
**Verificar:**
- Canonical URLs detectadas
- Páginas indexadas vs total
- Erros de canonical
- Status de indexação

### Métricas a Acompanhar
```
✓ Páginas indexadas (deve ser baixo para app privado)
✓ Canonical duplicadas (deve ser 0)
✓ Erros de robots.txt (deve ser 0)
✓ Páginas bloqueadas (deve incluir todas privadas)
```

### Alertas
- ⚠️ Página privada aparecendo no Google
- ⚠️ Canonical apontando para URL errada
- ⚠️ Meta robots ausente
- ⚠️ Conflito index/noindex

## Checklist de Implementação

### Por Página
- [ ] Hook `useSEOHead` implementado
- [ ] Canonical URL configurada
- [ ] Meta robots configurada
- [ ] Preset correto escolhido
- [ ] Testado no HTML

### Geral
- [ ] Todas as páginas cobertas
- [ ] Páginas privadas com noindex
- [ ] Canonical URLs absolutas
- [ ] Sem conflitos de indexação
- [ ] Documentação atualizada

## Próximas Melhorias

### Fase 1 (Atual)
- [x] Hook useSEOHead
- [x] Presets SEO
- [x] Canonical URLs dinâmicas
- [x] Meta robots completas
- [x] Aplicação em todas as páginas

### Fase 2 (Futuro)
- [ ] X-Robots-Tag (header HTTP)
- [ ] Robots.txt dinâmico
- [ ] Sitemap.xml com canonical
- [ ] Hreflang (se multilíngue)
- [ ] Prev/Next para paginação

### Fase 3 (Avançado)
- [ ] Monitoramento automático
- [ ] Alertas de indexação indevida
- [ ] Dashboard de SEO
- [ ] Relatórios automatizados

## Recursos

### Documentação
- [Google - Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google - Robots Meta Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Moz - Canonical Tags](https://moz.com/learn/seo/canonicalization)

### Ferramentas
- [Google Search Console](https://search.google.com/search-console)
- [Screaming Frog SEO Spider](https://www.screamingfrog.co.uk/seo-spider/)
- [Ahrefs Site Audit](https://ahrefs.com/site-audit)

---

**Data:** 2025-01-04
**Status:** ✅ Implementado
**Páginas Cobertas:** 10/10
**Proteção:** Todas as páginas privadas protegidas
