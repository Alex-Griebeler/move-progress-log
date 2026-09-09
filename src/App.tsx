import { AppToasters } from "@/components/AppToasters";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedShell } from "@/components/ProtectedShell";
import { AdminRoute } from "@/components/AdminRoute";
import { SkipToContent } from "@/components/SkipToContent";
import { AuthProvider } from "@/contexts/AuthContext";
import { createAppQueryClient } from "@/lib/authIdentity";
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AuthDebugPanel } from "@/components/AuthDebugPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isAuthDebugEnabled } from "@/utils/authDebug";
import { ROUTES } from "@/constants/navigation";
import { ThemeProvider } from "next-themes";

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
const WhoopDiagnosticsPage = lazy(() => import("./pages/WhoopDiagnosticsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const ExerciseReviewPage = lazy(() => import("./pages/ExerciseReviewPage"));
const StudentReportsPage = lazy(() => import("./pages/StudentReportsPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const StudentOnboardingPage = lazy(() => import("./pages/StudentOnboardingPage"));
const OnboardingSuccessPage = lazy(() => import("./pages/OnboardingSuccessPage"));
const OuraErrorPage = lazy(() => import("./pages/OuraErrorPage"));
const WhoopErrorPage = lazy(() => import("./pages/WhoopErrorPage"));
const OuraConnectPage = lazy(() => import("./pages/OuraConnectPage"));
const WhoopConnectPage = lazy(() => import("./pages/WhoopConnectPage"));
const PrecisionQuestionnairePage = lazy(() => import("./pages/PrecisionQuestionnairePage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const AIBuilderPage = lazy(() => import("./features/ai-builder/AIBuilderPage"));
const AthleteInsightsDashboard = lazy(() => import("./pages/AthleteInsightsDashboard"));
const CoachConsole = lazy(() => import("./pages/CoachConsole"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OAuthConsentPage = lazy(() => import("./pages/OAuthConsentPage"));

// Cache PÚBLICO (rotas sem sessão: onboarding por token, consentimentos...).
// O estado privado das rotas autenticadas vive em um QueryClient por identidade,
// criado pelo AuthProvider e provido pelo IdentityScope dentro do ProtectedShell (A-001).
const publicQueryClient = createAppQueryClient();

const App = () => {
  const showAuthDebug = isAuthDebugEnabled();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={publicQueryClient}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <TooltipProvider>
              <SkipToContent />
              <AppToasters />
              {showAuthDebug && <AuthDebugPanel />}
              <BrowserRouter>
                <Suspense fallback={<LoadingSpinner size="lg" text="Carregando página..." />}>
                  <Routes>
                    {/* Public routes without sidebar */}
                    <Route path={ROUTES.auth} element={<AuthPage />} />
                    <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
                    <Route path="/onboarding/:token" element={<StudentOnboardingPage />} />
                    <Route path={ROUTES.onboardingSuccess} element={<OnboardingSuccessPage />} />
                    <Route path={ROUTES.ouraError} element={<OuraErrorPage />} />
                    <Route path={ROUTES.whoopError} element={<WhoopErrorPage />} />
                    <Route path="/oura-connect/:token" element={<OuraConnectPage />} />
                    <Route path="/whoop-connect/:token" element={<WhoopConnectPage />} />
                    <Route path="/precision-questionnaire/:token" element={<PrecisionQuestionnairePage />} />
                    <Route path={ROUTES.terms} element={<LegalPage variant="terms" />} />
                    <Route path={ROUTES.privacy} element={<LegalPage variant="privacy" />} />
                    <Route path={ROUTES.ouraConsent} element={<LegalPage variant="ouraConsent" />} />
                    <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />

                    {/* Protected routes with sidebar — cache/estado por identidade (A-001) */}
                    <Route path="/*" element={
                      <ProtectedShell>
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
                          <Route path="/admin/diagnostico-oura" element={<AdminRoute><AdminDiagnosticsPage /></AdminRoute>} />
                          <Route path="/admin/diagnostico-whoop" element={<AdminRoute><WhoopDiagnosticsPage /></AdminRoute>} />
                          <Route path="/admin/usuarios" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
                          <Route path={ROUTES.adminExerciseReview} element={<AdminRoute><ExerciseReviewPage /></AdminRoute>} />
                          <Route path="/ai-builder" element={<AdminRoute><AIBuilderPage /></AdminRoute>} />
                          <Route path="/athlete-insights" element={<AdminRoute><AthleteInsightsDashboard /></AdminRoute>} />
                          <Route path="/coach-console" element={<AdminRoute><CoachConsole /></AdminRoute>} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </ProtectedShell>
                    } />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
