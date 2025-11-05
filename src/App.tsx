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
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

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
              {/* Public routes without sidebar */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/onboarding/:token" element={<StudentOnboardingPage />} />
              <Route path="/onboarding/success" element={<OnboardingSuccessPage />} />
              <Route path="/onboarding/oura-error" element={<OuraErrorPage />} />
              
              {/* Protected routes with sidebar */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col">
                        <header className="h-14 flex items-center border-b border-border px-4 sticky top-0 bg-background z-50 backdrop-blur-sm">
                          <SidebarTrigger aria-label="Abrir/Fechar menu lateral" />
                        </header>
                        <main className="flex-1">
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/alunos" element={<StudentsPage />} />
                            <Route path="/alunos/:id" element={<StudentDetailPage />} />
                            <Route path="/alunos-comparacao" element={<StudentsComparisonPage />} />
                            <Route path="/exercicios" element={<ExercisesLibraryPage />} />
                            <Route path="/prescricoes" element={<PrescriptionsPage />} />
                            <Route path="/protocolos" element={<RecoveryProtocolsPage />} />
                            <Route path="/admin/diagnostico-oura" element={<AdminDiagnosticsPage />} />
                            <Route path="/admin/usuarios" element={<AdminUsersPage />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TrainingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
