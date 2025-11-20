import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionDetail } from "@/hooks/useSessionDetail";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Users, Dumbbell, TrendingUp, User, Award, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { useState, useMemo } from "react";

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
  
  console.log("SessionDetailDialog RENDER - sessionId:", sessionId, "open:", open);
  
  const { data: session, isLoading, error } = useSessionDetail(sessionId);
  
  console.log("SessionDetailDialog QUERY - session:", session, "isLoading:", isLoading, "error:", error);
  
  const [movementPatternFilter, setMovementPatternFilter] = useState<string>("all");
  const [intensityFilter, setIntensityFilter] = useState<string>("all");

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

  const getExerciseIntensity = (exercise: any) => {
    const volume = (exercise.load_kg || 0) * (exercise.sets || 0) * (exercise.reps || 0);
    if (volume > 500) return "alta";
    if (volume > 200) return "moderada";
    return "leve";
  };

  const filteredExercises = useMemo(() => {
    if (!session?.exercises) return [];
    
    let filtered = [...session.exercises];

    // Filtro por padrão de movimento (simulado - idealmente viria do banco)
    if (movementPatternFilter !== "all") {
      filtered = filtered.filter(ex => {
        const name = ex.exercise_name.toLowerCase();
        switch (movementPatternFilter) {
          case "empurrar": return name.includes("press") || name.includes("supino") || name.includes("development");
          case "puxar": return name.includes("pull") || name.includes("remada") || name.includes("barra fixa");
          case "agachar": return name.includes("squat") || name.includes("agachamento") || name.includes("leg press");
          case "rotacao": return name.includes("twist") || name.includes("rotação") || name.includes("chop");
          default: return true;
        }
      });
    }

    // Filtro por intensidade
    if (intensityFilter !== "all") {
      filtered = filtered.filter(ex => getExerciseIntensity(ex) === intensityFilter);
    }

    return filtered;
  }, [session?.exercises, movementPatternFilter, intensityFilter]);

  const movementPatterns = useMemo(() => {
    if (!session?.exercises) return [];
    const patterns = new Set<string>();
    session.exercises.forEach(ex => {
      const name = ex.exercise_name.toLowerCase();
      if (name.includes("press") || name.includes("supino") || name.includes("development")) patterns.add("empurrar");
      if (name.includes("pull") || name.includes("remada") || name.includes("barra fixa")) patterns.add("puxar");
      if (name.includes("squat") || name.includes("agachamento") || name.includes("leg press")) patterns.add("agachar");
      if (name.includes("twist") || name.includes("rotação") || name.includes("chop")) patterns.add("rotacao");
    });
    return Array.from(patterns);
  }, [session?.exercises]);

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

        {!isLoading && !error && !session && (
          <div className="py-8">
            <ErrorState
              title="Sessão não encontrada"
              description="Não foi possível encontrar os dados desta sessão. Tente novamente ou recarregue a página."
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Exercícios Realizados
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={movementPatternFilter} onValueChange={setMovementPatternFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Padrão de movimento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os padrões</SelectItem>
                          {movementPatterns.includes("empurrar") && <SelectItem value="empurrar">Empurrar</SelectItem>}
                          {movementPatterns.includes("puxar") && <SelectItem value="puxar">Puxar</SelectItem>}
                          {movementPatterns.includes("agachar") && <SelectItem value="agachar">Agachar</SelectItem>}
                          {movementPatterns.includes("rotacao") && <SelectItem value="rotacao">Rotação</SelectItem>}
                        </SelectContent>
                      </Select>
                      <Select value={intensityFilter} onValueChange={setIntensityFilter}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Intensidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="moderada">Moderada</SelectItem>
                          <SelectItem value="leve">Leve</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredExercises.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {session.exercises.length === 0 
                        ? "Nenhum exercício registrado nesta sessão."
                        : "Nenhum exercício corresponde aos filtros selecionados."}
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
                            <TableHead className="text-center">Intensidade</TableHead>
                            <TableHead>Observações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredExercises.map((exercise) => (
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
                              <TableCell className="text-center">
                                <Badge 
                                  variant={
                                    getExerciseIntensity(exercise) === "alta" ? "destructive" : 
                                    getExerciseIntensity(exercise) === "moderada" ? "default" : 
                                    "secondary"
                                  }
                                  className="capitalize"
                                >
                                  {getExerciseIntensity(exercise)}
                                </Badge>
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
