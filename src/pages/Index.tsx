import { useState } from "react";
import StatCard from "@/components/StatCard";
import WorkoutCard from "@/components/WorkoutCard";
import AddWorkoutDialog from "@/components/AddWorkoutDialog";
import { Dumbbell, TrendingUp, Calendar, Users } from "lucide-react";

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Dados mockados - em produção viriam do Lovable Cloud
  const stats = {
    totalSessions: 156,
    thisMonth: 18,
    activeStudents: 12,
    avgLoad: 245,
  };

  const recentWorkouts = [
    { id: 1, name: "João Silva", exercises: 6, date: "2025-10-27", totalVolume: 420 },
    { id: 2, name: "Maria Santos", exercises: 5, date: "2025-10-27", totalVolume: 315 },
    { id: 3, name: "Pedro Costa", exercises: 7, date: "2025-10-26", totalVolume: 540 },
    { id: 4, name: "Ana Lima", exercises: 4, date: "2025-10-26", totalVolume: 280 },
  ];

  const handleWorkoutAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-10 pb-6 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1 text-primary tracking-tight">
                Fabrik Performance
              </h1>
              <p className="text-muted-foreground">Sistema de Registro e Acompanhamento</p>
            </div>
            <AddWorkoutDialog onWorkoutAdded={handleWorkoutAdded} />
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            title="Sessões Registradas"
            value={stats.totalSessions}
            icon={Dumbbell}
            subtitle="Total consolidado"
            gradient
          />
          <StatCard
            title="Este Mês"
            value={stats.thisMonth}
            icon={Calendar}
            subtitle="Sessões em outubro"
          />
          <StatCard
            title="Alunos Ativos"
            value={stats.activeStudents}
            icon={Users}
            subtitle="Com treinos regulares"
          />
          <StatCard
            title="Carga Média"
            value={`${stats.avgLoad}kg`}
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
            {recentWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                name={workout.name}
                exercises={workout.exercises}
                date={workout.date}
                totalVolume={workout.totalVolume}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
