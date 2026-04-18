import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { User, Users, MoreVertical, Eye, Edit, FolderOpen, FileText, Check } from "lucide-react";
import { memo, useState } from "react";
import { formatSessionDate } from "@/utils/sessionDate";

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
  onFinalize?: () => void;
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
  onFinalize,
  onClick 
}: WorkoutCardProps) => {
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  
  const displayName = name?.trim() || 'Aluno Desconhecido';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  const sessionTypeLabel = sessionType === 'group' ? 'Grupo' : 'Individual';

  const handleFinalizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFinalizeConfirm(true);
  };

  const handleConfirmFinalize = () => {
    setShowFinalizeConfirm(false);
    onFinalize?.();
  };
  
  return (
    <>
      <Card 
        className={`min-h-[120px] h-auto ${onClick ? 'card-interactive hover:shadow-premium' : ''} overflow-hidden transition-smooth`}
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
                    {formatSessionDate(date, "dd MMM")}
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
                  size="icon-sm"
                  className="shrink-0"
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
                    onClick?.();
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                
                {!isFinalized && onFinalize && (
                  <DropdownMenuItem onClick={handleFinalizeClick}>
                    <Check className="h-4 w-4 mr-2" />
                    Finalizar Sessão
                  </DropdownMenuItem>
                )}
                
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

      <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar esta sessão de <strong>{displayName}</strong>? 
              Após finalizar, você ainda poderá reabrir a sessão se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFinalize}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
