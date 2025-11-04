# Meta Titles Dinâmicos - Documentação SEO

## Implementação Completa

### Hook usePageTitle
Criado hook customizado em `src/hooks/usePageTitle.ts` que gerencia dinamicamente o título da página.

**Padrão aplicado:**
```
{Título} · Fabrik Performance
```

**Exemplo:**
```typescript
usePageTitle(NAV_LABELS.students);
// Resultado: "Alunos · Fabrik Performance"
```

### Benefícios SEO

#### 1. Titles Únicos e Descritivos
- ✅ Cada página tem seu próprio title único
- ✅ Máximo 60 caracteres (ideal para Google)
- ✅ Palavra-chave principal no início
- ✅ Marca no final para branding

#### 2. Hierarquia Clara
```
Dashboard · Fabrik Performance
Alunos · Fabrik Performance
João Silva · Fabrik Performance (página de detalhe)
Exercícios · Fabrik Performance
Prescrições · Fabrik Performance
Protocolos · Fabrik Performance
```

#### 3. Integração com Sistema de Nomenclaturas
- ✅ Usa NAV_LABELS centralizado
- ✅ Consistência garantida
- ✅ Fácil manutenção

#### 4. Comportamento Dinâmico
- ✅ Title atualiza ao navegar
- ✅ Restaura title anterior ao desmontar
- ✅ Suporta conteúdo dinâmico (ex: nome do aluno)

### Meta Tags no index.html

```html
<title>Fabrik Performance · Sistema de Treino</title>
<meta name="description" content="Fabrik Performance - Sistema de registro e acompanhamento de treinos. Studio boutique com metodologia exclusiva Body & Mind Fitness no Lago Sul, Brasília." />
<meta name="keywords" content="treino funcional, personal trainer, oura ring, recuperação, performance, HIIT, yoga, mindfulness, Brasília, Lago Sul" />
```

**Open Graph (Redes Sociais):**
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="Fabrik Performance - Sistema de Registro de Treinos">
<meta property="og:description" content="Sistema profissional de registro e acompanhamento de performance em exercícios físicos - Metodologia Fabrik">
<meta property="og:image" content="[URL da imagem]">
```

**Twitter Cards:**
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Fabrik Performance - Sistema de Registro de Treinos">
<meta name="twitter:description" content="Sistema profissional de registro e acompanhamento de performance em exercícios físicos - Metodologia Fabrik">
```

## Implementação por Página

### Dashboard (/)
```typescript
usePageTitle(NAV_LABELS.dashboard);
// Title: "Dashboard · Fabrik Performance"
```

### Alunos (/alunos)
```typescript
usePageTitle(NAV_LABELS.students);
// Title: "Alunos · Fabrik Performance"
```

### Detalhes do Aluno (/alunos/:id)
```typescript
const pageTitle = useMemo(() => {
  return student ? student.name : NAV_LABELS.students;
}, [student]);

usePageTitle(pageTitle);
// Title: "João Silva · Fabrik Performance"
```

### Exercícios (/exercicios)
```typescript
usePageTitle(NAV_LABELS.exercises);
// Title: "Exercícios · Fabrik Performance"
```

### Prescrições (/prescricoes)
```typescript
usePageTitle(NAV_LABELS.prescriptions);
// Title: "Prescrições · Fabrik Performance"
```

### Protocolos (/protocolos)
```typescript
usePageTitle(NAV_LABELS.protocols);
// Title: "Protocolos · Fabrik Performance"
```

### Comparar Alunos (/alunos-comparacao)
```typescript
usePageTitle(NAV_LABELS.studentsComparison);
// Title: "Comparar alunos · Fabrik Performance"
```

### Usuários Admin (/admin/usuarios)
```typescript
usePageTitle(NAV_LABELS.adminUsers);
// Title: "Usuários · Fabrik Performance"
```

### Diagnóstico Oura (/admin/diagnostico-oura)
```typescript
usePageTitle(NAV_LABELS.adminDiagnostics);
// Title: "Diagnóstico Oura · Fabrik Performance"
```

## Uso do Hook

### Sintaxe Básica
```typescript
import { usePageTitle } from "@/hooks/usePageTitle";
import { NAV_LABELS } from "@/constants/navigation";

function MyPage() {
  usePageTitle(NAV_LABELS.myPage);
  
  return <div>Conteúdo</div>;
}
```

### Com Conteúdo Dinâmico
```typescript
const [item, setItem] = useState<Item | null>(null);

const pageTitle = useMemo(() => {
  return item ? item.name : NAV_LABELS.defaultTitle;
}, [item]);

usePageTitle(pageTitle);
```

### Sem Nome da Aplicação
```typescript
// Segundo parâmetro = false remove "· Fabrik Performance"
usePageTitle("Título Personalizado", false);
// Resultado: "Título Personalizado"
```

## Best Practices SEO

### ✅ DO's
1. **Manter títulos únicos** para cada página
2. **Incluir palavra-chave principal** no início
3. **Máximo 60 caracteres** (Google trunca após isso)
4. **Usar separador " · "** (bullet) entre título e marca
5. **Atualizar dinamicamente** ao navegar

### ❌ DON'Ts
1. **Não duplicar títulos** entre páginas
2. **Não usar apenas marca** ("Fabrik Performance")
3. **Não exceder 60 caracteres** no total
4. **Não usar CAPS LOCK** (evite gritar)
5. **Não usar caracteres especiais** desnecessários

## Checklist de Verificação

### Por Página
- [ ] Hook usePageTitle está implementado
- [ ] Title usa NAV_LABELS quando possível
- [ ] Title é único e descritivo
- [ ] Máximo 60 caracteres
- [ ] Palavra-chave relevante incluída

### Geral
- [ ] index.html tem title padrão
- [ ] Meta description está otimizada
- [ ] Keywords relevantes incluídas
- [ ] Open Graph tags configuradas
- [ ] Twitter Cards configuradas

## Testes Recomendados

### 1. Navegação
```
✓ Navegar entre páginas
✓ Verificar que title atualiza
✓ Verificar separador " · "
✓ Verificar marca "Fabrik Performance"
```

### 2. Conteúdo Dinâmico
```
✓ Abrir página de detalhe (ex: aluno)
✓ Verificar nome no title
✓ Voltar e verificar title anterior
```

### 3. Ferramentas SEO
```
✓ Google Search Console
✓ Lighthouse (Performance/SEO)
✓ SEO Meta in 1 Click (extensão Chrome)
✓ Screaming Frog SEO Spider
```

## Métricas de Sucesso

### KPIs SEO
- **CTR (Click-Through Rate)**: Aumentar taxa de clique nos resultados
- **Bounce Rate**: Reduzir taxa de rejeição
- **Tempo na Página**: Aumentar engajamento
- **Posicionamento**: Melhorar ranking nas buscas

### Ferramentas de Monitoramento
1. Google Search Console
2. Google Analytics 4
3. Bing Webmaster Tools
4. Ahrefs / SEMrush

## Próximas Melhorias

### Fase 1 (Atual)
- [x] Hook usePageTitle implementado
- [x] Todas as páginas usando o hook
- [x] Meta tags básicas no index.html
- [x] Integração com NAV_LABELS

### Fase 2 (Futuro)
- [ ] Structured Data (JSON-LD)
- [ ] Canonical URLs
- [ ] Hreflang (se multilíngue)
- [ ] Meta robots tags específicas

### Fase 3 (Avançado)
- [ ] A/B testing de titles
- [ ] Otimização baseada em analytics
- [ ] Rich snippets
- [ ] Featured snippets

## Referências

- [Google Search Central - Titles](https://developers.google.com/search/docs/appearance/title-link)
- [Moz - Title Tag Best Practices](https://moz.com/learn/seo/title-tag)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)

---

**Data:** 2025-01-04
**Status:** ✅ Implementado
**Mantido por:** Equipe Fabrik Performance
