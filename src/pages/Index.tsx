import { useState } from "react";
import StatCard from "@/components/StatCard";
import WorkoutCard from "@/components/WorkoutCard";
import AddWorkoutDialog from "@/components/AddWorkoutDialog";
import { Dumbbell, TrendingUp, Calendar, Flame } from "lucide-react";

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Dados mockados - em produção viriam de um backend
  const stats = {
    totalWorkouts: 24,
    thisWeek: 5,
    totalVolume: 12450,
    streak: 7,
  };

  const recentWorkouts = [
    { id: 1, name: "Treino A - Peito e Tríceps", exercises: 6, date: "2025-10-27", totalVolume: 2400 },
    { id: 2, name: "Treino B - Costas e Bíceps", exercises: 5, date: "2025-10-26", totalVolume: 2100 },
    { id: 3, name: "Treino C - Pernas", exercises: 7, date: "2025-10-24", totalVolume: 3200 },
    { id: 4, name: "Treino A - Peito e Tríceps", exercises: 6, date: "2025-10-23", totalVolume: 2350 },
  ];

  const handleWorkoutAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Meus Treinos
              </h1>
              <p className="text-muted-foreground text-lg">Acompanhe seu progresso e evolua! 💪</p>
            </div>
            <AddWorkoutDialog onWorkoutAdded={handleWorkoutAdded} />
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard
            title="Total de Treinos"
            value={stats.totalWorkouts}
            icon={Dumbbell}
            subtitle="Desde o início"
            gradient
          />
          <StatCard
            title="Esta Semana"
            value={stats.thisWeek}
            icon={Calendar}
            subtitle="Treinos realizados"
          />
          <StatCard
            title="Volume Total"
            value={`${(stats.totalVolume / 1000).toFixed(1)}t`}
            icon={TrendingUp}
            subtitle="Peso levantado"
          />
          <StatCard
            title="Sequência"
            value={`${stats.streak} dias`}
            icon={Flame}
            subtitle="Continue assim!"
          />
        </section>

        {/* Recent Workouts */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-1 bg-gradient-to-b from-primary to-accent rounded-full" />
            <h2 className="text-2xl font-bold">Treinos Recentes</h2>
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
