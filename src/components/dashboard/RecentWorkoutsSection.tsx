import { useState } from "react";
import { Calendar, Users, User, Dumbbell, Upload } from "lucide-react";
import WorkoutCard from "@/components/WorkoutCard";
import { WorkoutCardSkeleton } from "@/components/skeletons/WorkoutCardSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Badge } from "@/components/ui/badge";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { NAV_LABELS } from "@/constants/navigation";
import { logger } from "@/utils/logger";
import { buildErrorDescription } from "@/utils/errorParsing";
import AddWorkoutDialog from "@/components/AddWorkoutDialog";

interface RecentWorkoutsSectionProps {
  onSessionSelect: (sessionId: string) => void;
  onImportOpen: () => void;
  onWorkoutAdded: () => void;
}

export const RecentWorkoutsSection = ({ onSessionSelect, onImportOpen, onWorkoutAdded }: RecentWorkoutsSectionProps) => {
  const [sessionTypeFilter, setSessionTypeFilter] = useState<'all' | 'individual' | 'group'>('all');
  const { data: recentWorkouts, isLoading, isError, refetch } = useWorkouts();
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
    } catch (error: unknown) {
      logger.error('Erro ao reabrir sessão:', error);
      notify.error("Não foi possível reabrir a sessão", { description: buildErrorDescription(error) || "Tente novamente ou contate o suporte." });
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
        <h2 className="text-xl font-semibold text-foreground">{NAV_LABELS.sectionRecentSessions}</h2>
      </div>

      {/* UX 18/09 (ux_03 UX-17): filtro que quebra linha a 375px, alvos de
          40px, sem rótulo "Filtrar por tipo:" (os próprios botões dizem). */}
      {!isError && recentWorkouts && recentWorkouts.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar sessões por tipo">
          <Button variant={sessionTypeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSessionTypeFilter('all')} className="min-h-10 gap-1.5" aria-pressed={sessionTypeFilter === 'all'}>
            Todas
            <Badge variant={sessionTypeFilter === 'all' ? 'secondary' : 'outline'} className="ml-1">{recentWorkouts.length}</Badge>
          </Button>
          <Button variant={sessionTypeFilter === 'individual' ? 'default' : 'outline'} size="sm" onClick={() => setSessionTypeFilter('individual')} className="min-h-10 gap-1.5" aria-pressed={sessionTypeFilter === 'individual'}>
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            Individual
            <Badge variant={sessionTypeFilter === 'individual' ? 'secondary' : 'outline'} className="ml-1">{recentWorkouts.filter(w => w.session_type === 'individual').length}</Badge>
          </Button>
          <Button variant={sessionTypeFilter === 'group' ? 'default' : 'outline'} size="sm" onClick={() => setSessionTypeFilter('group')} className="min-h-10 gap-1.5" aria-pressed={sessionTypeFilter === 'group'}>
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Grupo
            <Badge variant={sessionTypeFilter === 'group' ? 'secondary' : 'outline'} className="ml-1">{recentWorkouts.filter(w => w.session_type === 'group').length}</Badge>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
          </>
        ) : isError ? (
          // Erro de rede nunca vira "nenhuma sessão".
          <Card className="col-span-full">
            <ErrorState
              title="Não foi possível carregar as sessões recentes"
              description="Verifique a conexão e tente novamente."
              onRetry={() => void refetch()}
            />
          </Card>
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
              <EmptyState
                icon={<Calendar className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
                title={`Nenhuma sessão ${sessionTypeFilter === 'individual' ? 'individual' : 'em grupo'} recente`}
                description=""
                primaryAction={{ label: "Ver todas as sessões", onClick: () => setSessionTypeFilter('all') }}
              />
            </Card>
          )
        ) : (
          <Card className="border-dashed col-span-full">
            <EmptyState
              icon={<Dumbbell className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
              title="Nenhuma sessão registrada"
              description="Registre a primeira sessão ou importe o histórico."
            />
            <div className="flex flex-wrap justify-center gap-3 pb-8">
              <AddWorkoutDialog onWorkoutAdded={onWorkoutAdded} />
              <Button variant="outline" onClick={onImportOpen} className="gap-2">
                <Upload className="h-4 w-4" aria-hidden="true" />
                {NAV_LABELS.importExcel}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
};
