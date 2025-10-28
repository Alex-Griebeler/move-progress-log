import { useParams, useNavigate } from "react-router-dom";
import { useStudents } from "@/hooks/useStudents";
import { useStudentPrescriptions, useSessionsWithExercises } from "@/hooks/useStudentDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Activity, FileText, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WorkoutCard from "@/components/WorkoutCard";
import ExerciseHistoryCard from "@/components/ExerciseHistoryCard";
import TrainingZonesCard from "@/components/TrainingZonesCard";
import { useState } from "react";

const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: sessions, isLoading: loadingSessions } = useSessionsWithExercises(id!);
  const { data: assignments, isLoading: loadingAssignments } = useStudentPrescriptions(id!);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const student = students?.find((s) => s.id === id);

  if (loadingStudents) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Aluno não encontrado</h2>
          <Button onClick={() => navigate("/alunos")}>Voltar</Button>
        </div>
      </div>
    );
  }

  // Get unique exercises from all sessions
  const uniqueExercises = Array.from(
    new Set(
      sessions?.flatMap((session) => 
        session.exercises?.map((ex) => ex.exercise_name) || []
      ) || []
    )
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/alunos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{student.name}</h1>
          <p className="text-muted-foreground">
            {student.birth_date && `Nascimento: ${new Date(student.birth_date).toLocaleDateString('pt-BR')}`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="exercises">Exercícios</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescrições</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {student.fitness_level && (
                  <div>
                    <span className="font-semibold">Nível:</span>{" "}
                    <Badge variant="secondary">{student.fitness_level}</Badge>
                  </div>
                )}
                {student.objectives && (
                  <div>
                    <span className="font-semibold">Objetivos:</span>
                    <p className="text-muted-foreground mt-1">{student.objectives}</p>
                  </div>
                )}
                {student.injury_history && (
                  <div>
                    <span className="font-semibold">Histórico de Lesões:</span>
                    <p className="text-red-500 mt-1">{student.injury_history}</p>
                  </div>
                )}
                {student.limitations && (
                  <div>
                    <span className="font-semibold">Limitações:</span>
                    <p className="text-muted-foreground mt-1">{student.limitations}</p>
                  </div>
                )}
                {student.preferences && (
                  <div>
                    <span className="font-semibold">Preferências:</span>
                    <p className="text-muted-foreground mt-1">{student.preferences}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de Sessões</span>
                  <span className="text-2xl font-bold">{sessions?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Prescrições Ativas</span>
                  <span className="text-2xl font-bold">{assignments?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Exercícios Únicos</span>
                  <span className="text-2xl font-bold">{uniqueExercises.length}</span>
                </div>
                {student.weekly_sessions_proposed && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sessões/Semana</span>
                    <span className="text-2xl font-bold">{student.weekly_sessions_proposed}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <TrainingZonesCard maxHeartRate={student.max_heart_rate} />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {loadingSessions ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => {
                const totalVolume = session.exercises?.reduce((sum, ex) => {
                  const volume = ex.reps && ex.load_kg 
                    ? ex.reps * ex.load_kg 
                    : 0;
                  return sum + volume;
                }, 0) || 0;

                return (
                  <WorkoutCard
                    key={session.id}
                    name={`Treino - ${session.time}`}
                    exercises={session.exercises?.length || 0}
                    date={session.date}
                    totalVolume={totalVolume}
                  />
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma sessão registrada ainda</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exercises" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Selecione um exercício para ver o histórico:</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueExercises.map((exercise) => (
                <Button
                  key={exercise}
                  variant={selectedExercise === exercise ? "default" : "outline"}
                  onClick={() => setSelectedExercise(exercise)}
                >
                  {exercise}
                </Button>
              ))}
            </div>
          </div>

          {selectedExercise ? (
            <ExerciseHistoryCard studentId={id!} exerciseName={selectedExercise} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Selecione um exercício acima para ver o histórico</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4">
          {loadingAssignments ? (
            <Skeleton className="h-32" />
          ) : assignments && assignments.length > 0 ? (
            <div className="grid gap-4">
              {assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{assignment.prescription?.name}</CardTitle>
                        {assignment.prescription?.objective && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {assignment.prescription.objective}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {new Date(assignment.start_date).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {assignment.custom_adaptations && (
                      <div className="mb-2">
                        <span className="font-semibold text-sm">Adaptações:</span>
                        <p className="text-sm text-muted-foreground">
                          {JSON.stringify(assignment.custom_adaptations)}
                        </p>
                      </div>
                    )}
                    {assignment.end_date && (
                      <div className="text-sm text-muted-foreground">
                        Término: {new Date(assignment.end_date).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma prescrição atribuída</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentDetailPage;
