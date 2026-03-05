import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, User, Filter, Dumbbell, Upload, Info } from "lucide-react";
import WorkoutCard from "@/components/WorkoutCard";
import { WorkoutCardSkeleton } from "@/components/skeletons/WorkoutCardSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { NAV_LABELS } from "@/constants/navigation";
import { logger } from "@/utils/logger";
import AddWorkoutDialog from "@/components/AddWorkoutDialog";

interface RecentWorkoutsSectionProps {
  onSessionSelect: (sessionId: string) => void;
  onImportOpen: () => void;
  onWorkoutAdded: () => void;
}

export const RecentWorkoutsSection = ({ onSessionSelect, onImportOpen, onWorkoutAdded }: RecentWorkoutsSectionProps) => {
  const [sessionTypeFilter, setSessionTypeFilter] = useState<'all' | 'individual' | 'group'>('all');
  const { data: recentWorkouts, isLoading } = useWorkouts();
  const queryClient = useQueryClient();

  const handleReopenSession = async (sessionId: string) => {
    try {
      const { error } = await import("@/integrations/supabase/client").then(m =>
        m.supabase
          .from('workout_sessions')
          .update({ is_finalized: false })
          .eq('id', sessionId)
      );
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      notify.success("Sessão reaberta com sucesso", { description: "Agora você pode editar os dados da sessão novamente." });
    } catch (error) {
      logger.error('Erro ao reabrir sessão:', error);
      notify.error("Não foi possível reabrir a sessão", { description: error instanceof Error ? error.message : "Tente novamente ou contate o suporte." });
    }
  };

  const filteredWorkouts = recentWorkouts?.filter(workout => {
    if (sessionTypeFilter === 'all') return true;
    return workout.session_type === sessionTypeFilter;
  });

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-1 w-12 bg-primary rounded-full" />
        <h2 className="text-xl font-bold text-foreground">{NAV_LABELS.sectionRecentSessions}</h2>
      </div>

      {recentWorkouts && recentWorkouts.length > 0 && (
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por tipo:</span>
            </div>
            <div className="flex gap-2">
              <Button variant={sessionTypeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSessionTypeFilter('all')} className="gap-1.5" aria-label="Mostrar todas as sessões">
                Todas
                <Badge variant={sessionTypeFilter === 'all' ? 'secondary' : 'outline'} className="ml-1">{recentWorkouts.length}</Badge>
              </Button>
              <Button variant={sessionTypeFilter === 'individual' ? 'default' : 'outline'} size="sm" onClick={() => setSessionTypeFilter('individual')} className="gap-1.5" aria-label="Filtrar apenas sessões individuais">
                <User className="h-3.5 w-3.5" />
                Individual
                <Badge variant={sessionTypeFilter === 'individual' ? 'secondary' : 'outline'} className="ml-1">{recentWorkouts.filter(w => w.session_type === 'individual').length}</Badge>
              </Button>
              <Button variant={sessionTypeFilter === 'group' ? 'default' : 'outline'} size="sm" onClick={() => setSessionTypeFilter('group')} className="gap-1.5" aria-label="Filtrar apenas sessões em grupo">
                <Users className="h-3.5 w-3.5" />
                Grupo
                <Badge variant={sessionTypeFilter === 'group' ? 'secondary' : 'outline'} className="ml-1">{recentWorkouts.filter(w => w.session_type === 'group').length}</Badge>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
          </>
        ) : recentWorkouts && recentWorkouts.length > 0 ? (
          filteredWorkouts && filteredWorkouts.length > 0 ? (
            filteredWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                sessionId={workout.id}
                name={workout.student_name}
                avatarUrl={workout.avatar_url}
                exercises={workout.total_exercises}
                date={workout.date}
                sessionType={workout.session_type}
                totalVolume={workout.total_volume}
                hasImportantObservations={workout.has_important_observations}
                isFinalized={workout.is_finalized}
                canReopen={workout.can_reopen}
                onEdit={workout.is_finalized ? undefined : () => onSessionSelect(workout.id)}
                onReopen={workout.is_finalized && workout.can_reopen ? () => handleReopenSession(workout.id) : undefined}
                onClick={() => onSessionSelect(workout.id)}
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
                <Button variant="outline" onClick={() => setSessionTypeFilter('all')} className="gap-2 mt-4">
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
                <AddWorkoutDialog onWorkoutAdded={onWorkoutAdded} />
                <Button variant="outline" onClick={onImportOpen} className="gap-2" aria-label={NAV_LABELS.importExcel}>
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
  );
};
