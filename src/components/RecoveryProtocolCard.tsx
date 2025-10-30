import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { RecoveryProtocol } from "@/hooks/useRecoveryProtocols";
import { useState } from "react";

interface RecoveryProtocolCardProps {
  protocol: RecoveryProtocol;
}

const RecoveryProtocolCard = ({ protocol }: RecoveryProtocolCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Termoterapia": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
      case "Respiração": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "Mindfulness": return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
      case "Atividade Leve": return "bg-green-500/10 text-green-700 dark:text-green-400";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const formatBenefits = (benefits: Record<string, string>) => {
    return Object.entries(benefits).map(([key, value]) => ({
      key: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: value === 'increase' ? '↑' : value === 'decrease' ? '↓' : value === 'improve' ? '⚡' : '✓'
    }));
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-xl">{protocol.name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getCategoryColor(protocol.category)}>
                {protocol.category}
              </Badge>
              {protocol.subcategory && (
                <Badge variant="outline">{protocol.subcategory}</Badge>
              )}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{protocol.duration_minutes} min</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Benefits */}
        <div>
          <p className="text-sm font-medium mb-2">Benefícios:</p>
          <div className="flex flex-wrap gap-2">
            {formatBenefits(protocol.benefits).map((benefit, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {benefit.value} {benefit.key}
              </Badge>
            ))}
          </div>
        </div>

        {/* Contraindications Warning */}
        {protocol.contraindications && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Contraindicações:</p>
              <p className="text-muted-foreground">{protocol.contraindications}</p>
            </div>
          </div>
        )}

        {/* Expandable Instructions */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full gap-2"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Ocultar Instruções" : "Ver Instruções Detalhadas"}
          </Button>

          {expanded && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Instruções:</p>
                <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-4 rounded-lg">
                  {protocol.instructions}
                </div>
              </div>

              {protocol.scientific_references && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <p className="text-sm font-medium">Referências Científicas:</p>
                  </div>
                  <p className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded-lg">
                    {protocol.scientific_references}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecoveryProtocolCard;
