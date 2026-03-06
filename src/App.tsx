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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ROUTES } from "@/constants/navigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";

// AUD-009: Code splitting por rota para reduzir bundle size inicial
const Index = lazy(() => import("./pages/Index"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const StudentDetailPage = lazy(() => import("./pages/StudentDetailPage"));
const StudentsComparisonPage = lazy(() => import("./pages/StudentsComparisonPage"));
const SessionsPage = lazy(() => import("./pages/SessionsPage"));
const ExercisesLibraryPage = lazy(() => import("./pages/ExercisesLibraryPage"));
const PrescriptionsPage = lazy(() => import("./pages/PrescriptionsPage"));
const RecoveryProtocolsPage = lazy(() => import("./pages/RecoveryProtocolsPage"));
const AdminDiagnosticsPage = lazy(() => import("./pages/AdminDiagnosticsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const ExerciseReviewPage = lazy(() => import("./pages/ExerciseReviewPage"));
const StudentReportsPage = lazy(() => import("./pages/StudentReportsPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const StudentOnboardingPage = lazy(() => import("./pages/StudentOnboardingPage"));
const OnboardingSuccessPage = lazy(() => import("./pages/OnboardingSuccessPage"));
const OuraErrorPage = lazy(() => import("./pages/OuraErrorPage"));
const AIBuilderPage = lazy(() => import("./features/ai-builder/AIBuilderPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <TooltipProvider>
          <TrainingProvider>
            <SkipToContent />
            <Toaster />
            <Sonner />
            <AuthDebugPanel />
            <BrowserRouter>
              <GlobalSearch />
              <Suspense fallback={<LoadingSpinner size="lg" text="Carregando página..." />}>
                <Routes>
                  {/* Public routes without sidebar */}
                  <Route path={ROUTES.auth} element={<AuthPage />} />
                  <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
                  <Route path="/onboarding/:token" element={<StudentOnboardingPage />} />
                  <Route path={ROUTES.onboardingSuccess} element={<OnboardingSuccessPage />} />
                  <Route path={ROUTES.ouraError} element={<OuraErrorPage />} />
                  
                  {/* Protected routes with sidebar */}
                  <Route path="/*" element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <div className="flex min-h-screen w-full">
                          <AppSidebar />
                          <div className="flex-1 flex flex-col">
                            <header className="h-14 flex items-center justify-between border-b border-border px-4 sticky top-0 bg-background z-50 backdrop-blur-sm">
                              <SidebarTrigger aria-label="Abrir/Fechar menu lateral" />
                              <ThemeToggle />
                            </header>
                            <main className="flex-1">
                              <ErrorBoundary>
                                <Routes>
                                  <Route path="/" element={<Index />} />
                                  <Route path="/alunos" element={<StudentsPage />} />
                                  <Route path="/alunos/:id" element={<StudentDetailPage />} />
                                  <Route path="/alunos/:studentId/relatorios" element={<StudentReportsPage />} />
                                  <Route path="/alunos-comparacao" element={<StudentsComparisonPage />} />
                                  <Route path="/sessoes" element={<SessionsPage />} />
                                  <Route path="/exercicios" element={<ExercisesLibraryPage />} />
                                  <Route path="/prescricoes" element={<PrescriptionsPage />} />
                                  <Route path="/protocolos" element={<RecoveryProtocolsPage />} />
                                  <Route path="/admin/diagnostico-oura" element={<AdminDiagnosticsPage />} />
                                  <Route path="/admin/usuarios" element={<AdminUsersPage />} />
                                  <Route path="/admin/revisao-exercicios" element={<ExerciseReviewPage />} />
                                  <Route path="/ai-builder" element={<AIBuilderPage />} />
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                              </ErrorBoundary>
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
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
