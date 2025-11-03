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

const Index = () => {
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
    <div className="min-h-screen bg-background">
      <div id="main-content" className="container mx-auto px-4 py-8 max-w-7xl" role="main">
        {/* Header */}
        <AppHeader
          actions={
            <>
              <Link to="/alunos">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Alunos
                </Button>
              </Link>
              <Link to="/alunos-comparacao">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Comparar Alunos
                </Button>
              </Link>
              <Link to="/exercicios">
                <Button variant="outline">
                  <Library className="h-4 w-4 mr-2" />
                  Biblioteca de Exercícios
                </Button>
              </Link>
              <Link to="/prescricoes">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Prescrições
                </Button>
              </Link>
              <Link to="/protocolos">
                <Button variant="outline">
                  <Heart className="h-4 w-4 mr-2" />
                  Protocolos de Recuperação
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Excel
              </Button>
              <AddWorkoutDialog onWorkoutAdded={handleWorkoutAdded} />
              {import.meta.env.DEV && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handlePopulateTestData}
                    disabled={isPopulating}
                    className="gap-2"
                  >
                    <Database className="h-4 w-4" />
                    {isPopulating ? 'Criando...' : 'Popular Dados'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleClearTestData}
                    disabled={isClearing}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isClearing ? 'Limpando...' : 'Limpar Sessões'}
                  </Button>
                </>
              )}
            </>
          }
        />

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            title="Sessões Registradas"
            value={statsLoading ? "..." : stats?.totalSessions || 0}
            icon={Dumbbell}
            subtitle="Total consolidado"
            gradient
          />
          <StatCard
            title="Este Mês"
            value={statsLoading ? "..." : stats?.thisMonth || 0}
            icon={Calendar}
            subtitle="Sessões em outubro"
          />
          <StatCard
            title="Alunos Ativos"
            value={statsLoading ? "..." : stats?.activeStudents || 0}
            icon={Users}
            subtitle="Com treinos regulares"
          />
          <StatCard
            title="Carga Média"
            value={statsLoading ? "..." : `${stats?.avgLoad || 0}kg`}
            icon={TrendingUp}
            subtitle="Por sessão"
          />
        </section>

        {/* Recent Workouts */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <h2 className="text-xl font-bold text-foreground">Sessões Recentes</h2>
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
                    <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
                      <Upload className="h-4 w-4" />
                      Importar Excel
                    </Button>
                    <Link to="/alunos">
                      <Button variant="outline" className="gap-2">
                        <Users className="h-4 w-4" />
                        Ver Alunos
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
    </div>
  );
};

export default Index;
