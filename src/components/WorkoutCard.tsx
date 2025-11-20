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
  hasImportantObservations?: boolean;
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
  hasImportantObservations,
  isFinalized,
  canReopen, 
  onReopen, 
  onEdit, 
  onClick 
}: WorkoutCardProps) => {
  const displayName = name?.trim() || 'Aluno Desconhecido';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  const sessionTypeIcon = sessionType === 'group' ? Users : User;
  const sessionTypeLabel = sessionType === 'group' ? 'Grupo' : 'Individual';
  
  return (
    <Card 
      className={`h-[140px] ${onClick ? 'card-interactive hover:shadow-premium' : ''} overflow-hidden transition-smooth`}
      onClick={onClick}
    >
      <CardHeader className="h-full flex flex-col justify-between p-lg pb-sm">
        <div className="flex items-start justify-between gap-sm">
          <div className="flex items-center gap-sm flex-1 min-w-0">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-foreground text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col gap-xs flex-1 min-w-0">
              <span className="text-lg font-semibold truncate">{displayName}</span>
              
              <div className="flex items-center gap-xs overflow-hidden">
                {sessionType && (
                  <Badge variant="outline" className="text-xs capitalize shrink-0 opacity-70 gap-xs">
                    {sessionType === 'group' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {sessionTypeLabel}
                  </Badge>
                )}
                
                <Badge variant="outline" className="text-xs capitalize shrink-0 opacity-70">
                  {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Badge>
                
                {hasImportantObservations && (
                  <Badge variant="outline" className="text-xs capitalize shrink-0 opacity-70 gap-xs">
                    <FileText className="h-3 w-3" />
                    Observações
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Menu de ações da sessão"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
                  console.log("MENU VER DETALHES CLICADO");
                  if (onClick) {
                    onClick();
                  } else {
                    console.error("onClick não está definido no WorkoutCard");
                  }
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
    prevProps.hasImportantObservations === nextProps.hasImportantObservations &&
    prevProps.isFinalized === nextProps.isFinalized &&
    prevProps.canReopen === nextProps.canReopen &&
    prevProps.sessionId === nextProps.sessionId
  );
});

WorkoutCard.displayName = 'WorkoutCard';

export default WorkoutCard;
