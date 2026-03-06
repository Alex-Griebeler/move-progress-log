import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/PageLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, BarChart2, FileText, Send, Loader2 } from 'lucide-react';

type Tab = 'coach' | 'analyst' | 'report';
const BASE = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const authHdr = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return `Bearer ${session?.access_token}`;
};

export default function CoachConsole() {
  const [tab, setTab]             = useState<Tab>('coach');
  const [studentId, setStudentId] = useState('');
  const [question, setQuestion]   = useState('');
  const [coachOut, setCoachOut]   = useState('');
  const [analystOut, setAnalyst]  = useState('');
  const [reportOut, setReport]    = useState('');
  const [period, setPeriod]       = useState(30);
  const [dateFrom, setFrom]       = useState('');
  const [dateTo, setTo]           = useState('');

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const coachMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE()}/ai-coach`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: await authHdr() },
        body: JSON.stringify({ student_id: studentId, question }) });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Erro');
      return r.json();
    },
    onSuccess: d => setCoachOut(d.answer),
  });

  const analystMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE()}/ai-training-analyst`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: await authHdr() },
        body: JSON.stringify({ student_id: studentId, period_days: period }) });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Erro');
      return r.json();
    },
    onSuccess: d => setAnalyst(d.analysis),
  });

  const reportMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE()}/ai-report-generator`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: await authHdr() },
        body: JSON.stringify({ student_id: studentId, period_start: dateFrom, period_end: dateTo }) });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Erro');
      return r.json();
    },
    onSuccess: d => setReport(d.report),
  });

  const tabs: { id: Tab; label: string; icon: typeof Brain; color: string }[] = [
    { id: 'coach',   label: 'AI Coach',    icon: Brain,    color: 'text-purple-500' },
    { id: 'analyst', label: 'Analista',    icon: BarChart2, color: 'text-blue-500' },
    { id: 'report',  label: 'Relatório',   icon: FileText,  color: 'text-green-500' },
  ];

  const Output = ({ text, error }: { text: string; error?: Error | null }) => (
    <>
      {text  && <div className='p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm leading-relaxed'>{text}</div>}
      {error && <p className='text-destructive text-sm'>{error.message}</p>}
    </>
  );

  return (
    <PageLayout>
      <PageHeader title='Coach Console' description='Ferramentas de IA para análise e coaching de atletas' />
      <div className='p-6 space-y-6'>

        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger className='w-72'><SelectValue placeholder='Selecionar atleta' /></SelectTrigger>
          <SelectContent>{students?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>

        <div className='flex gap-2 border-b pb-1'>
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t text-sm font-medium transition-colors ${tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className={`h-4 w-4 ${t.color}`} />{t.label}
              </button>
            );
          })}
        </div>

        {tab === 'coach' && (
          <Card>
            <CardHeader><CardTitle className='flex items-center gap-2'><Brain className='h-5 w-5 text-purple-500' />AI Coach</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <Textarea placeholder='Pergunte sobre o atleta... ex: Como está a progressão de carga?' value={question} onChange={e => setQuestion(e.target.value)} rows={3} />
              <Button onClick={() => coachMut.mutate()} disabled={!studentId || !question || coachMut.isPending}>
                {coachMut.isPending ? <><Loader2 className='h-4 w-4 mr-2 animate-spin' />Analisando...</> : <><Send className='h-4 w-4 mr-2' />Perguntar ao Coach</>}
              </Button>
              <Output text={coachOut} error={coachMut.error as Error} />
            </CardContent>
          </Card>
        )}

        {tab === 'analyst' && (
          <Card>
            <CardHeader><CardTitle className='flex items-center gap-2'><BarChart2 className='h-5 w-5 text-blue-500' />Analista de Treinamento</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <Select value={String(period)} onValueChange={v => setPeriod(Number(v))}>
                <SelectTrigger className='w-36'><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='7'>7 dias</SelectItem>
                  <SelectItem value='30'>30 dias</SelectItem>
                  <SelectItem value='90'>90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => analystMut.mutate()} disabled={!studentId || analystMut.isPending}>
                {analystMut.isPending ? <><Loader2 className='h-4 w-4 mr-2 animate-spin' />Analisando...</> : <><BarChart2 className='h-4 w-4 mr-2' />Gerar Análise</>}
              </Button>
              <Output text={analystOut} error={analystMut.error as Error} />
            </CardContent>
          </Card>
        )}

        {tab === 'report' && (
          <Card>
            <CardHeader><CardTitle className='flex items-center gap-2'><FileText className='h-5 w-5 text-green-500' />Gerador de Relatórios</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex gap-4 flex-wrap items-end'>
                <div className='space-y-1'>
                  <label className='text-sm font-medium'>Início</label>
                  <input type='date' value={dateFrom} onChange={e => setFrom(e.target.value)}
                    className='flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm' />
                </div>
                <div className='space-y-1'>
                  <label className='text-sm font-medium'>Fim</label>
                  <input type='date' value={dateTo} onChange={e => setTo(e.target.value)}
                    className='flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm' />
                </div>
              </div>
              <Button onClick={() => reportMut.mutate()} disabled={!studentId || !dateFrom || !dateTo || reportMut.isPending}>
                {reportMut.isPending ? <><Loader2 className='h-4 w-4 mr-2 animate-spin' />Gerando...</> : <><FileText className='h-4 w-4 mr-2' />Gerar Relatório</>}
              </Button>
              <Output text={reportOut} error={reportMut.error as Error} />
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
