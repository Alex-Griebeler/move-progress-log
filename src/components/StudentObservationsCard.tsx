import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Calendar, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildErrorDescription } from "@/utils/errorParsing";

interface StudentObservationsCardProps {
  studentId: string;
  /**
   * Seção clínica fixa do cadastro (PR-4: card clínico ÚNICO — antes eram
   * dois cards concorrentes na overview, um vazio em cima e um dismissível
   * pra sempre via localStorage embaixo). Opcional e retrocompatível.
   */
  limitations?: string | null;
  injuryHistory?: string | null;
}

export function StudentObservationsCard({
  studentId,
  limitations,
  injuryHistory,
}: StudentObservationsCardProps) {
  // Dismiss POR SESSÃO da seção fixa (state, nunca localStorage — segurança
  // clínica não pode sumir pra sempre num browser). Observações com resolve
  // continuam sempre visíveis.
  const [medicalSectionDismissed, setMedicalSectionDismissed] = useState(false);
  // Reset ao trocar de aluno — o dismiss não pode vazar entre fichas.
  useEffect(() => {
    setMedicalSectionDismissed(false);
  }, [studentId]);
  const hasMedicalSection =
    Boolean(limitations || injuryHistory) && !medicalSectionDismissed;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: observations, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-observations', studentId],
    enabled: !!studentId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_observations')
        .select('id, student_id, observation_text, categories, severity, created_at, is_resolved')
        .eq('student_id', studentId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const markAsResolvedMutation = useMutation({
    mutationFn: async (observationId: string) => {
      const { error } = await supabase
        .from('student_observations')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', observationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-observations', studentId] });
      toast({
        title: "Observação marcada como resolvida",
        description: "A observação foi arquivada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao resolver observação",
        description: buildErrorDescription(error, "Tente novamente."),
        variant: "destructive"
      });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'alta': return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      case 'média': return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      case 'baixa': return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      default: return 'bg-muted border-border';
    }
  };

  const getSeverityVariant = (severity: string): "destructive" | "default" | "secondary" => {
    switch (severity) {
      case 'alta': return 'destructive';
      case 'média': return 'default';
      case 'baixa': return 'secondary';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    return category.charAt(0).toUpperCase();
  };


  const medicalSection = hasMedicalSection ? (
    <div className="mb-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold">Limitações e histórico de lesões</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setMedicalSectionDismissed(true)}
          aria-label="Recolher nesta sessão"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {limitations && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
          <span className="font-medium">Limitações:</span> {limitations}
        </p>
      )}
      {injuryHistory && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
          <span className="font-medium">Lesões:</span> {injuryHistory}
        </p>
      )}
    </div>
  ) : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Observações Clínicas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {medicalSection}
          <p className="text-sm text-muted-foreground">Carregando observações...</p>
        </CardContent>
      </Card>
    );
  }

  // Erro NUNCA vira "nenhuma observação registrada" — falso negativo clínico:
  // o coach acharia que o aluno não tem restrição quando a query só falhou.
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Observações Clínicas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {medicalSection}
          <p className="text-sm text-destructive">
            Não foi possível carregar as observações clínicas.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Observações Clínicas Importantes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {medicalSection}
        {!observations || observations.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma observação registrada</p>
        ) : (
          <div className="space-y-sm">
            {observations.map(obs => (
              <div 
                key={obs.id} 
                className={`p-sm rounded-radius-md border ${getSeverityColor(obs.severity)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {obs.categories?.map((cat, idx) => (
                        <Badge 
                          key={idx}
                          variant={getSeverityVariant(obs.severity)}
                          className="text-xs"
                        >
                          <span className="mr-1">{getCategoryIcon(cat)}</span>
                          {cat}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="text-xs">
                        {obs.severity}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium break-words">{obs.observation_text}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(obs.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => markAsResolvedMutation.mutate(obs.id)}
                    disabled={markAsResolvedMutation.isPending}
                    className="shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
