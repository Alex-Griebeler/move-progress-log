import { useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "@/components/StatCard";
import WorkoutCard from "@/components/WorkoutCard";
import AddWorkoutDialog from "@/components/AddWorkoutDialog";
import { ImportSessionsDialog } from "@/components/ImportSessionsDialog";
import { Dumbbell, TrendingUp, Calendar, Users, Library, FileText, Upload, Heart, FileEdit, Info, Database, Trash2 } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { useWorkouts } from "@/hooks/useWorkouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { populateTestSessions } from "@/utils/populateTestSessions";
import { clearTestSessions } from "@/utils/clearTestSessions";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { StructuredData } from "@/components/StructuredData";
import { getOrganizationSchema, getWebPageSchema, getBreadcrumbSchema } from "@/utils/structuredData";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";

const Index = () => {
  usePageTitle(NAV_LABELS.dashboard);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: 'Dashboard · Fabrik Performance',
    type: 'website',
    url: true,
  });
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recentWorkouts, isLoading: workoutsLoading } = useWorkouts();

  const handleWorkoutAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handlePopulateTestData = async () => {
    setIsPopulating(true);
    try {
      toast({
        title: "Criando dados de teste...",
        description: "Por favor, aguarde enquanto geramos as sessões.",
      });

      const result = await populateTestSessions();
      
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });

      toast({
        title: "✅ Dados criados com sucesso!",
        description: result.message,
      });
    } catch (error) {
      console.error('Erro ao popular dados:', error);
      toast({
        title: "❌ Erro ao criar dados",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  const handleClearTestData = async () => {
    if (!confirm('Tem certeza que deseja deletar TODAS as sessões de teste? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsClearing(true);
    try {
      toast({
        title: "Limpando dados de teste...",
        description: "Deletando todas as sessões...",
      });

      const result = await clearTestSessions();
      
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });

      toast({
        title: "✅ Dados limpos com sucesso!",
        description: result.message,
      });
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast({
        title: "❌ Erro ao limpar dados",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <PageLayout
      structuredData={[
        { data: getWebPageSchema(NAV_LABELS.dashboard, "Dashboard principal com visão geral de sessões, estatísticas e atividades recentes"), id: "webpage-schema" },
        { data: getBreadcrumbSchema([{ label: "Home", href: "/" }]), id: "breadcrumb-schema" }
      ]}
    >
      <PageHeader
        title={NAV_LABELS.dashboard}
        description="Visão geral de treinos, estatísticas e atividades recentes"
        actions={
          <>
            <Link to="/alunos">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                {NAV_LABELS.students}
              </Button>
            </Link>
            <Link to="/exercicios">
              <Button variant="outline" size="sm">
                <Library className="h-4 w-4 mr-2" />
                {NAV_LABELS.exercises}
              </Button>
            </Link>
            <Link to="/prescricoes">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                {NAV_LABELS.prescriptions}
              </Button>
            </Link>
            <Link to="/protocolos">
              <Button variant="outline" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                {NAV_LABELS.protocols}
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {NAV_LABELS.importExcel}
            </Button>
            <AddWorkoutDialog onWorkoutAdded={handleWorkoutAdded} />
            {import.meta.env.DEV && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handlePopulateTestData}
                  disabled={isPopulating}
                >
                  <Database className="h-4 w-4 mr-2" />
                  {isPopulating ? 'Criando...' : 'Popular'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearTestData}
                  disabled={isClearing}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isClearing ? 'Limpando...' : 'Limpar'}
                </Button>
              </>
            )}
          </>
        }
      />

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            title={NAV_LABELS.statTotalSessions}
            value={statsLoading ? "..." : stats?.totalSessions || 0}
            icon={Dumbbell}
            subtitle="Total consolidado"
            gradient
          />
          <StatCard
            title={NAV_LABELS.statThisMonth}
            value={statsLoading ? "..." : stats?.thisMonth || 0}
            icon={Calendar}
            subtitle="Sessões em outubro"
          />
          <StatCard
            title={NAV_LABELS.statActiveStudents}
            value={statsLoading ? "..." : stats?.activeStudents || 0}
            icon={Users}
            subtitle="Com treinos regulares"
          />
          <StatCard
            title={NAV_LABELS.statAvgLoad}
            value={statsLoading ? "..." : `${stats?.avgLoad || 0}kg`}
            icon={TrendingUp}
            subtitle="Por sessão"
          />
        </section>

        {/* Recent Workouts */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <h2 className="text-xl font-bold text-foreground">{NAV_LABELS.sectionRecentSessions}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workoutsLoading ? (
              <p className="text-muted-foreground col-span-full text-center py-8">
                Carregando sessões...
              </p>
            ) : recentWorkouts && recentWorkouts.length > 0 ? (
              recentWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  name={workout.student_name}
                  exercises={workout.total_exercises}
                  date={workout.date}
                  totalVolume={workout.total_volume}
                />
              ))
            ) : (
              <Card className="border-dashed col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
                  <div className="rounded-full bg-primary/10 p-6">
                    <Dumbbell className="h-16 w-16 text-primary" />
                  </div>
                  <div className="text-center space-y-3 max-w-md">
                    <h3 className="text-2xl font-bold">Comece a Registrar Sessões</h3>
                    <p className="text-muted-foreground">
                      Ainda não há sessões registradas. Escolha uma das opções abaixo para começar a acompanhar o progresso dos seus alunos.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <AddWorkoutDialog onWorkoutAdded={handleWorkoutAdded} />
                    <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2" aria-label={NAV_LABELS.importExcel}>
                      <Upload className="h-4 w-4" />
                      {NAV_LABELS.importExcel}
                    </Button>
                    <Link to="/alunos">
                      <Button variant="outline" className="gap-2" aria-label={NAV_LABELS.students}>
                        <Users className="h-4 w-4" />
                        {NAV_LABELS.students}
                      </Button>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                    <Info className="h-4 w-4" />
                    <span>Dica: Você pode registrar sessões por voz direto na página de cada aluno</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

      <ImportSessionsDialog 
        open={importDialogOpen} 
        onOpenChange={setImportDialogOpen}
      />
    </PageLayout>
  );
};

export default Index;
