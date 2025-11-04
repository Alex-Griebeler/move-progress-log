# Sitemap e Robots.txt - Guia de Implementação SEO

## 📋 Visão Geral

Este documento explica a implementação do **sitemap.xml** e **robots.txt** para o projeto Fabrik Performance, focando em facilitar a descoberta por buscadores quando houver conteúdo público.

---

## 🗺️ Sitemap.xml

### Localização
- **Arquivo**: `public/sitemap.xml`
- **URL**: `https://seu-dominio.com/sitemap.xml`

### Status Atual
Atualmente o sitemap está **vazio** porque:
- ✅ Todas as páginas são privadas (sistema de gestão)
- ✅ Todas usam `noindex, nofollow` via meta robots
- ✅ Não há conteúdo público para indexação

### Quando Adicionar Páginas

Se no futuro a Fabrik criar páginas públicas (ex: landing page, blog, sobre nós), adicione ao sitemap:

```xml
<url>
  <loc>https://seu-dominio.com/</loc>
  <lastmod>2024-01-15</lastmod>
  <changefreq>monthly</changefreq>
  <priority>1.0</priority>
</url>

<url>
  <loc>https://seu-dominio.com/sobre</loc>
  <lastmod>2024-01-15</lastmod>
  <changefreq>yearly</changefreq>
  <priority>0.8</priority>
</url>
```

### Elementos do Sitemap

| Tag | Descrição | Obrigatório |
|-----|-----------|-------------|
| `<loc>` | URL completa da página | ✅ Sim |
| `<lastmod>` | Data da última modificação (YYYY-MM-DD) | ❌ Não |
| `<changefreq>` | Frequência de atualização | ❌ Não |
| `<priority>` | Prioridade relativa (0.0 a 1.0) | ❌ Não |

### Prioridades Recomendadas

```
1.0 - Homepage principal
0.8 - Páginas principais (Sobre, Serviços, Contato)
0.6 - Páginas secundárias (Blog posts recentes)
0.4 - Páginas de detalhe (Posts antigos, FAQ)
0.2 - Páginas de baixa importância
```

### Change Frequency

```
always  - Muda a cada acesso (não recomendado)
hourly  - Conteúdo em tempo real
daily   - Notícias, blog ativo
weekly  - Blog normal, serviços
monthly - Páginas institucionais
yearly  - Páginas estáticas (Sobre, Termos)
never   - Arquivos, documentos antigos
```

---

## 🤖 Robots.txt

### Localização
- **Arquivo**: `public/robots.txt`
- **URL**: `https://seu-dominio.com/robots.txt`

### Estrutura Atual

#### 1. Sitemap Reference
```
Sitemap: /sitemap.xml
```
Informa aos buscadores onde encontrar o sitemap.

#### 2. Bots Permitidos
```
User-agent: Googlebot
User-agent: Bingbot
User-agent: Twitterbot
User-agent: facebookexternalhit
Allow: /
```

**Por que permitir se tudo é privado?**
- ✅ Bots respeitam meta robots tags (`noindex`)
- ✅ Permite crawling para detectar mudanças
- ✅ Social crawlers podem gerar previews (Open Graph)
- ✅ Flexibilidade para adicionar páginas públicas

#### 3. Bloqueios de Segurança
```
Disallow: /api/
Disallow: /admin
Disallow: /students
Disallow: /prescriptions
```

Bloqueia acesso direto de bots a:
- Endpoints da API
- Páginas administrativas
- Dados sensíveis de alunos
- Prescrições e protocolos

#### 4. Crawl Delay
```
Crawl-delay: 1
```
Evita sobrecarga no servidor (1 segundo entre requests).

---

## 🔐 Estratégia de Indexação

### Camadas de Proteção

O projeto usa **3 camadas** de proteção contra indexação indevida:

| Camada | Mecanismo | Localização |
|--------|-----------|-------------|
| 1️⃣ | Meta Robots Tags | `useSEOHead` hook em cada página |
| 2️⃣ | Robots.txt | `public/robots.txt` |
| 3️⃣ | Autenticação | Supabase Auth + RLS policies |

### Fluxo de Decisão

```
Bot acessa página
    ↓
robots.txt permite? → NÃO → Bloqueado
    ↓ SIM
Meta robots diz noindex? → SIM → Não indexa (mas crawl permitido)
    ↓ NÃO
Página autenticada? → SIM → Auth bloqueia
    ↓ NÃO
Indexa página ✅
```

---

## 📊 Benefícios SEO

### Sitemap.xml
✅ **Descoberta rápida** de novas páginas  
✅ **Priorização** de conteúdo importante  
✅ **Atualização** eficiente de páginas modificadas  
✅ **Comunicação clara** com buscadores  

### Robots.txt
✅ **Controle** de acesso de bots  
✅ **Proteção** de dados sensíveis  
✅ **Performance** via crawl delay  
✅ **Flexibilidade** para expansão futura  

---

## 🛠️ Ferramentas de Validação

### 1. Google Search Console
- **URL**: https://search.google.com/search-console
- **Função**: Testar robots.txt e sitemap
- **Como**: 
  1. Adicionar propriedade (seu domínio)
  2. Ir em "Sitemaps" → Adicionar sitemap.xml
  3. Ir em "Configurações" → Testar robots.txt

### 2. Bing Webmaster Tools
- **URL**: https://www.bing.com/webmasters
- **Função**: Validar sitemap e robots.txt no Bing

### 3. Validators Online
- **Sitemap**: https://www.xml-sitemaps.com/validate-xml-sitemap.html
- **Robots.txt**: https://technicalseo.com/tools/robots-txt/

---

## 🚀 Próximos Passos (Quando Aplicável)

### Fase 1: Preparação (✅ Concluído)
- [x] Criar sitemap.xml vazio
- [x] Otimizar robots.txt
- [x] Documentar estratégia

### Fase 2: Conteúdo Público (Futuro)
- [ ] Criar landing page pública
- [ ] Adicionar página "Sobre Nós"
- [ ] Adicionar página "Serviços"
- [ ] Atualizar sitemap.xml com URLs públicas
- [ ] Alterar meta robots para `index, follow` nas páginas públicas

### Fase 3: Monitoramento (Futuro)
- [ ] Registrar em Google Search Console
- [ ] Submeter sitemap.xml
- [ ] Monitorar erros de crawling
- [ ] Analisar páginas indexadas

---

## 📝 Checklist de Manutenção

### Ao Adicionar Página Pública
- [ ] Adicionar URL ao sitemap.xml
- [ ] Definir prioridade apropriada
- [ ] Definir changefreq realista
- [ ] Atualizar lastmod
- [ ] Alterar meta robots para `index, follow`
- [ ] Testar URL no Google Search Console

### Ao Proteger Página
- [ ] Adicionar `Disallow: /caminho` no robots.txt
- [ ] Adicionar meta robots `noindex, nofollow`
- [ ] Remover do sitemap.xml
- [ ] Verificar autenticação via Supabase

---

## 🎯 Exemplo de Sitemap Completo (Futuro)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Homepage -->
  <url>
    <loc>https://fabrikperformance.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Sobre -->
  <url>
    <loc>https://fabrikperformance.com/sobre</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Método Body & Mind -->
  <url>
    <loc>https://fabrikperformance.com/metodo</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Serviços -->
  <url>
    <loc>https://fabrikperformance.com/servicos</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Contato -->
  <url>
    <loc>https://fabrikperformance.com/contato</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- Blog Posts -->
  <url>
    <loc>https://fabrikperformance.com/blog/treino-hiit-beneficios</loc>
    <lastmod>2024-01-10</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>

</urlset>
```

---

## 📚 Referências

- [Google: Sitemap Protocol](https://www.sitemaps.org/protocol.html)
- [Google: Robots.txt Specification](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)
- [Google: Robots Meta Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Moz: XML Sitemaps](https://moz.com/learn/seo/xml-sitemaps)
- [Bing: Robots.txt Guidelines](https://www.bing.com/webmasters/help/how-to-create-a-robots-txt-file-cb7c31ec)

---

**Última atualização**: 2024-01-15  
**Responsável**: Sistema SEO Fabrik Performance
