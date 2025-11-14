import { useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "@/components/StatCard";
import WorkoutCard from "@/components/WorkoutCard";
import AddWorkoutDialog from "@/components/AddWorkoutDialog";
import { ImportSessionsDialog } from "@/components/ImportSessionsDialog";
import { SessionDetailDialog } from "@/components/SessionDetailDialog";
import { Dumbbell, TrendingUp, Calendar, Users, Library, FileText, Upload, Heart, FileEdit, Info, Database, Trash2, User, Filter } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { useWorkouts } from "@/hooks/useWorkouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [sessionTypeFilter, setSessionTypeFilter] = useState<'all' | 'individual' | 'group'>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
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
    <div className="min-h-screen bg-background">
      {/* Structured Data para SEO */}
      <StructuredData data={getOrganizationSchema()} id="org-schema" />
      <StructuredData 
        data={getWebPageSchema(
          NAV_LABELS.dashboard,
          "Dashboard principal com visão geral de sessões, estatísticas e atividades recentes"
        )} 
        id="webpage-schema" 
      />
      <StructuredData 
        data={getBreadcrumbSchema([
          { label: "Home", href: "/" }
        ])} 
        id="breadcrumb-schema" 
      />
      
      <div id="main-content" className="container mx-auto px-4 py-8 max-w-7xl" role="main">
        {/* Header */}
        <AppHeader
          actions={
            <>
              <Link to="/alunos">
                <Button variant="outline" aria-label={NAV_LABELS.students}>
                  <Users className="h-4 w-4 mr-2" />
                  {NAV_LABELS.students}
                </Button>
              </Link>
              <Link to="/alunos-comparacao">
                <Button variant="outline" aria-label={NAV_LABELS.studentsComparison}>
                  <Users className="h-4 w-4 mr-2" />
                  {NAV_LABELS.studentsComparison}
                </Button>
              </Link>
              <Link to="/exercicios">
                <Button variant="outline" aria-label={NAV_LABELS.exercises}>
                  <Library className="h-4 w-4 mr-2" />
                  {NAV_LABELS.exercises}
                </Button>
              </Link>
              <Link to="/prescricoes">
                <Button variant="outline" aria-label={NAV_LABELS.prescriptions}>
                  <FileText className="h-4 w-4 mr-2" />
                  {NAV_LABELS.prescriptions}
                </Button>
              </Link>
              <Link to="/protocolos">
                <Button variant="outline" aria-label={NAV_LABELS.protocols}>
                  <Heart className="h-4 w-4 mr-2" />
                  {NAV_LABELS.protocols}
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)} aria-label={NAV_LABELS.importExcel}>
                <Upload className="h-4 w-4 mr-2" />
                {NAV_LABELS.importExcel}
              </Button>
              <AddWorkoutDialog onWorkoutAdded={handleWorkoutAdded} />
            </>
          }
        />

        {/* Dev Tools Section */}
        {import.meta.env.DEV && (
          <Card className="mb-6 border-dashed border-2 border-muted-foreground/20 bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Ferramentas de Desenvolvimento</CardTitle>
                  <Badge variant="outline" className="text-xs">DEV</Badge>
                </div>
              </div>
              <CardDescription className="text-xs">
                Ferramentas para popular e limpar dados de teste
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={handlePopulateTestData}
                disabled={isPopulating}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                {isPopulating ? 'Criando...' : 'Popular Dados'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={isClearing}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isClearing ? 'Limpando...' : 'Limpar Sessões'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá deletar TODAS as sessões de teste criadas desde 2025. 
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearTestData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Confirmar Exclusão
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

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
          
          {/* Filtros de tipo de sessão */}
          {recentWorkouts && recentWorkouts.length > 0 && (
            <Card className="p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtrar por tipo:</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={sessionTypeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSessionTypeFilter('all')}
                    className="gap-1.5"
                    aria-label="Mostrar todas as sessões"
                  >
                    Todas
                    <Badge variant={sessionTypeFilter === 'all' ? 'secondary' : 'outline'} className="ml-1">
                      {recentWorkouts.length}
                    </Badge>
                  </Button>
                  <Button
                    variant={sessionTypeFilter === 'individual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSessionTypeFilter('individual')}
                    className="gap-1.5"
                    aria-label="Filtrar apenas sessões individuais"
                  >
                    <User className="h-3.5 w-3.5" />
                    Individual
                    <Badge variant={sessionTypeFilter === 'individual' ? 'secondary' : 'outline'} className="ml-1">
                      {recentWorkouts.filter(w => w.session_type === 'individual').length}
                    </Badge>
                  </Button>
                  <Button
                    variant={sessionTypeFilter === 'group' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSessionTypeFilter('group')}
                    className="gap-1.5"
                    aria-label="Filtrar apenas sessões em grupo"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Grupo
                    <Badge variant={sessionTypeFilter === 'group' ? 'secondary' : 'outline'} className="ml-1">
                      {recentWorkouts.filter(w => w.session_type === 'group').length}
                    </Badge>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workoutsLoading ? (
              <p className="text-muted-foreground col-span-full text-center py-8">
                Carregando sessões...
              </p>
            ) : recentWorkouts && recentWorkouts.length > 0 ? (
              recentWorkouts
                .filter(workout => {
                  if (sessionTypeFilter === 'all') return true;
                  return workout.session_type === sessionTypeFilter;
                })
                .length > 0 ? (
                recentWorkouts
                  .filter(workout => {
                    if (sessionTypeFilter === 'all') return true;
                    return workout.session_type === sessionTypeFilter;
                  })
                  .map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      name={workout.student_name}
                      exercises={workout.total_exercises}
                      date={workout.date}
                      sessionType={workout.session_type}
                      totalVolume={workout.total_volume}
                      onClick={() => setSelectedSessionId(workout.id)}
                    />
                  ))
              ) : (
                <Card className="border-dashed col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="rounded-md bg-muted p-4">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold">
                        Nenhuma sessão {sessionTypeFilter === 'individual' ? 'individual' : 'em grupo'} encontrada
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-md">
                        Não há sessões {sessionTypeFilter === 'individual' ? 'individuais' : 'em grupo'} registradas
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => setSessionTypeFilter('all')}
                      className="gap-2 mt-4"
                    >
                      Ver todas as sessões
                    </Button>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="border-dashed col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
                  <div className="rounded-md bg-primary/10 p-6">
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
      </div>

      <ImportSessionsDialog 
        open={importDialogOpen} 
        onOpenChange={setImportDialogOpen}
      />

      <SessionDetailDialog
        sessionId={selectedSessionId}
        open={!!selectedSessionId}
        onOpenChange={(open) => !open && setSelectedSessionId(null)}
      />
    </div>
  );
};

export default Index;
