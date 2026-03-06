# Design System Tokens - Fabrik Performance

## 📐 Spacing System (Semantic Tokens)

**SEMPRE use tokens semânticos. NUNCA use valores fixos como `gap-2`, `space-y-4`, etc.**

### Scale
```tsx
gap-xs  → 8px  (var(--spacing-xs))
gap-sm  → 12px (var(--spacing-sm))
gap-md  → 16px (var(--spacing-md))
gap-lg  → 24px (var(--spacing-lg))
gap-xl  → 32px (var(--spacing-xl))
gap-2xl → 48px (var(--spacing-2xl))
gap-3xl → 64px (var(--spacing-3xl))
```

### Usage
```tsx
// ✅ CORRETO
<div className="flex gap-sm">
<div className="space-y-lg">
<div className="p-md">

// ❌ ERRADO
<div className="flex gap-2">
<div className="space-y-4">
<div className="p-4">
```

---

## 🎨 Gradient System (Reusable Tokens)

**SEMPRE use classes utilitárias ou tokens. NUNCA hardcode gradientes.**

### Primary Gradients
```tsx
// Classes utilitárias
.gradient-card-subtle    // Sutil para backgrounds
.gradient-card-emphasis  // Ênfase para destaques
.text-gradient-primary   // Texto com gradiente

// CSS Variables
var(--gradient-primary)          // Gradiente principal
var(--gradient-primary-subtle)   // Sutil (8% opacity)
var(--gradient-primary-emphasis) // Ênfase (20% opacity)
var(--gradient-to-right)         // Horizontal
var(--gradient-to-bottom)        // Vertical
```

### Usage
```tsx
// ✅ CORRETO
<div className="gradient-card-subtle">
<div style={{ background: 'var(--gradient-primary-emphasis)' }}>
<span className="text-gradient-primary">

// ❌ ERRADO
<div className="bg-gradient-to-br from-primary/20 to-accent/20">
```

---

## 🔘 Border Radius (Semantic Tokens)

**Padronização de arredondamento para consistência visual.**

### Scale
```tsx
rounded-xs  → 4px  (var(--radius-xs))
rounded-sm  → 6px  (var(--radius-sm))
rounded-md  → 8px  (var(--radius-md))   ← Padrão
rounded-lg  → 12px (var(--radius-lg))
rounded-xl  → 16px (var(--radius-xl))
rounded-2xl → 24px (var(--radius-2xl))
rounded-full → 9999px
```

### Component Standards
```tsx
// Cards principais
<Card className="rounded-lg">

// Cards secundários/nested
<Card className="rounded-md">

// Buttons & Inputs
<Button className="rounded-md">
<Input className="rounded-md">

// Badges
<Badge className="rounded-full">

// Avatars
<Avatar className="rounded-full">
```

---

## 🎭 Interactive States (Utility Classes)

**Classes pré-configuradas para estados interativos consistentes.**

### Card Interactive
```tsx
// Uso automático de hover + scale + shadow
<Card className="card-interactive">
  // Já inclui:
  // - cursor-pointer
  // - hover:shadow-premium hover:scale-[1.01]
  // - active:scale-[0.99]
  // - transition-smooth
</Card>
```

### Card Glass Hover
```tsx
// Efeito glassmorphism com hover sutil
<Card className="card-glass-hover">
  // Já inclui:
  // - backdrop-blur-sm
  // - border-border/50
  // - hover:border-primary/20
</Card>
```

### Combining
```tsx
// ✅ Pode combinar
<Card className="card-interactive card-glass-hover">
```

---

## 🏷️ Badge Variants (Semantic)

**Variantes semânticas para comunicação clara.**

### Solid Variants
```tsx
<Badge variant="default">    // Primary
<Badge variant="secondary">  // Secondary
<Badge variant="destructive"> // Destructive
<Badge variant="success">    // Success ✅ NOVO
<Badge variant="warning">    // Warning ⚠️ NOVO
<Badge variant="info">       // Info ℹ️ NOVO
```

### Outline Variants
```tsx
<Badge variant="outline">           // Padrão outline
<Badge variant="outline-success">   // Success outline ✅ NOVO
<Badge variant="outline-warning">   // Warning outline ⚠️ NOVO
<Badge variant="outline-info">      // Info outline ℹ️ NOVO
```

### Usage Examples
```tsx
// Status de conexão
<Badge variant="success">Conectado</Badge>
<Badge variant="outline-warning">Atenção</Badge>

// Notificações
<Badge variant="info">3 novas</Badge>

// Alertas
<Badge variant="warning">Revisar</Badge>
```

---

## 🎨 Color System (Semantic Only)

**SEMPRE use tokens semânticos. NUNCA hardcode cores.**

### Text Colors
```tsx
// ✅ CORRETO
text-foreground
text-muted-foreground
text-primary
text-success
text-warning
text-info

// ❌ ERRADO
text-black
text-white
text-red-500
text-yellow-600
text-green-500
```

### Background Colors
```tsx
// ✅ CORRETO
bg-background
bg-card
bg-primary
bg-success
bg-warning
bg-info

// ❌ ERRADO
bg-white
bg-gray-100
bg-red-500
```

### Border Colors
```tsx
// ✅ CORRETO
border-border
border-primary
border-success/50
border-warning/50

// ❌ ERRADO
border-gray-200
border-yellow-500
border-green-500
```

---

## 📏 Typography Scale

**Hierarquia tipográfica consistente.**

```tsx
text-xs   → 12px
text-sm   → 14px
text-base → 16px ← Padrão
text-lg   → 18px
text-xl   → 20px
text-2xl  → 24px
text-3xl  → 32px
text-4xl  → 40px

// Tokens especiais
text-display → 40px + bold
text-h1      → 32px + semibold
text-h2      → 24px + semibold
```

---

## 🎯 Component Examples

### Card com Todas as Best Practices
```tsx
<Card className="rounded-lg card-interactive card-glass-hover">
  <CardHeader className="pb-sm">
    <div className="flex items-center gap-sm">
      <div className="p-xs rounded-md gradient-card-emphasis">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <CardTitle>Título</CardTitle>
    </div>
  </CardHeader>
  <CardContent className="space-y-md">
    <Badge variant="success">Ativo</Badge>
    <p className="text-sm text-muted-foreground">Descrição</p>
  </CardContent>
</Card>
```

### Stat Card Premium
```tsx
<Card className="rounded-lg gradient-card-subtle">
  <CardHeader>
    <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-4xl font-bold text-gradient-primary">
      1,234
    </div>
    <Badge variant="outline-success" className="mt-sm">
      +12% este mês
    </Badge>
  </CardContent>
</Card>
```

---

## ✅ Validation Checklist

Antes de commitar código, verifique:

- [ ] Todos os espaçamentos usam tokens semânticos (`gap-sm`, `space-y-lg`)
- [ ] Nenhum gradiente hardcoded (`bg-gradient-to-br from-red-500...`)
- [ ] Border radius padronizado (`rounded-lg` para cards, `rounded-md` para inputs)
- [ ] Badges usam variantes semânticas (`success`, `warning`, `info`)
- [ ] Cores são tokens semânticos (`text-primary`, `bg-success`)
- [ ] Estados interativos usam utility classes (`.card-interactive`)
- [ ] Nenhum valor mágico (`h-4`, `w-[123px]`, etc.)

---

## 🚀 Migration Guide

### Antes → Depois

```tsx
// ❌ ANTES
<div className="flex gap-2 p-4">
  <div className="bg-gradient-to-br from-red-500/20 to-gray-900/20 rounded-md">
    <span className="text-yellow-600">Atenção</span>
  </div>
</div>

// ✅ DEPOIS
<div className="flex gap-xs p-md">
  <div className="gradient-card-emphasis rounded-md">
    <Badge variant="warning">Atenção</Badge>
  </div>
</div>
```

---

**Última atualização:** 2025-01-15  
**Versão:** 1.0.0 (Fase 1 Complete)
