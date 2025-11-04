import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SkipToContent } from "@/components/SkipToContent";
import { TrainingProvider } from "@/contexts/TrainingContext";
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AuthDebugPanel } from "@/components/AuthDebugPanel";

// AUD-009: Code splitting por rota para reduzir bundle size inicial
const Index = lazy(() => import("./pages/Index"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const StudentDetailPage = lazy(() => import("./pages/StudentDetailPage"));
const StudentsComparisonPage = lazy(() => import("./pages/StudentsComparisonPage"));
const ExercisesLibraryPage = lazy(() => import("./pages/ExercisesLibraryPage"));
const PrescriptionsPage = lazy(() => import("./pages/PrescriptionsPage"));
const RecoveryProtocolsPage = lazy(() => import("./pages/RecoveryProtocolsPage"));
const AdminDiagnosticsPage = lazy(() => import("./pages/AdminDiagnosticsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const StudentOnboardingPage = lazy(() => import("./pages/StudentOnboardingPage"));
const OnboardingSuccessPage = lazy(() => import("./pages/OnboardingSuccessPage"));
const OuraErrorPage = lazy(() => import("./pages/OuraErrorPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TrainingProvider>
        <SkipToContent />
        <Toaster />
        <Sonner />
        <AuthDebugPanel />
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner size="lg" text="Carregando página..." />}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/onboarding/:token" element={<StudentOnboardingPage />} />
              <Route path="/onboarding/success" element={<OnboardingSuccessPage />} />
              <Route path="/onboarding/oura-error" element={<OuraErrorPage />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/alunos" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
              <Route path="/alunos/:id" element={<ProtectedRoute><StudentDetailPage /></ProtectedRoute>} />
              <Route path="/alunos-comparacao" element={<ProtectedRoute><StudentsComparisonPage /></ProtectedRoute>} />
              <Route path="/exercicios" element={<ProtectedRoute><ExercisesLibraryPage /></ProtectedRoute>} />
              <Route path="/prescricoes" element={<ProtectedRoute><PrescriptionsPage /></ProtectedRoute>} />
              <Route path="/protocolos" element={<ProtectedRoute><RecoveryProtocolsPage /></ProtectedRoute>} />
              <Route path="/admin/diagnostico-oura" element={<ProtectedRoute><AdminDiagnosticsPage /></ProtectedRoute>} />
              <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TrainingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
