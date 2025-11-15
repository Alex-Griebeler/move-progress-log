import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, Users, MoreVertical, Eye, Edit, FolderOpen, FileText } from "lucide-react";
import { memo } from "react";

interface WorkoutCardProps {
  name: string;
  avatarUrl?: string;
  exercises: number;
  date: string;
  sessionType?: 'individual' | 'group';
  totalVolume?: number;
  hasObservations?: boolean;
  isFinalized?: boolean;
  canReopen?: boolean;
  onReopen?: () => void;
  onEdit?: () => void;
  sessionId?: string;
  onClick?: () => void;
}

const WorkoutCard = memo(({ 
  name, 
  avatarUrl,
  exercises, 
  date, 
  sessionType, 
  totalVolume, 
  hasObservations,
  isFinalized, 
  canReopen, 
  onReopen, 
  onEdit, 
  onClick 
}: WorkoutCardProps) => {
  const displayName = name?.trim() || 'Aluno Desconhecido';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
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
      <CardHeader className="space-y-md pb-sm">
        <div className="flex items-start justify-between gap-sm">
          <div className="flex items-center gap-sm flex-1 min-w-0">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-foreground text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col gap-xs flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{displayName}</CardTitle>
              
              <div className="flex items-center gap-xs flex-wrap">
                {sessionTypeBadge && (
                  <Badge variant={sessionTypeBadge.variant} className="text-xs h-5 gap-xs">
                    <sessionTypeBadge.icon className="h-3 w-3" />
                    {sessionTypeBadge.label}
                  </Badge>
                )}
                
                <Badge variant="secondary" className="text-xs h-5">
                  {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Badge>
                
                {hasObservations && (
                  <Badge variant="outline" className="text-xs h-5 gap-xs border-amber-500/50 text-amber-700 dark:text-amber-400">
                    <FileText className="h-3 w-3" />
                    Possui Observações
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="outline" 
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Menu de ações da sessão"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Informações</DropdownMenuLabel>
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {exercises} exercícios • {totalVolume?.toLocaleString('pt-BR')}kg
              </div>
              
              <DropdownMenuSeparator />
              
              {!isFinalized && onEdit && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Sessão
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              
              {isFinalized && canReopen && onReopen && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onReopen();
                  }}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Reabrir Sessão
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
    </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.name === nextProps.name &&
    prevProps.avatarUrl === nextProps.avatarUrl &&
    prevProps.exercises === nextProps.exercises &&
    prevProps.date === nextProps.date &&
    prevProps.sessionType === nextProps.sessionType &&
    prevProps.totalVolume === nextProps.totalVolume &&
    prevProps.hasObservations === nextProps.hasObservations &&
    prevProps.isFinalized === nextProps.isFinalized &&
    prevProps.canReopen === nextProps.canReopen &&
    prevProps.sessionId === nextProps.sessionId
  );
});

WorkoutCard.displayName = 'WorkoutCard';

export default WorkoutCard;
