import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentObservationsCardProps {
  studentId: string;
}

const STUDENT_OBSERVATION_COLUMNS = `
  id,
  observation_text,
  categories,
  severity,
  created_at
`;

export function StudentObservationsCard({ studentId }: StudentObservationsCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: observations, isLoading } = useQuery({
    queryKey: ['student-observations', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_observations')
        .select(STUDENT_OBSERVATION_COLUMNS)
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
        description: error.message,
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
          <p className="text-sm text-muted-foreground">Carregando observações...</p>
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
