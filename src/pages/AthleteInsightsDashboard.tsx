import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/PageLayout';
import { PageHeader } from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Trophy, Target, Calendar } from 'lucide-react';
import { logger } from '@/utils/logger';

interface MetricTrend {
  date: string;
  total_volume_kg?: number;
  exercise_count?: number;
  avg_load_kg?: number;
}

interface AthleteRecord {
  id: string;
  exercise_name: string;
  metric: string;
  value: number;
  achieved_at: string;
  record_type?: string;
}

interface AthleteGoal {
  id: string;
  title: string;
  target?: string;
  progress: number;
  status: string;
  description?: string;
  target_value?: number;
  target_unit?: string;
  target_date?: string;
}

interface WorkoutSessionRow {
  id: string;
  date: string;
}

interface ExerciseRow {
  session_id: string;
  exercise_name: string;
  load_kg: number | null;
  reps: number | null;
  sets: number | null;
}

interface ReportGoalRow {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  adherence_percentage: number | null;
  sessions_proposed: number | null;
  attention_points: string | null;
}

const formatDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AthleteInsightsDashboard() {
  const [studentId, setStudentId] = useState('');
  const [days, setDays] = useState(30);

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: trends, isError: trendsError } = useQuery<MetricTrend[]>({
    queryKey: ['athlete-trends', studentId, days],
    enabled: !!studentId,
    queryFn: async () => {
      const since = formatDateInput(new Date(Date.now() - days * 86_400_000));
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, date')
        .eq('student_id', studentId)
        .gte('date', since)
        .order('date', { ascending: false });
      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return [];

      const typedSessions = sessions as WorkoutSessionRow[];
      const sessionIds = typedSessions.map((session) => session.id);
      const sessionDateById = new Map(typedSessions.map((session) => [session.id, session.date]));

      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('session_id, exercise_name, load_kg, reps, sets')
        .in('session_id', sessionIds);
      if (exercisesError) throw exercisesError;

      const byDate = new Map<string, { totalVolume: number; exerciseCount: number; totalLoad: number; loadCount: number }>();
      for (const exercise of (exercises || []) as ExerciseRow[]) {
        const date = sessionDateById.get(exercise.session_id);
        if (!date) continue;
        const current = byDate.get(date) || { totalVolume: 0, exerciseCount: 0, totalLoad: 0, loadCount: 0 };
        current.exerciseCount += 1;
        if (exercise.load_kg !== null) {
          const reps = exercise.reps ?? 1;
          const sets = exercise.sets ?? 1;
          current.totalVolume += exercise.load_kg * reps * sets;
          current.totalLoad += exercise.load_kg;
          current.loadCount += 1;
        }
        byDate.set(date, current);
      }

      return Array.from(byDate.entries())
        .map(([date, values]) => ({
          date,
          total_volume_kg: Math.round(values.totalVolume * 10) / 10,
          exercise_count: values.exerciseCount,
          avg_load_kg: values.loadCount > 0 ? Math.round((values.totalLoad / values.loadCount) * 10) / 10 : 0,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    },
  });

  const { data: records } = useQuery<AthleteRecord[]>({
    queryKey: ['athlete-records', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, date')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return [];

      const typedSessions = sessions as WorkoutSessionRow[];
      const sessionIds = typedSessions.map((session) => session.id);
      const sessionDateById = new Map(typedSessions.map((session) => [session.id, session.date]));

      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('session_id, exercise_name, load_kg, reps, sets')
        .in('session_id', sessionIds);
      if (exercisesError) throw exercisesError;

      const byExercise = new Map<
        string,
        { maxLoad: number; maxLoadDate: string; maxVolume: number; maxVolumeDate: string }
      >();

      for (const exercise of (exercises || []) as ExerciseRow[]) {
        if (exercise.load_kg === null) continue;
        const exerciseName = exercise.exercise_name;
        const sessionDate = sessionDateById.get(exercise.session_id) || '';
        const reps = exercise.reps ?? 1;
        const sets = exercise.sets ?? 1;
        const volume = exercise.load_kg * reps * sets;
        const current = byExercise.get(exerciseName) || {
          maxLoad: -1,
          maxLoadDate: '',
          maxVolume: -1,
          maxVolumeDate: '',
        };

        if (exercise.load_kg > current.maxLoad) {
          current.maxLoad = exercise.load_kg;
          current.maxLoadDate = sessionDate;
        }
        if (volume > current.maxVolume) {
          current.maxVolume = volume;
          current.maxVolumeDate = sessionDate;
        }
        byExercise.set(exerciseName, current);
      }

      const result: AthleteRecord[] = [];
      for (const [exerciseName, values] of byExercise.entries()) {
        if (values.maxLoad >= 0) {
          result.push({
            id: `${exerciseName}-max_load`,
            exercise_name: exerciseName,
            metric: 'max_load',
            record_type: 'max_load',
            value: Math.round(values.maxLoad * 10) / 10,
            achieved_at: values.maxLoadDate,
          });
        }
        if (values.maxVolume >= 0) {
          result.push({
            id: `${exerciseName}-max_volume`,
            exercise_name: exerciseName,
            metric: 'max_volume',
            record_type: 'max_volume',
            value: Math.round(values.maxVolume * 10) / 10,
            achieved_at: values.maxVolumeDate,
          });
        }
      }

      return result.sort((a, b) => b.value - a.value).slice(0, 15);
    },
  });

  const { data: goals } = useQuery<AthleteGoal[]>({
    queryKey: ['athlete-goals', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_reports')
        .select('id, period_start, period_end, status, adherence_percentage, sessions_proposed, attention_points')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('period_end', { ascending: false })
        .limit(5);

      if (error) {
        logger.warn('AthleteInsights goals fallback failed', error);
        return [];
      }

      return ((data || []) as ReportGoalRow[]).map((report) => ({
        id: report.id,
        title: `Plano ${report.period_start} - ${report.period_end}`,
        target: 'Adesão ao plano semanal',
        progress: report.adherence_percentage || 0,
        status: report.status,
        description: report.attention_points || undefined,
        target_value: report.sessions_proposed || undefined,
        target_unit: report.sessions_proposed ? 'sessões' : undefined,
        target_date: report.period_end,
      }));
    },
  });

  const totalVolume  = trends?.reduce((s, t) => s + (t.total_volume_kg ?? 0), 0) ?? 0;
  const totalSessions = trends?.filter(t => (t.exercise_count ?? 0) > 0).length ?? 0;
  const avgLoad      = trends?.length
    ? trends.reduce((s, t) => s + (t.avg_load_kg ?? 0), 0) / trends.length : 0;

  return (
    <PageLayout>
      <PageHeader title='Insights do Atleta' description='Performance, recordes e progressão de carga' />
      <div className='p-6 space-y-6'>

        <div className='flex gap-3 flex-wrap'>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className='w-64'><SelectValue placeholder='Selecionar atleta' /></SelectTrigger>
            <SelectContent>{students?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
            <SelectTrigger className='w-36'><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value='7'>7 dias</SelectItem>
              <SelectItem value='30'>30 dias</SelectItem>
              <SelectItem value='90'>90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {trendsError && (
          <p className='text-destructive text-sm'>Erro ao carregar dados do atleta. Tente novamente.</p>
        )}

        {studentId ? (
          <>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <StatCard title='Volume Total'  value={`${totalVolume.toFixed(0)} kg`}  icon={TrendingUp} />
              <StatCard title='Sessões'       value={String(totalSessions)}            icon={Calendar} />
              <StatCard title='Carga Média'   value={`${avgLoad.toFixed(1)} kg`}       icon={TrendingUp} />
              <StatCard title='Recordes'      value={String(records?.length ?? 0)}     icon={Trophy} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Trophy className='h-5 w-5 text-yellow-500' /> Recordes Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent>
                {records?.length ? (
                  <div className='space-y-2'>
                    {records.map((r) => (
                      <div key={r.id} className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'>
                        <div>
                          <span className='font-medium'>{r.exercise_name}</span>
                          <Badge variant='secondary' className='ml-2 text-xs'>
                            {r.record_type === 'max_load' ? 'Carga Máx' : 'Volume Máx'}
                          </Badge>
                        </div>
                        <div className='text-right text-sm'>
                          <div className='font-semibold'>{r.value} {r.record_type === 'max_load' ? 'kg' : 'kg·reps'}</div>
                          <div className='text-muted-foreground text-xs'>{r.achieved_at}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className='text-muted-foreground text-sm'>Nenhum recorde registrado.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Target className='h-5 w-5 text-blue-500' /> Metas Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {goals?.length ? (
                  <div className='space-y-2'>
                    {goals.map((g) => (
                      <div key={g.id} className='flex items-center justify-between p-3 border rounded-lg'>
                        <div>
                          <span className='font-medium'>{g.title}</span>
                          {g.description && <p className='text-sm text-muted-foreground mt-0.5'>{g.description}</p>}
                        </div>
                        <div className='text-right text-sm'>
                          {g.target_value && <div className='font-semibold'>{g.target_value} {g.target_unit}</div>}
                          {g.target_date  && <div className='text-muted-foreground text-xs'>{g.target_date}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className='text-muted-foreground text-sm'>Nenhuma meta ativa.</p>}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className='flex items-center justify-center h-48 border rounded-lg border-dashed'>
            <p className='text-muted-foreground'>Selecione um atleta para ver os insights.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
