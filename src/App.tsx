import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import StudentsPage from "./pages/StudentsPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import StudentsComparisonPage from "./pages/StudentsComparisonPage";
import ExercisesLibraryPage from "./pages/ExercisesLibraryPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import RecoveryProtocolsPage from "./pages/RecoveryProtocolsPage";
import AuthPage from "./pages/AuthPage";
import StudentOnboardingPage from "./pages/StudentOnboardingPage";
import OnboardingSuccessPage from "./pages/OnboardingSuccessPage";
import OuraErrorPage from "./pages/OuraErrorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
