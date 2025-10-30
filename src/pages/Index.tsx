import { useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "@/components/StatCard";
import WorkoutCard from "@/components/WorkoutCard";
import AddWorkoutDialog from "@/components/AddWorkoutDialog";
import { ImportSessionsDialog } from "@/components/ImportSessionsDialog";
import { Dumbbell, TrendingUp, Calendar, Users, Library, FileText, Upload, Heart } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { useWorkouts } from "@/hooks/useWorkouts";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recentWorkouts, isLoading: workoutsLoading } = useWorkouts();

  const handleWorkoutAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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
              <p className="text-muted-foreground col-span-full text-center py-8">
                Nenhuma sessão registrada ainda. Clique em "Registrar Sessão" para começar!
              </p>
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
