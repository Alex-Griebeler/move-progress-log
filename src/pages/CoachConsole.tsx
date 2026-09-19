import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/PageLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, BarChart2, FileText, Send, Loader2, ClipboardList } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Precision12Console } from '@/components/precision12/Precision12Console';

type Tab = 'coach' | 'analyst' | 'report' | 'precision12';

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
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const coachMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { student_id: studentId, question },
      });
      if (error) throw new Error(error.message ?? 'Erro');
      return data;
    },
    onSuccess: d => setCoachOut(d.answer),
  });

  const analystMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-training-analyst', {
        body: { student_id: studentId, period_days: period },
      });
      if (error) throw new Error(error.message ?? 'Erro');
      return data;
    },
    onSuccess: d => setAnalyst(d.analysis),
  });

  const reportMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-report-generator', {
        body: { student_id: studentId, period_start: dateFrom, period_end: dateTo },
      });
      if (error) throw new Error(error.message ?? 'Erro');
      return data;
    },
    onSuccess: d => setReport(d.report),
  });

  // Ícones em tom neutro: roxo/azul/verde/rosa não existem na paleta.
  const tabs: { id: Tab; label: string; icon: typeof Brain }[] = [
    { id: 'coach',       label: 'AI Coach',     icon: Brain },
    { id: 'analyst',     label: 'Analista',     icon: BarChart2 },
    { id: 'report',      label: 'Relatório',    icon: FileText },
    { id: 'precision12', label: 'Precision 12', icon: ClipboardList },
  ];

  // Resultado anunciado ao leitor de tela; erro sem mensagem técnica crua.
  const Output = ({ text, error }: { text: string; error?: Error | null }) => (
    <div aria-live='polite'>
      {text  && <div className='p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm leading-relaxed'>{text}</div>}
      {error && (
        <p role='alert' className='text-destructive text-sm'>
          Não foi possível gerar a resposta agora. Tente de novo em instantes.
        </p>
      )}
    </div>
  );

  return (
    <PageLayout>
      <PageHeader title='Coach Console' description='Ferramentas de IA para análise e coaching de atletas' />
      <div className='p-6 space-y-6'>

        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger className='w-full sm:w-72' aria-label='Atleta'><SelectValue placeholder='Selecionar atleta' /></SelectTrigger>
          <SelectContent>{students?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>

        {/* Abas com o primitive Radix (tablist/tab/tabpanel, aria-selected,
            setas do teclado) no lugar de botões soltos (UX-07 Codex). */}
        <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
          <TabsList className='flex h-auto w-full justify-start overflow-x-auto sm:w-auto'>
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.id} value={t.id} className='min-h-10 shrink-0 gap-2'>
                  <Icon className='h-4 w-4' aria-hidden />{t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value='coach'>
          <Card>
            <CardHeader><CardTitle className='flex items-center gap-2'><Brain className='h-5 w-5 text-primary' aria-hidden />AI Coach</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <Textarea placeholder='Pergunte sobre o atleta. Ex.: como está a progressão de carga?' aria-label='Pergunta para o AI Coach' value={question} onChange={e => setQuestion(e.target.value)} rows={3} />
              <Button onClick={() => coachMut.mutate()} disabled={!studentId || !question || coachMut.isPending}>
                {coachMut.isPending ? <><Loader2 className='h-4 w-4 mr-2 animate-spin' />Analisando…</> : <><Send className='h-4 w-4 mr-2' />Perguntar ao coach</>}
              </Button>
              <Output text={coachOut} error={coachMut.error as Error} />
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value='analyst'>
          <Card>
            <CardHeader><CardTitle className='flex items-center gap-2'><BarChart2 className='h-5 w-5 text-primary' aria-hidden />Analista de treinamento</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <Select value={String(period)} onValueChange={v => setPeriod(Number(v))}>
                <SelectTrigger className='w-36' aria-label='Período da análise'><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='7'>7 dias</SelectItem>
                  <SelectItem value='30'>30 dias</SelectItem>
                  <SelectItem value='90'>90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => analystMut.mutate()} disabled={!studentId || analystMut.isPending}>
                {analystMut.isPending ? <><Loader2 className='h-4 w-4 mr-2 animate-spin' />Analisando…</> : <><BarChart2 className='h-4 w-4 mr-2' />Gerar análise</>}
              </Button>
              <Output text={analystOut} error={analystMut.error as Error} />
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value='report'>
          <Card>
            <CardHeader><CardTitle className='flex items-center gap-2'><FileText className='h-5 w-5 text-primary' aria-hidden />Gerador de relatórios</CardTitle></CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex gap-4 flex-wrap items-end'>
                <div className='space-y-1'>
                  <Label htmlFor='date-from'>Início</Label>
                  <input id='date-from' type='date' value={dateFrom} onChange={e => setFrom(e.target.value)}
                    className='flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm' />
                </div>
                <div className='space-y-1'>
                  <Label htmlFor='date-to'>Fim</Label>
                  <input id='date-to' type='date' value={dateTo} onChange={e => setTo(e.target.value)}
                    className='flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm' />
                </div>
              </div>
              <Button onClick={() => reportMut.mutate()} disabled={!studentId || !dateFrom || !dateTo || reportMut.isPending}>
                {reportMut.isPending ? <><Loader2 className='h-4 w-4 mr-2 animate-spin' />Gerando…</> : <><FileText className='h-4 w-4 mr-2' />Gerar relatório</>}
              </Button>
              <Output text={reportOut} error={reportMut.error as Error} />
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value='precision12'>
            <Precision12Console />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
