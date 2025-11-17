import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, BookOpen, ChevronDown, ChevronUp, Info } from "lucide-react";
import { RecoveryProtocol } from "@/hooks/useRecoveryProtocols";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <Card className="hover:shadow-premium transition-smooth rounded-lg">
      <CardHeader className="space-y-sm">
        <div className="flex items-start justify-between gap-md">
          <div className="space-y-sm flex-1">
            <CardTitle className="text-xl">{protocol.name}</CardTitle>
            <div className="flex items-center gap-sm flex-wrap">
              <Badge className={getCategoryColor(protocol.category)}>
                {protocol.category}
              </Badge>
              {protocol.subcategory && (
                <Badge variant="outline">{protocol.subcategory}</Badge>
              )}
              <div className="flex items-center gap-xs text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{protocol.duration_minutes} min</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-md">
        {/* Benefits */}
        <div>
          <p className="text-base font-medium mb-sm">Benefícios:</p>
          <div className="flex flex-wrap gap-sm">
            {formatBenefits(protocol.benefits).map((benefit, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {benefit.value} {benefit.key}
              </Badge>
            ))}
          </div>
        </div>

        {/* Contraindications Warning */}
        {protocol.contraindications && (
          <div className="flex items-start gap-sm p-sm bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-xs mb-xs">
                <p className="text-xs font-medium text-destructive">Contraindicações</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-destructive/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">Situações onde este protocolo não deve ser aplicado</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{protocol.contraindications}</p>
            </div>
          </div>
        )}

        {/* Expandable Instructions */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full gap-sm"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Ocultar Instruções" : "Ver Instruções Detalhadas"}
          </Button>

          {expanded && (
            <div className="mt-md space-y-md">
              <div className="space-y-sm">
                <p className="text-base font-medium">Instruções:</p>
                <div className="text-base text-muted-foreground whitespace-pre-line bg-muted/50 p-md rounded-lg leading-relaxed">
                  {protocol.instructions}
                </div>
              </div>

              {protocol.scientific_references && (
                <div className="space-y-sm">
                  <div className="flex items-center gap-sm">
                    <BookOpen className="h-4 w-4" />
                    <p className="text-base font-medium">Referências Científicas:</p>
                  </div>
                  <p className="text-sm text-muted-foreground italic bg-muted/30 p-sm rounded-lg leading-relaxed">
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
