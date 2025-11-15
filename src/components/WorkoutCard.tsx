import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, TrendingUp, FolderOpen, Lock, Edit, User, Users, Eye } from "lucide-react";
import { memo } from "react";

interface WorkoutCardProps {
  name: string;
  exercises: number;
  date: string;
  sessionType?: 'individual' | 'group';
  totalVolume?: number;
  isFinalized?: boolean;
  canReopen?: boolean;
  onReopen?: () => void;
  onEdit?: () => void;
  sessionId?: string;
  onClick?: () => void;
}

const WorkoutCard = memo(({ 
  name, 
  exercises, 
  date, 
  sessionType, 
  totalVolume, 
  isFinalized, 
  canReopen, 
  onReopen, 
  onEdit, 
  onClick 
}: WorkoutCardProps) => {
  const displayName = name?.trim() || 'Aluno Desconhecido';
  
  const getIntensityBadge = (volume: number | undefined) => {
    if (!volume) return null;
    if (volume >= 5000) return { label: 'Alta', variant: 'destructive' as const };
    if (volume >= 3000) return { label: 'Média', variant: 'default' as const };
    return { label: 'Leve', variant: 'secondary' as const };
  };

  const intensity = getIntensityBadge(totalVolume);
  
  const getSessionTypeBadge = () => {
    if (!sessionType) return null;
    if (sessionType === 'group') {
      return { icon: Users, label: 'Grupo', variant: 'default' as const };
    }
    return { icon: User, label: 'Individual', variant: 'secondary' as const };
  };

  const sessionTypeBadge = getSessionTypeBadge();
  
  return (
    <Card 
      className={`animate-fade-in ${onClick ? 'card-interactive' : ''} card-glass-hover group`}
      onClick={onClick}
    >
      <CardHeader className="pb-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-sm">
            <div className="p-xs rounded-md gradient-card-emphasis group-hover:opacity-90 transition-smooth">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <CardTitle className="text-lg">{displayName}</CardTitle>
              <div className="flex items-center gap-xs mt-xs flex-wrap">
                <span className="text-xs text-muted-foreground">{exercises} exercícios</span>
                {sessionTypeBadge && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <Badge variant={sessionTypeBadge.variant} className="text-xs h-5 gap-xs">
                      <sessionTypeBadge.icon className="h-3 w-3" />
                      {sessionTypeBadge.label}
                    </Badge>
                  </>
                )}
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
      <CardContent className="space-y-sm">
        {totalVolume && (
          <div className="flex items-center justify-between p-sm rounded-md gradient-card-subtle border border-primary/10">
            <span className="text-sm font-medium text-muted-foreground">Volume Total</span>
            <div className="flex items-center gap-xs text-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="text-lg font-bold">{totalVolume.toLocaleString('pt-BR')}kg</span>
            </div>
          </div>
        )}
        
        {isFinalized && (
          <div className="flex items-center justify-between pt-xs border-t border-border">
            <div className="flex items-center gap-xs text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Sessão finalizada</span>
            </div>
            <div className="flex gap-xs">
              {canReopen && onReopen && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReopen();
                  }}
                  aria-label="Reabrir sessão finalizada"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Reabrir
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // View details (handled by card onClick)
                }}
                aria-label="Ver detalhes da sessão"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Button>
            </div>
          </div>
        )}

        {!isFinalized && onEdit && (
          <div className="flex justify-end pt-2 border-t border-border">
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label="Editar sessão de treino"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.name === nextProps.name &&
    prevProps.exercises === nextProps.exercises &&
    prevProps.date === nextProps.date &&
    prevProps.sessionType === nextProps.sessionType &&
    prevProps.totalVolume === nextProps.totalVolume &&
    prevProps.isFinalized === nextProps.isFinalized &&
    prevProps.canReopen === nextProps.canReopen &&
    prevProps.sessionId === nextProps.sessionId
  );
});

WorkoutCard.displayName = 'WorkoutCard';

export default WorkoutCard;
