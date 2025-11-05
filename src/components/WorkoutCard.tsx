import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, TrendingUp, FolderOpen, Lock } from "lucide-react";

interface WorkoutCardProps {
  name: string;
  exercises: number;
  date: string;
  totalVolume?: number;
  isFinalized?: boolean;
  canReopen?: boolean;
  onReopen?: () => void;
}

const WorkoutCard = ({ name, exercises, date, totalVolume, isFinalized, canReopen, onReopen }: WorkoutCardProps) => {
  const displayName = name?.trim() || 'Aluno Desconhecido';
  
  const getIntensityBadge = (volume: number | undefined) => {
    if (!volume) return null;
    if (volume >= 5000) return { label: 'Alta', variant: 'destructive' as const };
    if (volume >= 3000) return { label: 'Média', variant: 'default' as const };
    return { label: 'Leve', variant: 'secondary' as const };
  };

  const intensity = getIntensityBadge(totalVolume);
  
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50 backdrop-blur-sm group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <CardTitle className="text-lg">{displayName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{exercises} exercícios</span>
                {intensity && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <Badge variant={intensity.variant} className="text-xs h-5">
                      {intensity.label}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalVolume && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
            <span className="text-sm font-medium text-muted-foreground">Volume Total</span>
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="text-lg font-bold">{totalVolume.toLocaleString('pt-BR')}kg</span>
            </div>
          </div>
        )}
        
        {isFinalized && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Sessão Finalizada</span>
            </div>
            {canReopen && onReopen && (
              <Button 
                onClick={onReopen}
                variant="outline"
                size="sm"
                className="h-8 gap-2"
              >
                <FolderOpen className="h-3 w-3" />
                Reabrir
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkoutCard;
