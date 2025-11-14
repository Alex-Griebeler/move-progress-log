import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSessionDetail } from "@/hooks/useSessionDetail";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Users, Dumbbell, TrendingUp, User, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";

interface SessionDetailDialogProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReopenSession?: (sessionId: string) => void;
}

export const SessionDetailDialog = ({ 
  sessionId, 
  open, 
  onOpenChange,
  onReopenSession 
}: SessionDetailDialogProps) => {
  const navigate = useNavigate();
  const { data: session, isLoading, error } = useSessionDetail(sessionId);

  if (!open) return null;

  const handleGoToStudent = () => {
    if (session?.student.id) {
      onOpenChange(false);
      navigate(`/alunos/${session.student.id}`);
    }
  };

  const handleReopen = () => {
    if (sessionId && onReopenSession) {
      onReopenSession(sessionId);
      onOpenChange(false);
    }
  };

  const calculateTotalVolume = () => {
    if (!session?.exercises) return 0;
    return session.exercises.reduce((total, exercise) => {
      const load = exercise.load_kg || 0;
      const sets = exercise.sets || 0;
      const reps = exercise.reps || 0;
      return total + (load * sets * reps);
    }, 0);
  };

  const getIntensityBadge = (volume: number) => {
    if (volume > 5000) return { label: "Alta", variant: "destructive" as const };
    if (volume > 2000) return { label: "Moderada", variant: "default" as const };
    return { label: "Leve", variant: "secondary" as const };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading && (
          <div className="py-8">
            <LoadingState text="Carregando detalhes da sessão..." />
          </div>
        )}

        {error && (
          <div className="py-8">
            <ErrorState 
              title="Erro ao carregar sessão"
              description="Não foi possível carregar os detalhes desta sessão."
            />
          </div>
        )}

        {session && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session.student.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {session.student.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <DialogTitle className="text-2xl mb-2">
                    Sessão de {session.student.name}
                  </DialogTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={session.session_type === "individual" ? "default" : "secondary"}>
                      {session.session_type === "individual" ? "Individual" : "Grupo"}
                    </Badge>
                    <Badge variant={session.is_finalized ? "outline" : "default"}>
                      {session.is_finalized ? "Finalizada" : "Em andamento"}
                    </Badge>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {/* Informações Contextuais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações da Sessão
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {format(new Date(session.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="font-medium">{session.time}</p>
                    </div>
                  </div>
                  {session.trainer_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Treinador</p>
                        <p className="font-medium">{session.trainer_name}</p>
                      </div>
                    </div>
                  )}
                  {session.room_name && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Sala</p>
                        <p className="font-medium">{session.room_name}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Métricas Agregadas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-md bg-primary/10">
                        <Dumbbell className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Exercícios</p>
                        <p className="text-2xl font-bold">{session.exercises.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-md bg-secondary/10">
                        <TrendingUp className="h-6 w-6 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Volume Total</p>
                        <p className="text-2xl font-bold">{calculateTotalVolume().toFixed(0)} kg</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-md bg-accent/10">
                        <Award className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Intensidade</p>
                        <Badge {...getIntensityBadge(calculateTotalVolume())} className="mt-1">
                          {getIntensityBadge(calculateTotalVolume()).label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Exercícios */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Exercícios Realizados</CardTitle>
                </CardHeader>
                <CardContent>
                  {session.exercises.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum exercício registrado nesta sessão.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exercício</TableHead>
                            <TableHead className="text-center">Séries</TableHead>
                            <TableHead className="text-center">Reps</TableHead>
                            <TableHead className="text-center">Carga</TableHead>
                            <TableHead>Observações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {session.exercises.map((exercise) => (
                            <TableRow key={exercise.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {exercise.exercise_name}
                                  {exercise.is_best_set && (
                                    <Badge variant="secondary" className="text-xs">
                                      Best Set
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {exercise.sets || "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                {exercise.reps || "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                <div>
                                  <p className="font-medium">
                                    {exercise.load_kg ? `${exercise.load_kg} kg` : "-"}
                                  </p>
                                  {exercise.load_breakdown && (
                                    <p className="text-xs text-muted-foreground">
                                      {exercise.load_breakdown}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {exercise.observations ? (
                                  <p className="text-sm text-muted-foreground max-w-xs truncate">
                                    {exercise.observations}
                                  </p>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button variant="secondary" onClick={handleGoToStudent}>
                Ver Perfil do Aluno
              </Button>
              {session.is_finalized && session.can_reopen && onReopenSession && (
                <Button onClick={handleReopen}>
                  Reabrir Sessão
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
