import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Archive,
  ClipboardList,
  Activity,
  Target,
  Dumbbell,
  User
} from "lucide-react";
import { useAssessment, useStartAssessment, useCompleteAssessment, useUpdateAssessment, AssessmentStatus } from "@/hooks/useAssessments";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { ROUTES } from "@/constants/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AssessmentAnamnesisTab } from "@/components/assessment/AssessmentAnamnesisTab";
import { AssessmentGlobalTestsTab } from "@/components/assessment/AssessmentGlobalTestsTab";
import { AssessmentSegmentalTestsTab } from "@/components/assessment/AssessmentSegmentalTestsTab";
import { AssessmentFindingsTab } from "@/components/assessment/AssessmentFindingsTab";
import { AssessmentProtocolTab } from "@/components/assessment/AssessmentProtocolTab";

const STATUS_CONFIG: Record<AssessmentStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  in_progress: { label: "Em andamento", variant: "default" },
  completed: { label: "Concluída", variant: "outline" },
  archived: { label: "Arquivada", variant: "destructive" },
};

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("anamnesis");

  const { data: assessment, isLoading, error, refetch } = useAssessment(id || null);
  const startMutation = useStartAssessment();
  const completeMutation = useCompleteAssessment();
  const updateMutation = useUpdateAssessment();

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState text="Carregando avaliação..." />
      </PageLayout>
    );
  }

  if (error || !assessment) {
    return (
      <PageLayout>
        <ErrorState 
          title="Erro ao carregar avaliação" 
          description={error?.message || "Avaliação não encontrada"}
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[assessment.status];
  const canEdit = assessment.status === 'draft' || assessment.status === 'in_progress';

  const handleStart = async () => {
    await startMutation.mutateAsync(assessment.id);
  };

  const handleComplete = async () => {
    await completeMutation.mutateAsync(assessment.id);
  };

  const handleArchive = async () => {
    await updateMutation.mutateAsync({ id: assessment.id, status: 'archived' });
  };

  return (
    <PageLayout>
      <div className="flex items-center gap-3 mb-lg">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(ROUTES.assessments)}
          aria-label="Voltar para avaliações"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Avaliação - {assessment.student_name}</h1>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            Criada em {format(new Date(assessment.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          {assessment.status === 'draft' && (
            <Button onClick={handleStart} className="gap-2">
              <Play className="h-4 w-4" />
              Iniciar Avaliação
            </Button>
          )}
          {assessment.status === 'in_progress' && (
            <Button onClick={handleComplete} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Concluir Avaliação
            </Button>
          )}
          {assessment.status !== 'archived' && (
            <Button variant="outline" onClick={handleArchive} className="gap-2">
              <Archive className="h-4 w-4" />
              Arquivar
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-lg">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="anamnesis" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Anamnese</span>
          </TabsTrigger>
          <TabsTrigger value="global-tests" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Testes Globais</span>
          </TabsTrigger>
          <TabsTrigger value="segmental-tests" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Testes Segmentares</span>
          </TabsTrigger>
          <TabsTrigger value="findings" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Achados</span>
          </TabsTrigger>
          <TabsTrigger value="protocol" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Protocolo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anamnesis">
          <AssessmentAnamnesisTab 
            assessmentId={assessment.id} 
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="global-tests">
          <AssessmentGlobalTestsTab 
            assessmentId={assessment.id}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="segmental-tests">
          <AssessmentSegmentalTestsTab 
            assessmentId={assessment.id}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="findings">
          <AssessmentFindingsTab 
            assessmentId={assessment.id}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="protocol">
          <AssessmentProtocolTab 
            assessmentId={assessment.id}
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
