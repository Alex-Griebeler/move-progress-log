import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/PageLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Trophy, Target, Calendar } from 'lucide-react';

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

  const { data: trends } = useQuery({
    queryKey: ['athlete-trends', studentId, days],
    enabled: !!studentId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('athlete_metric_trends').select('*')
        .eq('student_id', studentId).gte('date', since).order('date');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: records } = useQuery({
    queryKey: ['athlete-records', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_records').select('*')
        .eq('student_id', studentId).order('achieved_at', { ascending: false }).limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: goals } = useQuery({
    queryKey: ['athlete-goals', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_goals').select('*')
        .eq('student_id', studentId).eq('status', 'active');
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalVolume  = trends?.reduce((s, t) => s + ((t as any).total_volume_kg ?? 0), 0) ?? 0;
  const totalSessions = trends?.filter(t => ((t as any).exercise_count ?? 0) > 0).length ?? 0;
  const avgLoad      = trends?.length
    ? trends.reduce((s, t) => s + ((t as any).avg_load_kg ?? 0), 0) / trends.length : 0;

  return (
    <PageLayout>
      <PageHeader title='Insights do Atleta' subtitle='Performance, recordes e progressão de carga' />
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
                    {records.map((r: any) => (
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
                    {goals.map((g: any) => (
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
