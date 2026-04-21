import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { 
  useProtocolRecommendations, 
  useGenerateRecommendations,
  useUpdateRecommendation 
} from "@/hooks/useProtocolRecommendations";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { format } from "date-fns";

interface ProtocolRecommendationsCardProps {
  studentId: string;
}

const ProtocolRecommendationsCard = ({ studentId }: ProtocolRecommendationsCardProps) => {
  const { data: recommendations, isLoading } = useProtocolRecommendations(studentId);
  const generateMutation = useGenerateRecommendations();
  const updateMutation = useUpdateRecommendation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleGenerate = () => {
    generateMutation.mutate(studentId);
  };

  const handleToggleApplied = (id: string, currentApplied: boolean) => {
    updateMutation.mutate({ id, applied: !currentApplied });
  };

  const handleSaveNotes = (id: string) => {
    updateMutation.mutate({ id, trainer_notes: notes[id] || "" });
    setExpandedId(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high": return "Alta";
      case "medium": return "Média";
      case "low": return "Baixa";
      default: return priority;
    }
  };

  const todayDate = format(new Date(), "yyyy-MM-dd");
  const todayRecommendations =
    recommendations?.filter((r) => r.recommended_date === todayDate) || [];

  return (
    <Card className="rounded-lg">
      <CardHeader className="p-lg space-y-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Recomendações de Recuperação</CardTitle>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            size="sm"
            className="gap-sm"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar Recomendações
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-lg pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : todayRecommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Nenhuma recomendação disponível para hoje.
            </p>
            <p className="text-xs mt-1">
              Clique em "Gerar Recomendações" para analisar os dados do Oura Ring.
            </p>
          </div>
        ) : (
          <div className="space-y-md">
            {todayRecommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className={`border rounded-lg p-md transition-all ${
                  recommendation.applied ? 'bg-muted/30 border-muted' : 'bg-card border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-md">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{recommendation.protocol.name}</h4>
                      <Badge variant={getPriorityColor(recommendation.priority)} className="text-xs">
                        {getPriorityLabel(recommendation.priority)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {recommendation.protocol.category}
                      </Badge>
                      {recommendation.protocol.subcategory && (
                        <Badge variant="outline" className="text-xs">
                          {recommendation.protocol.subcategory}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{recommendation.protocol.duration_minutes} minutos</span>
                    </div>

                    <p className="text-sm text-muted-foreground">{recommendation.reason}</p>

                    {expandedId === recommendation.id && (
                      <div className="mt-3 space-y-3">
                        <div className="text-sm">
                          <p className="font-medium mb-1">Instruções:</p>
                          <p className="whitespace-pre-line text-muted-foreground">
                            {recommendation.protocol.instructions}
                          </p>
                        </div>

                        {recommendation.protocol.contraindications && (
                          <div className="text-sm">
                            <p className="font-medium mb-1 text-destructive">Contraindicações:</p>
                            <p className="text-muted-foreground">
                              {recommendation.protocol.contraindications}
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Notas do Treinador:</label>
                          <Textarea
                            value={notes[recommendation.id] || recommendation.trainer_notes || ""}
                            onChange={(e) => setNotes({ ...notes, [recommendation.id]: e.target.value })}
                            placeholder="Adicione observações sobre esta recomendação..."
                            rows={3}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(recommendation.id)}
                            disabled={updateMutation.isPending}
                          >
                            Salvar Notas
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={recommendation.applied ? "secondary" : "default"}
                      onClick={() => handleToggleApplied(recommendation.id, recommendation.applied)}
                      disabled={updateMutation.isPending}
                      className="gap-2"
                    >
                      {recommendation.applied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Seguiu ✓
                        </>
                      ) : (
                        "Seguiu?"
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedId(expandedId === recommendation.id ? null : recommendation.id)}
                    >
                      {expandedId === recommendation.id ? "Recolher" : "Ver Detalhes"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProtocolRecommendationsCard;
