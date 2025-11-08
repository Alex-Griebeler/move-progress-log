# Backup Completo - Fabrik Performance System

## Data do Backup
**Data:** 2025-11-08

---

## 1. CONFIGURAÇÃO DO PROJETO

### 1.1 Package.json (Dependências)
```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-collapsible": "^1.1.11",
    "@radix-ui/react-context-menu": "^2.2.15",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-hover-card": "^1.1.14",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.15",
    "@radix-ui/react-navigation-menu": "^1.2.13",
    "@radix-ui/react-popover": "^1.1.14",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.7",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-toggle": "^1.1.9",
    "@radix-ui/react-toggle-group": "^1.1.10",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@supabase/supabase-js": "^2.76.1",
    "@tanstack/react-query": "^5.83.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.462.0",
    "next-themes": "^0.3.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.61.1",
    "react-resizable-panels": "^2.1.9",
    "react-router-dom": "^6.30.1",
    "recharts": "^2.15.4",
    "sonner": "^1.7.4",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.9",
    "xlsx": "^0.18.5",
    "zod": "^3.25.76"
  }
}
```

### 1.2 Vite Config
```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

### 1.3 Tailwind Config
```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### 1.4 Index.css (Design System)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## 2. ESTRUTURA DO BANCO DE DADOS SUPABASE

### 2.1 Configuração Supabase
```toml
# supabase/config.toml
project_id = "zrgfrdmywxlemcuiqtqg"

[functions.generate-protocol-recommendations]
verify_jwt = true

[functions.oura-sync-all]
verify_jwt = false

[functions.validate-student-invite]
verify_jwt = false

[functions.create-student-from-invite]
verify_jwt = false

[functions.generate-student-invite]
verify_jwt = true

[functions.oura-callback]
verify_jwt = false

[functions.oura-sync]
verify_jwt = false

[functions.oura-sync-test]
verify_jwt = false

[functions.oura-disconnect]
verify_jwt = true

[functions.suggest-regressions]
verify_jwt = true

[functions.voice-session]
verify_jwt = true

[functions.process-voice-session]
verify_jwt = true

[functions.check-rate-limit]
verify_jwt = false

[functions.oura-sync-scheduled]
verify_jwt = false

[functions.admin-create-user]
verify_jwt = true

[functions.admin-update-user]
verify_jwt = true
```

### 2.2 Variáveis de Ambiente
```env
# .env
VITE_SUPABASE_PROJECT_ID="zrgfrdmywxlemcuiqtqg"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ2ZyZG15d3hsZW1jdWlxdHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Mzk1MTMsImV4cCI6MjA3NzIxNTUxM30.f363Y6-uHa3E4zNmmBS1Y9O_w1C-0ZFpX0f9ldxmfOQ"
VITE_SUPABASE_URL="https://zrgfrdmywxlemcuiqtqg.supabase.co"
```

### 2.3 Secrets do Supabase (Configurar manualmente)
- SUPABASE_SERVICE_ROLE_KEY
- OURA_CLIENT_SECRET
- GOOGLE_AI_API_KEY
- OPENAI_API_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_DB_URL
- SUPABASE_PUBLISHABLE_KEY
- OURA_CLIENT_ID
- LOVABLE_API_KEY

### 2.4 Storage Buckets
- **student-avatars** (público)

### 2.5 Database Functions

```sql
-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

-- Function: can_access_trainer
CREATE OR REPLACE FUNCTION public.can_access_trainer(_viewer_id uuid, _trainer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    _viewer_id = _trainer_id OR
    public.has_role(_viewer_id, 'admin') OR
    EXISTS (
      SELECT 1
      FROM public.trainer_access_permissions
      WHERE trainer_id = _viewer_id 
        AND admin_id = _trainer_id
        AND can_view_prescriptions = true
    )
$function$;

-- Function: cleanup_rate_limit_attempts
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.rate_limit_attempts
  WHERE created_at < now() - interval '24 hours';
  
  DELETE FROM public.rate_limit_attempts
  WHERE blocked_until IS NOT NULL 
    AND blocked_until < now()
    AND last_attempt_at < now() - interval '1 hour';
    
  RAISE NOTICE 'Rate limit cleanup completed';
END;
$function$;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
```

---

## 3. ESTRUTURA DE ARQUIVOS DO PROJETO

```
fabrik-performance-system/
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   └── logo-fabrik.webp
│   ├── components/
│   │   ├── ui/ (componentes shadcn)
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   └── tooltip.tsx
│   │   ├── AddExerciseDialog.tsx
│   │   ├── AddStudentDialog.tsx
│   │   ├── AddUserDialog.tsx
│   │   ├── AddWorkoutDialog.tsx
│   │   ├── AddWorkoutSessionDialog.tsx
│   │   ├── AppHeader.tsx
│   │   ├── AppSidebar.tsx
│   │   ├── AssignPrescriptionDialog.tsx
│   │   ├── AudioSegmentRecorder.tsx
│   │   ├── AuthDebugPanel.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── CreatePrescriptionDialog.tsx
│   │   ├── EditExerciseLibraryDialog.tsx
│   │   ├── EditPrescriptionDialog.tsx
│   │   ├── EditSessionDialog.tsx
│   │   ├── EditStudentDialog.tsx
│   │   ├── EditUserDialog.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Enable2FADialog.tsx
│   │   ├── ErrorState.tsx
│   │   ├── ExerciseCombobox.tsx
│   │   ├── ExerciseHistoryCard.tsx
│   │   ├── GenerateInviteLinkDialog.tsx
│   │   ├── ImportSessionsDialog.tsx
│   │   ├── LazyChart.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ManualProtocolRecommendationDialog.tsx
│   │   ├── ManualSessionEntry.tsx
│   │   ├── MultiSegmentRecorder.tsx
│   │   ├── OuraActivityCard.tsx
│   │   ├── OuraAdvancedMetricsCard.tsx
│   │   ├── OuraApiDiagnosticsCard.tsx
│   │   ├── OuraConnectionCard.tsx
│   │   ├── OuraConnectionStatus.tsx
│   │   ├── OuraMetricsCard.tsx
│   │   ├── OuraSleepDetailCard.tsx
│   │   ├── OuraStressCard.tsx
│   │   ├── OuraSyncAllButton.tsx
│   │   ├── OuraWorkoutsCard.tsx
│   │   ├── PageHeader.tsx
│   │   ├── PageLayout.tsx
│   │   ├── PageTabs.tsx
│   │   ├── PersonalizedTrainingDashboard.tsx
│   │   ├── PrescriptionCard.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── ProtocolRecommendationsCard.tsx
│   │   ├── RecordGroupSessionDialog.tsx
│   │   ├── RecordIndividualSessionDialog.tsx
│   │   ├── RecoveryProtocolCard.tsx
│   │   ├── SessionContextForm.tsx
│   │   ├── SessionSetupForm.tsx
│   │   ├── SkipToContent.tsx
│   │   ├── SortableExerciseItem.tsx
│   │   ├── StatCard.tsx
│   │   ├── StickyBar.tsx
│   │   ├── StructuredData.tsx
│   │   ├── StudentObservationsCard.tsx
│   │   ├── StudentObservationsDialog.tsx
│   │   ├── TrainingZonesCard.tsx
│   │   ├── TranscriptionEditor.tsx
│   │   ├── Verify2FADialog.tsx
│   │   ├── VoiceSessionRecorder.tsx
│   │   └── WorkoutCard.tsx
│   ├── contexts/
│   │   └── TrainingContext.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useDebounce.ts
│   │   ├── useExerciseHistory.ts
│   │   ├── useExercisesLibrary.ts
│   │   ├── useOfflineSync.ts
│   │   ├── useOpenGraph.ts
│   │   ├── useOuraConnection.ts
│   │   ├── useOuraConnectionStatus.ts
│   │   ├── useOuraMetrics.ts
│   │   ├── useOuraSyncAll.ts
│   │   ├── useOuraSyncLogs.ts
│   │   ├── useOuraTestSync.ts
│   │   ├── useOuraWorkouts.ts
│   │   ├── usePageTitle.ts
│   │   ├── usePasswordSecurity.ts
│   │   ├── usePrescriptions.ts
│   │   ├── useProtocolRecommendations.ts
│   │   ├── useRecoveryProtocols.ts
│   │   ├── useSEOHead.ts
│   │   ├── useStats.ts
│   │   ├── useStudentDetail.ts
│   │   ├── useStudentImportantObservations.ts
│   │   ├── useStudentInvites.ts
│   │   ├── useStudents.ts
│   │   ├── useTrainers.ts
│   │   ├── useTrainingRecommendation.ts
│   │   ├── useUserRole.ts
│   │   ├── useWorkoutSessions.ts
│   │   └── useWorkouts.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts (auto-gerado)
│   ├── lib/
│   │   ├── notify.ts
│   │   ├── rateLimiter.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── AdminDiagnosticsPage.tsx
│   │   ├── AdminUsersPage.tsx
│   │   ├── AuthPage.tsx
│   │   ├── ExercisesLibraryPage.tsx
│   │   ├── Index.tsx
│   │   ├── NotFound.tsx
│   │   ├── OnboardingSuccessPage.tsx
│   │   ├── OuraErrorPage.tsx
│   │   ├── PrescriptionsPage.tsx
│   │   ├── RecoveryProtocolsPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── StudentDetailPage.tsx
│   │   ├── StudentOnboardingPage.tsx
│   │   ├── StudentsComparisonPage.tsx
│   │   └── StudentsPage.tsx
│   ├── utils/
│   │   ├── clearTestSessions.ts
│   │   ├── dateUtils.ts
│   │   ├── logger.ts
│   │   ├── ouraTranslations.ts
│   │   ├── populateExercises.ts
│   │   ├── populateTestSessions.ts
│   │   ├── structuredData.ts
│   │   └── validation.ts
│   ├── constants/
│   │   ├── navigation.ts
│   │   ├── objectives.ts
│   │   ├── trainingMethods.ts
│   │   └── workouts.ts
│   ├── i18n/
│   │   └── pt-BR.json
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
├── supabase/
│   ├── functions/
│   │   ├── admin-create-user/
│   │   │   └── index.ts
│   │   ├── admin-update-user/
│   │   │   └── index.ts
│   │   ├── chat-helper/
│   │   │   └── index.ts
│   │   ├── check-rate-limit/
│   │   │   └── index.ts
│   │   ├── create-audit-admin/
│   │   │   └── index.ts
│   │   ├── create-student-from-invite/
│   │   │   └── index.ts
│   │   ├── generate-protocol-recommendations/
│   │   │   └── index.ts
│   │   ├── generate-student-invite/
│   │   │   └── index.ts
│   │   ├── oura-callback/
│   │   │   └── index.ts
│   │   ├── oura-disconnect/
│   │   │   └── index.ts
│   │   ├── oura-sync/
│   │   │   └── index.ts
│   │   ├── oura-sync-all/
│   │   │   └── index.ts
│   │   ├── oura-sync-scheduled/
│   │   │   └── index.ts
│   │   ├── oura-sync-test/
│   │   │   └── index.ts
│   │   ├── process-voice-session/
│   │   │   └── index.ts
│   │   ├── suggest-regressions/
│   │   │   └── index.ts
│   │   ├── validate-student-invite/
│   │   │   └── index.ts
│   │   └── voice-session/
│   │       └── index.ts
│   └── config.toml
├── docs/
│   ├── AUDIT_ACCESS.md
│   ├── AUTHENTICATION.md
│   ├── AUTH_SUMMARY.md
│   ├── CANONICAL_URLS_ROBOTS.md
│   ├── MICROCOPY_CHECKLIST.md
│   ├── MICROCOPY_GUIDE.md
│   ├── MICROCOPY_IMPLEMENTATION.md
│   ├── NOMENCLATURA_PADRONIZADA.md
│   ├── OPEN_GRAPH_SEO.md
│   ├── OURA_SYNC_AUTOMATION.md
│   ├── RATE_LIMITING.md
│   ├── SECURITY_CHECKLIST.md
│   ├── SECURITY_ENHANCEMENTS.md
│   ├── SEO_META_TITLES.md
│   ├── SITEMAP_ROBOTS_SEO.md
│   ├── STRUCTURED_DATA_SEO.md
│   ├── STUDENTS_MODULE_MIGRATION.md
│   └── TESTING_GUIDE.md
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. PRINCIPAIS FUNCIONALIDADES DO SISTEMA

### 4.1 Autenticação e Autorização
- Sistema de login/logout com Supabase Auth
- Roles: admin, trainer, moderator
- 2FA (Two-Factor Authentication)
- Reset de senha
- Rate limiting para tentativas de login

### 4.2 Gestão de Alunos
- CRUD completo de alunos
- Upload de avatar (Storage bucket: student-avatars)
- Integração com Oura Ring
- Sistema de convites para onboarding
- Observações e notas importantes
- Comparação entre alunos

### 4.3 Prescrições de Treino
- Criação e edição de prescrições
- Biblioteca de exercícios
- Arraste e solte para reordenar exercícios
- Atribuição de prescrições a alunos
- Histórico de prescrições

### 4.4 Registro de Sessões
- **Registro Manual**: Entrada de dados exercício por exercício, aluno por aluno
- **Registro por Voz**: Gravação contínua com transcrição via OpenAI
- Cálculo automático de carga baseado em peso corporal
- Possibilidade de editar sessões finalizadas
- Exclusão de exercícios por aluno

### 4.5 Integração Oura Ring
- OAuth para conectar conta Oura
- Sincronização automática 2x/dia (6h e 18h Brasília)
- Métricas de sono, atividade, estresse
- Recomendações de protocolo baseadas em métricas
- Visualização de workouts do Oura

### 4.6 Protocolos de Recuperação
- Biblioteca de protocolos (gelo, calor, sauna, etc.)
- Recomendações automáticas baseadas em métricas Oura
- Recomendações manuais pelos treinadores

### 4.7 Analytics e Relatórios
- Dashboard com estatísticas
- Gráficos de evolução de carga
- Histórico de exercícios
- Zonas de treinamento personalizadas

### 4.8 Administração
- Gestão de usuários (CRUD)
- Diagnósticos do sistema
- Logs de sincronização Oura
- Permissões granulares

---

## 5. ROTAS DO SISTEMA

```typescript
// App.tsx - Rotas principais
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/auth" element={<AuthPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  <Route path="/onboarding/success" element={<OnboardingSuccessPage />} />
  <Route path="/onboarding/:token" element={<StudentOnboardingPage />} />
  <Route path="/oura/error" element={<OuraErrorPage />} />
  
  {/* Rotas protegidas */}
  <Route element={<ProtectedRoute />}>
    <Route path="/students" element={<StudentsPage />} />
    <Route path="/students/:id" element={<StudentDetailPage />} />
    <Route path="/students/compare" element={<StudentsComparisonPage />} />
    <Route path="/prescriptions" element={<PrescriptionsPage />} />
    <Route path="/exercises" element={<ExercisesLibraryPage />} />
    <Route path="/recovery-protocols" element={<RecoveryProtocolsPage />} />
    <Route path="/admin/users" element={<AdminUsersPage />} />
    <Route path="/admin/diagnostics" element={<AdminDiagnosticsPage />} />
  </Route>
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## 6. INSTRUÇÕES DE SETUP

### 6.1 Pré-requisitos
- Node.js 18+ ou Bun
- Conta Supabase
- (Opcional) Conta Oura para integração
- (Opcional) API Keys: OpenAI, Google AI

### 6.2 Instalação

```bash
# Clonar repositório
git clone <repo-url>
cd fabrik-performance-system

# Instalar dependências
npm install
# ou
bun install

# Configurar variáveis de ambiente
# Criar arquivo .env com as variáveis listadas na seção 2.2

# Iniciar servidor de desenvolvimento
npm run dev
# ou
bun dev
```

### 6.3 Configuração Supabase

1. **Criar projeto Supabase**
2. **Configurar secrets** (seção 2.3)
3. **Criar storage bucket**: `student-avatars` (público)
4. **Executar migrations** (criar tabelas via Supabase Dashboard)
5. **Criar functions do banco** (seção 2.5)
6. **Deploy das Edge Functions** (automático via Lovable Cloud)

### 6.4 Tabelas Principais do Banco

```sql
-- Principais tabelas (estrutura resumida)

-- user_roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- trainer_profiles
CREATE TABLE trainer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(user_id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  weight_kg DECIMAL,
  height_cm DECIMAL,
  max_heart_rate INTEGER,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- prescriptions (workouts)
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(user_id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- workout_sessions
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students,
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(user_id),
  prescription_id UUID REFERENCES prescriptions,
  session_date DATE NOT NULL,
  session_time TIME,
  is_finalized BOOLEAN DEFAULT FALSE,
  general_observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- exercises
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id UUID NOT NULL REFERENCES workout_sessions ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  load_kg DECIMAL,
  load_breakdown TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- exercises_library
CREATE TABLE exercises_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(user_id),
  name TEXT NOT NULL,
  movement_pattern TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- oura_connections
CREATE TABLE oura_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- oura_sleep_data
CREATE TABLE oura_sleep_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students,
  date DATE NOT NULL,
  sleep_score INTEGER,
  total_sleep_duration INTEGER,
  deep_sleep_duration INTEGER,
  rem_sleep_duration INTEGER,
  light_sleep_duration INTEGER,
  awake_time INTEGER,
  restfulness INTEGER,
  sleep_efficiency INTEGER,
  sleep_latency INTEGER,
  sleep_timing INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

-- oura_activity_data
CREATE TABLE oura_activity_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students,
  date DATE NOT NULL,
  activity_score INTEGER,
  steps INTEGER,
  active_calories INTEGER,
  total_calories INTEGER,
  target_calories INTEGER,
  equivalent_walking_distance INTEGER,
  high_activity_time INTEGER,
  medium_activity_time INTEGER,
  low_activity_time INTEGER,
  sedentary_time INTEGER,
  inactivity_alerts INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

-- recovery_protocols
CREATE TABLE recovery_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- protocol_recommendations
CREATE TABLE protocol_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students,
  protocol_id UUID NOT NULL REFERENCES recovery_protocols,
  recommended_date DATE NOT NULL,
  reason TEXT,
  is_manual BOOLEAN DEFAULT FALSE,
  trainer_id UUID REFERENCES trainer_profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- rate_limit_attempts
CREATE TABLE rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. COMPONENTES PRINCIPAIS

### 7.1 RecordGroupSessionDialog
Componente para registro de sessões em grupo (manual ou por voz).

**Estados:**
- `context-setup`: Configuração inicial (data, hora, prescrição)
- `mode-selection`: Escolha entre registro manual ou por voz
- `manual-entry`: Entrada manual de dados por aluno
- `recording`: Gravação de áudio contínua

**Fluxos:**
1. Manual: context-setup → mode-selection → manual-entry
2. Voz: context-setup → mode-selection → recording

### 7.2 ManualSessionEntry
Componente para entrada manual de exercícios, aluno por aluno.

**Funcionalidades:**
- Navegação entre alunos (anterior/próximo)
- Cálculo automático de carga quando "peso corporal" é detectado
- Validação de campos obrigatórios
- Exclusão de exercícios
- Feedback visual para campos inválidos

### 7.3 EditSessionDialog
Permite editar sessões já finalizadas.

**Funcionalidades:**
- Edição de nome do exercício, séries, reps, carga, breakdown, observações
- Exclusão de exercícios
- Salvamento com atualização no Supabase

### 7.4 VoiceSessionRecorder
Gravação contínua de sessão com transcrição via OpenAI Realtime API.

**Fluxo:**
1. Estabelece WebSocket com edge function `voice-session`
2. Edge function conecta com OpenAI Realtime API
3. Áudio é enviado em tempo real
4. OpenAI retorna transcrição e dados estruturados
5. Dados são salvos no Supabase

### 7.5 OuraConnectionCard
Gerencia conexão com Oura Ring.

**Funcionalidades:**
- Botão para iniciar OAuth
- Exibição de status da conexão
- Desconexão
- Sincronização manual

### 7.6 ProtocolRecommendationsCard
Exibe recomendações de protocolo baseadas em métricas Oura.

**Funcionalidades:**
- Recomendações automáticas (via edge function `generate-protocol-recommendations`)
- Recomendações manuais
- Visualização de protocolos sugeridos

---

## 8. EDGE FUNCTIONS DETALHADAS

### 8.1 voice-session
**Função:** Gerencia sessão de gravação de voz em tempo real.
**Autenticação:** Requer JWT
**Fluxo:**
1. Cliente abre WebSocket
2. Envia contexto da sessão (alunos, prescrição)
3. Edge function busca prescrição no Supabase
4. Cria sessão com OpenAI Realtime API
5. Relaya áudio entre cliente e OpenAI
6. Extrai dados estruturados via function calling
7. Retorna dados ao cliente

### 8.2 process-voice-session
**Função:** Processa transcrição de áudio e salva no banco.
**Autenticação:** Requer JWT
**Input:** sessionId, transcription, extractedData
**Output:** Salva workout_session e exercises

### 8.3 oura-sync
**Função:** Sincroniza dados de um aluno específico do Oura.
**Autenticação:** Não (chamada por scheduled job)
**Parâmetros:** student_id, start_date, end_date
**Dados sincronizados:**
- Sleep (sono)
- Daily Activity (atividade diária)
- Daily Stress (estresse)
- Daily Resilience (resiliência)
- Heart Rate (frequência cardíaca)
- Workouts

### 8.4 oura-sync-all
**Função:** Sincroniza todos os alunos com Oura ativo.
**Autenticação:** Não
**Fluxo:**
1. Busca todas as oura_connections ativas
2. Calcula data atual em UTC-3 (Brasília)
3. Chama oura-sync para cada aluno (retry 3x se falhar)
4. Loga resultados em oura_sync_logs

### 8.5 oura-sync-scheduled
**Função:** Trigger para sincronização automática via pg_cron.
**Autenticação:** Não
**Schedule:** 2x/dia (9h UTC e 21h UTC = 6h e 18h Brasília)
**Ação:** Chama oura-sync-all

### 8.6 oura-callback
**Função:** Callback do OAuth do Oura.
**Autenticação:** Não
**Fluxo:**
1. Recebe authorization code
2. Troca code por access_token e refresh_token
3. Salva tokens em oura_connections
4. Inicia sync inicial (últimos 30 dias)
5. Redireciona para página de sucesso

### 8.7 generate-protocol-recommendations
**Função:** Gera recomendações de protocolo baseadas em métricas Oura.
**Autenticação:** Requer JWT (trainer)
**Input:** student_id
**Lógica:**
1. Busca últimas métricas Oura do aluno
2. Busca regras de adaptação (adaptation_rules)
3. Compara métricas com regras
4. Gera recomendações de protocolos
5. Salva em protocol_recommendations

### 8.8 generate-student-invite
**Função:** Gera link de convite para onboarding de aluno.
**Autenticação:** Requer JWT (trainer)
**Input:** email, expirationDays
**Output:** invite_url, token, expires_at
**Salva em:** student_invites

### 8.9 create-student-from-invite
**Função:** Cria aluno a partir de convite.
**Autenticação:** Não
**Input:** invite_token, student_data, avatar_base64
**Fluxo:**
1. Valida invite_token
2. Upload de avatar (se fornecido)
3. Calcula max_heart_rate
4. Cria ou atualiza student
5. Marca invite como usado
6. Se has_oura_ring: gera URL OAuth Oura

### 8.10 admin-create-user
**Função:** Cria novo usuário (admin only).
**Autenticação:** Requer JWT + role admin
**Input:** email, password, fullName, role
**Fluxo:**
1. Verifica se requisitante é admin
2. Valida dados
3. Cria usuário em auth.users
4. Cria trainer_profile (se role = admin/moderator)
5. Insere role em user_roles

### 8.11 admin-update-user
**Função:** Atualiza usuário existente (admin only).
**Autenticação:** Requer JWT + role admin
**Input:** userId, email, password, fullName, role
**Fluxo:**
1. Verifica se requisitante é admin
2. Atualiza auth.users
3. Atualiza role em user_roles
4. Atualiza/cria trainer_profile se necessário

### 8.12 check-rate-limit
**Função:** Verifica e aplica rate limiting.
**Autenticação:** Não
**Input:** ip_address, action, increment
**Lógica:**
1. Busca tentativas recentes por IP + action
2. Verifica se está bloqueado
3. Reseta contador se janela expirou
4. Incrementa tentativas (se increment = true)
5. Bloqueia se excedeu limite
**Tabela:** rate_limit_attempts

### 8.13 suggest-regressions
**Função:** Sugere exercícios de regressão via AI.
**Autenticação:** Requer JWT
**Input:** exerciseId, exerciseName, movementPattern, availableExercises
**Output:** suggestedExerciseIds, reasoning
**AI:** Lovable AI Gateway (google/gemini-2.5-flash)

### 8.14 validate-student-invite
**Função:** Valida token de convite.
**Autenticação:** Não
**Input:** token (query param)
**Output:** valid, trainerName, expiresAt, email

---

## 9. HOOKS CUSTOMIZADOS

### 9.1 useStudents
Gerencia lista de alunos do trainer.
**Retorna:** students, isLoading, error

### 9.2 useStudentDetail
Busca detalhes de um aluno específico.
**Input:** studentId
**Retorna:** student, isLoading, error

### 9.3 usePrescriptions
Gerencia prescrições de treino.
**Retorna:** prescriptions, isLoading, createPrescription, updatePrescription, deletePrescription

### 9.4 useWorkoutSessions
Busca sessões de treino de um aluno.
**Input:** studentId
**Retorna:** sessions, isLoading, refetch

### 9.5 useOuraConnection
Gerencia conexão Oura de um aluno.
**Input:** studentId
**Retorna:** connection, connect, disconnect, isLoading

### 9.6 useOuraMetrics
Busca métricas Oura de um aluno.
**Input:** studentId, startDate, endDate
**Retorna:** sleepData, activityData, stressData, isLoading

### 9.7 useProtocolRecommendations
Busca recomendações de protocolo de um aluno.
**Input:** studentId
**Retorna:** recommendations, generateRecommendations, isLoading

### 9.8 useUserRole
Verifica role do usuário logado.
**Retorna:** role, isAdmin, isLoading

### 9.9 useDebounce
Debounce de valores.
**Input:** value, delay
**Retorna:** debouncedValue

### 9.10 useOfflineDetection
Detecta status online/offline.
**Retorna:** isOnline

---

## 10. UTILIDADES E HELPERS

### 10.1 dateUtils.ts
Funções para formatar datas do Oura (UTC → local).

```typescript
export const formatOuraDate = (dateString: string, formatStr?: string): string
export const formatOuraDateTime = (datetimeString: string, formatStr?: string): string
export const formatLocalDate = (dateString: string): string
export const formatLocalDateTime = (datetimeString: string): string
```

### 10.2 ouraTranslations.ts
Traduções para atividades, intensidade, resiliência do Oura.

```typescript
export const translateActivity = (activity: string): string
export const translateIntensity = (intensity: string | null): string
export const translateResilience = (level: string | null): string
export const translateDaySummary = (summary: string | null): string
```

### 10.3 logger.ts
Logger que remove logs sensíveis em produção.

```typescript
export const logger = {
  log: (...args: any[]) => void,
  error: (...args: any[]) => void,
  warn: (...args: any[]) => void,
  info: (...args: any[]) => void,
  debug: (...args: any[]) => void
}
```

### 10.4 validation.ts
Schemas Zod para validação de dados.

```typescript
export const studentProfileSchema: z.ZodSchema
export const studentObservationSchema: z.ZodSchema
export const workoutNameSchema: z.ZodSchema
export const recoveryProtocolSchema: z.ZodSchema
export const sanitizeInput = (input: string): string
export const validateAndSanitize = <T>(schema, data): Result
export const formatValidationErrors = (errors): string
```

### 10.5 structuredData.ts
Gera JSON-LD para SEO.

```typescript
export const getOrganizationSchema = (): object
export const getBreadcrumbSchema = (items): object
export const getWebPageSchema = (title, description): object
export const getPersonSchema = (person): object
export const getExerciseActionSchema = (name, date): object
export const getTrainingProgramSchema = (name, desc, obj?): object
export const getItemListSchema = (items, listName): object
export const getWebApplicationSchema = (): object
```

### 10.6 notify.ts
Wrapper para toast notifications.

```typescript
import { toast } from 'sonner';

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
  warning: (message: string) => toast.warning(message)
}
```

### 10.7 rateLimiter.ts
Client-side rate limiting check.

```typescript
export const checkRateLimit = async (action: string, increment: boolean): Promise<boolean>
```

---

## 11. CONSTANTES

### 11.1 navigation.ts
Itens de navegação da sidebar.

```typescript
export const navigationItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Users, label: "Alunos", path: "/students" },
  { icon: FileText, label: "Prescrições", path: "/prescriptions" },
  { icon: Dumbbell, label: "Exercícios", path: "/exercises" },
  { icon: Heart, label: "Protocolos", path: "/recovery-protocols" },
  // admin only
  { icon: Shield, label: "Usuários", path: "/admin/users" },
  { icon: Activity, label: "Diagnósticos", path: "/admin/diagnostics" },
]
```

### 11.2 objectives.ts
Objetivos de treino disponíveis.

```typescript
export const trainingObjectives = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "forca", label: "Força" },
  { value: "resistencia", label: "Resistência" },
  { value: "potencia", label: "Potência" },
  { value: "mobilidade", label: "Mobilidade" },
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "condicionamento", label: "Condicionamento" },
]
```

### 11.3 trainingMethods.ts
Métodos de treino.

```typescript
export const trainingMethods = [
  { value: "tradicional", label: "Tradicional" },
  { value: "super_serie", label: "Super Série" },
  { value: "drop_set", label: "Drop Set" },
  { value: "piramide", label: "Pirâmide" },
  { value: "rest_pause", label: "Rest-Pause" },
  { value: "circuito", label: "Circuito" },
  { value: "emom", label: "EMOM" },
  { value: "amrap", label: "AMRAP" },
]
```

### 11.4 workouts.ts
Tipos de workout pré-definidos.

```typescript
export const workoutTypes = [
  { value: "A", label: "Treino A" },
  { value: "B", label: "Treino B" },
  { value: "C", label: "Treino C" },
  { value: "D", label: "Treino D" },
  { value: "superior", label: "Superior" },
  { value: "inferior", label: "Inferior" },
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "legs", label: "Legs" },
  { value: "full_body", label: "Full Body" },
]
```

---

## 12. CONTEXTOS

### 12.1 TrainingContext
Gerencia estado global de recomendações de treino.

```typescript
interface TrainingAlternative {
  emoji: string;
  type: string;
  description: string;
}

interface TrainingContextValue {
  selectedAlternative: TrainingAlternative | null;
  setSelectedAlternative: (alt: TrainingAlternative | null) => void;
  clearSelectedAlternative: () => void;
}

export const TrainingProvider: React.FC
export const useTrainingContext: () => TrainingContextValue
```

---

## 13. SEGURANÇA E BOAS PRÁTICAS

### 13.1 RLS (Row Level Security)
Todas as tabelas devem ter RLS habilitado e políticas adequadas:

```sql
-- Exemplo: students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own students"
  ON students FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert their own students"
  ON students FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their own students"
  ON students FOR UPDATE
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their own students"
  ON students FOR DELETE
  USING (trainer_id = auth.uid());
```

### 13.2 Validação de Inputs
- Sempre usar schemas Zod (validation.ts)
- Sanitizar inputs HTML (sanitizeInput)
- Validar no frontend e backend

### 13.3 Rate Limiting
- Aplicado em rotas sensíveis (login, signup, reset password)
- Configurável por ação (check-rate-limit edge function)
- Cleanup automático via `cleanup_rate_limit_attempts()`

### 13.4 Autenticação de Edge Functions
- Verificar JWT quando `verify_jwt = true`
- Sempre validar role quando necessário (admin-only functions)
- Usar `supabaseClient.auth.getUser()` para autenticação

### 13.5 Secrets
- Nunca commitar secrets no código
- Usar Supabase Secrets Management
- Acessar via `Deno.env.get('SECRET_NAME')`

---

## 14. SEO E ACESSIBILIDADE

### 14.1 Meta Tags
Todas as páginas usam `useSEOHead` hook:

```typescript
useSEOHead({
  title: "Título da Página",
  description: "Descrição para SEO",
  keywords: ["palavra1", "palavra2"],
  ogImage: "/path/to/image.jpg",
  canonicalUrl: "https://fabrik.com.br/path"
});
```

### 14.2 Structured Data (JSON-LD)
Componente `StructuredData` em cada página:

```tsx
<StructuredData>
  {getOrganizationSchema()}
  {getWebPageSchema(title, description)}
  {getBreadcrumbSchema(breadcrumbItems)}
</StructuredData>
```

### 14.3 Acessibilidade
- Skip to content link
- Labels semânticos
- ARIA attributes
- Keyboard navigation
- Focus management

### 14.4 Robots.txt
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /onboarding/
Disallow: /auth
Disallow: /reset-password

Sitemap: https://fabrik.com.br/sitemap.xml
```

### 14.5 Sitemap.xml
Gerar sitemap com páginas públicas e atualizá-lo periodicamente.

---

## 15. FLUXOS PRINCIPAIS

### 15.1 Fluxo de Onboarding de Aluno

1. **Trainer gera convite:**
   - Acessa "Gerar Link de Convite" em StudentsPage
   - Insere email do aluno
   - Edge function `generate-student-invite` cria token e retorna URL

2. **Aluno recebe link:**
   - Acessa URL: `/onboarding/:token`
   - Edge function `validate-student-invite` verifica validade

3. **Aluno preenche formulário:**
   - Dados pessoais (nome, email, telefone, data de nascimento, peso, altura)
   - Upload de avatar (opcional)
   - Indica se possui Oura Ring

4. **Submit do formulário:**
   - Edge function `create-student-from-invite`:
     - Upload avatar → Storage
     - Calcula max_heart_rate
     - Cria/atualiza student
     - Marca invite como usado
     - Se has_oura_ring: gera URL OAuth Oura

5. **Conexão Oura (opcional):**
   - Redireciona para OAuth Oura
   - Callback: `/api/oura-callback`
   - Edge function `oura-callback`:
     - Troca code por tokens
     - Salva em oura_connections
     - Inicia sync inicial

6. **Sucesso:**
   - Redireciona para `/onboarding/success`

### 15.2 Fluxo de Registro de Sessão Manual

1. **Trainer abre dialog:**
   - StudentsPage: Dropdown "Registrar Sessão" → "Registro Manual"
   - Ou PrescriptionsPage: Botão "Registrar Sessão em Grupo"

2. **Context Setup (context-setup):**
   - Seleciona data
   - Seleciona hora
   - Seleciona prescrição (opcional)
   - Seleciona alunos (checkboxes)

3. **Mode Selection (mode-selection):**
   - "Registro Manual" ou "Registro por Voz Contínuo"
   - Escolhe "Registro Manual"

4. **Manual Entry (manual-entry):**
   - Exibe um aluno por vez
   - Para cada aluno:
     - Lista exercícios da prescrição (se selecionada)
     - Ou permite adicionar exercícios manualmente
   - Campos por exercício:
     - Nome do Exercício* (obrigatório)
     - Séries* (obrigatório, min 1)
     - Reps* (obrigatório, min 1)
     - Carga (kg) (calculada automaticamente se "peso corporal" em breakdown)
     - Descrição da Carga
     - Observações
   - Botões:
     - Lixeira: remove exercício para esse aluno
     - Anterior/Próximo: navega entre alunos
     - Voltar: retorna para mode-selection
     - Salvar Sessão: salva todos os dados

5. **Salvamento:**
   - Valida campos obrigatórios
   - Para cada aluno:
     - Cria workout_session
     - Insere exercises
   - Feedback via toast
   - Fecha dialog

### 15.3 Fluxo de Registro de Sessão por Voz

1. **Context Setup:** (igual ao manual)

2. **Mode Selection:** Escolhe "Registro por Voz Contínuo"

3. **Recording:**
   - VoiceSessionRecorder inicia
   - Estabelece WebSocket com edge function `voice-session`
   - Envia contexto (alunos, prescrição)
   - Edge function conecta com OpenAI Realtime API
   - Trainer fala exercícios e dados
   - OpenAI transcreve e extrai dados estruturados
   - Dados são exibidos em tempo real no componente
   - Ao finalizar: salva automaticamente
   - Edge function `process-voice-session` persiste no banco

4. **Pós-gravação:**
   - Feedback de sucesso
   - Opção de editar transcrição
   - Fecha dialog

### 15.4 Fluxo de Sincronização Oura Automática

1. **pg_cron dispara:**
   - Agendamento: 2x/dia (9h e 21h UTC)

2. **Edge function `oura-sync-scheduled`:**
   - Chama `oura-sync-all`

3. **Edge function `oura-sync-all`:**
   - Busca todos os oura_connections ativos
   - Para cada conexão:
     - Chama `oura-sync` com retry (3 tentativas)
     - Loga resultado em oura_sync_logs

4. **Edge function `oura-sync`:**
   - Verifica se token expirou (refresh se necessário)
   - Faz requests para Oura API:
     - /v2/usercollection/sleep
     - /v2/usercollection/daily_activity
     - /v2/usercollection/daily_stress
     - /v2/usercollection/daily_resilience
     - /v2/usercollection/heartrate
     - /v2/usercollection/workout
   - Para cada tipo de dado:
     - Faz UPSERT nas tabelas respectivas
   - Retorna summary de registros inseridos/atualizados

### 15.5 Fluxo de Geração de Recomendações de Protocolo

1. **Trigger:**
   - Manual: Trainer clica em "Gerar Recomendações" no StudentDetailPage
   - Automático: Após sync do Oura

2. **Edge function `generate-protocol-recommendations`:**
   - Busca últimas métricas Oura do aluno (últimos 7 dias)
   - Busca todas as adaptation_rules ativas
   - Para cada regra:
     - Verifica condições (score, duração, etc.)
     - Se atende: adiciona action_type à lista
   - Mapeia action_types para recovery_protocols
   - Deleta recomendações antigas do dia
   - Insere novas recomendações em protocol_recommendations

3. **Exibição:**
   - ProtocolRecommendationsCard exibe protocolos recomendados
   - Agrupa por protocolo
   - Mostra motivo (reason)

---

## 16. TESTES

### 16.1 Testar Localmente

```bash
# Iniciar dev server
npm run dev

# Acessar em http://localhost:8080
```

### 16.2 Testar Edge Functions Localmente

```bash
# Supabase CLI
supabase functions serve <function-name>

# Exemplo
supabase functions serve oura-sync
```

### 16.3 População de Dados de Teste

Usar utils:
- `populateExercises.ts`: Popula biblioteca de exercícios
- `populateTestSessions.ts`: Cria sessões de treino fake
- `clearTestSessions.ts`: Limpa dados de teste

---

## 17. DEPLOY E PRODUÇÃO

### 17.1 Deploy Frontend (Lovable)
- Conectar GitHub ao Lovable
- Push automático para repositório
- Deploy via botão "Publish" no Lovable
- Frontend atualiza em alguns minutos

### 17.2 Deploy Edge Functions
- Edge functions são deployadas automaticamente via Lovable Cloud
- Não requer ação manual
- Logs disponíveis no Cloud tab do Lovable

### 17.3 Variáveis de Ambiente em Produção
- Configuradas automaticamente pelo Lovable Cloud
- Secrets devem ser configurados via Supabase Dashboard

### 17.4 Monitoramento
- Logs de Edge Functions: Cloud tab → Functions → Logs
- Database Logs: Cloud tab → Database → Logs
- Auth Logs: Cloud tab → Auth → Logs
- Oura Sync Logs: Tabela `oura_sync_logs`

---

## 18. TROUBLESHOOTING

### 18.1 Sessão não salva no registro manual
**Problema:** Botão "Salvar Sessão" desabilitado.
**Solução:**
- Verificar se todos os campos obrigatórios estão preenchidos (nome, séries, reps)
- Verificar borda vermelha nos campos inválidos
- Mensagens de erro são exibidas abaixo dos campos

### 18.2 Oura não sincroniza
**Problema:** Dados do Oura não aparecem.
**Solução:**
- Verificar se conexão está ativa em OuraConnectionCard
- Verificar se token não expirou (refresh automático)
- Verificar logs em oura_sync_logs
- Verificar edge function logs (oura-sync, oura-sync-all)

### 18.3 Edge function retorna 401
**Problema:** Unauthorized ao chamar edge function.
**Solução:**
- Verificar se JWT está sendo enviado no header Authorization
- Verificar se verify_jwt está correto no config.toml
- Verificar se usuário está autenticado (supabase.auth.getUser())

### 18.4 RLS bloqueia acesso
**Problema:** Query retorna vazio mesmo com dados no banco.
**Solução:**
- Verificar políticas RLS da tabela
- Verificar se auth.uid() retorna o ID correto
- Usar Service Role Key para bypass (apenas em edge functions)

### 18.5 Rate limit bloqueando
**Problema:** Ações sendo bloqueadas por rate limit.
**Solução:**
- Verificar tabela rate_limit_attempts
- Limpar bloqueios manualmente se necessário:
  ```sql
  DELETE FROM rate_limit_attempts WHERE ip_address = '<ip>';
  ```
- Executar cleanup: `SELECT cleanup_rate_limit_attempts();`

---

## 19. ROADMAP E MELHORIAS FUTURAS

### 19.1 Funcionalidades Planejadas
- [ ] Dashboard com gráficos de evolução por aluno
- [ ] Exportação de relatórios em PDF
- [ ] Integração com Whatsapp para notificações
- [ ] App mobile nativo (React Native)
- [ ] Prescrição automática baseada em IA
- [ ] Comparação de múltiplos alunos lado a lado
- [ ] Sistema de metas e conquistas
- [ ] Integração com outras wearables (Garmin, Fitbit)

### 19.2 Otimizações
- [ ] Cache de queries frequentes
- [ ] Lazy loading de imagens
- [ ] Service Worker para offline-first
- [ ] Compression de imagens no upload
- [ ] Pagination em listas grandes

### 19.3 Testes
- [ ] Testes unitários (Vitest)
- [ ] Testes E2E (Playwright)
- [ ] Testes de integração com Supabase
- [ ] CI/CD com GitHub Actions

---

## 20. LICENÇA E CRÉDITOS

### 20.1 Tecnologias Utilizadas
- **React 18** - UI Library
- **Vite** - Build Tool
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **Supabase** - Backend (Database, Auth, Storage, Edge Functions)
- **shadcn/ui** - Component Library
- **Radix UI** - Headless Components
- **React Query** - Data Fetching
- **React Hook Form** - Form Management
- **Zod** - Schema Validation
- **date-fns** - Date Utilities
- **Recharts** - Charts
- **Lucide React** - Icons
- **Sonner** - Toast Notifications
- **dnd-kit** - Drag and Drop
- **OpenAI API** - Voice Transcription
- **Oura API** - Health Metrics

### 20.2 Estrutura do Projeto
Desenvolvido por: Fabrik Performance Team
Data: 2025

---

## 21. CONTATO E SUPORTE

Para dúvidas ou suporte, consultar a documentação interna ou contatar o time de desenvolvimento.

**Documentos Relacionados:**
- `/docs/AUTHENTICATION.md`
- `/docs/OURA_SYNC_AUTOMATION.md`
- `/docs/SECURITY_CHECKLIST.md`
- `/docs/TESTING_GUIDE.md`

---

**FIM DO BACKUP COMPLETO**

Este documento contém todas as informações necessárias para reproduzir o projeto Fabrik Performance System em qualquer ambiente. Certifique-se de configurar corretamente as variáveis de ambiente, secrets do Supabase e executar todas as migrations antes de iniciar o projeto.
