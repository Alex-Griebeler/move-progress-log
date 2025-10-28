import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useStudents } from "@/hooks/useStudents";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/AppHeader";
import { ArrowLeft, Users, TrendingUp, Calendar, Dumbbell, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentStats {
  studentId: string;
  totalSessions: number;
  totalVolume: number;
  lastSessionDate: string | null;
  activePrescription: string | null;
  avgLoad: number;
  exerciseDetails: Array<{
    exerciseName: string;
    load: number;
    reps: number;
    date: string;
    prescription: string | null;
  }>;
}

const StudentsComparisonPage = () => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedExercise, setSelectedExercise] = useState<string>("all");
  const [selectedPrescription, setSelectedPrescription] = useState<string>("all");
  
  const { data: students, isLoading: studentsLoading } = useStudents();

  // Fetch available exercises
  const { data: exercises } = useQuery({
    queryKey: ["exercises-library"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises_library")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  // Fetch available prescriptions
  const { data: prescriptions } = useQuery({
    queryKey: ["prescriptions-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_prescriptions")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  const { data: studentsStats, isLoading: statsLoading } = useQuery({
    queryKey: ["students-comparison-stats", selectedStudents, startDate, endDate, selectedExercise, selectedPrescription],
    enabled: selectedStudents.length > 0,
    queryFn: async () => {
      const stats = await Promise.all(
        selectedStudents.map(async (studentId) => {
          // Build sessions query with filters
          let sessionsQuery = supabase
            .from("workout_sessions")
            .select("id, date")
            .eq("student_id", studentId);

          if (startDate) {
            sessionsQuery = sessionsQuery.gte("date", format(startDate, "yyyy-MM-dd"));
          }
          if (endDate) {
            sessionsQuery = sessionsQuery.lte("date", format(endDate, "yyyy-MM-dd"));
          }

          const { data: sessions } = await sessionsQuery.order("date", { ascending: false });

          // Filter by prescription if selected
          let filteredSessions = sessions || [];
          if (selectedPrescription !== "all") {
            const { data: assignments } = await supabase
              .from("prescription_assignments")
              .select("start_date, end_date")
              .eq("student_id", studentId)
              .eq("prescription_id", selectedPrescription);

            if (assignments && assignments.length > 0) {
              filteredSessions = filteredSessions.filter((session) => {
                return assignments.some((assignment) => {
                  const sessionDate = new Date(session.date);
                  const startDate = new Date(assignment.start_date);
                  const endDate = assignment.end_date ? new Date(assignment.end_date) : new Date();
                  return sessionDate >= startDate && sessionDate <= endDate;
                });
              });
            }
          }

          if (filteredSessions.length === 0) {
            return {
              studentId,
              totalSessions: 0,
              totalVolume: 0,
              lastSessionDate: null,
              activePrescription: null,
              avgLoad: 0,
              exerciseDetails: [],
            } as StudentStats;
          }

          // Build exercises query with filters and get detailed info
          let exercisesQuery = supabase
            .from("exercises")
            .select("load_kg, reps, session_id, exercise_name")
            .in("session_id", filteredSessions.map(s => s.id));

          if (selectedExercise !== "all") {
            exercisesQuery = exercisesQuery.eq("exercise_name", selectedExercise);
          }

          const { data: exercisesData } = await exercisesQuery;

          // Get prescription for each session to build detailed view
          const exerciseDetails = await Promise.all(
            (exercisesData || []).map(async (exercise) => {
              const session = filteredSessions.find(s => s.id === exercise.session_id);
              
              // Get prescription assignment for this session
              const { data: assignment } = await supabase
                .from("prescription_assignments")
                .select("prescription:workout_prescriptions(name)")
                .eq("student_id", studentId)
                .lte("start_date", session?.date || "")
                .or(`end_date.gte.${session?.date},end_date.is.null`)
                .maybeSingle();

              return {
                exerciseName: exercise.exercise_name,
                load: exercise.load_kg || 0,
                reps: exercise.reps || 0,
                date: session?.date || "",
                prescription: assignment?.prescription?.name || "Sem prescrição",
              };
            })
          );

          const totalVolume = exercisesData?.reduce((sum, ex) => {
            return sum + ((ex.load_kg || 0) * (ex.reps || 0));
          }, 0) || 0;

          const avgLoad = exercisesData && exercisesData.length > 0
            ? exercisesData.reduce((sum, ex) => sum + (ex.load_kg || 0), 0) / exercisesData.length
            : 0;

          // Get active prescription
          const { data: prescription } = await supabase
            .from("prescription_assignments")
            .select("prescription:workout_prescriptions(name)")
            .eq("student_id", studentId)
            .order("start_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            studentId,
            totalSessions: filteredSessions.length,
            totalVolume: Math.round(totalVolume),
            lastSessionDate: filteredSessions[0]?.date || null,
            activePrescription: prescription?.prescription?.name || null,
            avgLoad: Math.round(avgLoad * 10) / 10,
            exerciseDetails: exerciseDetails.sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            ),
          } as StudentStats;
        })
      );
      return stats;
    },
  });

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else if (prev.length < 10) {
        return [...prev, studentId];
      }
      return prev;
    });
  };

  const selectedStudentsData = useMemo(() => {
    return students?.filter((s) => selectedStudents.includes(s.id)) || [];
  }, [students, selectedStudents]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <AppHeader
          title="Comparação de Alunos"
          subtitle="Visualize e compare dados de até 10 alunos simultaneamente"
          actions={
            <Link to="/alunos">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          }
        />

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Refine a visualização dos dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Exercise Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Exercício</label>
                <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os exercícios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os exercícios</SelectItem>
                    {exercises?.map((exercise) => (
                      <SelectItem key={exercise.id} value={exercise.name}>
                        {exercise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prescription Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Prescrição</label>
                <Select value={selectedPrescription} onValueChange={setSelectedPrescription}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as prescrições" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as prescrições</SelectItem>
                    {prescriptions?.map((prescription) => (
                      <SelectItem key={prescription.id} value={prescription.id}>
                        {prescription.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(startDate || endDate || selectedExercise !== "all" || selectedPrescription !== "all") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setSelectedExercise("all");
                  setSelectedPrescription("all");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar - Student Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecionar Alunos</CardTitle>
              <CardDescription>
                {selectedStudents.length}/10 selecionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {studentsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-5 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {students?.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => handleStudentToggle(student.id)}
                          disabled={
                            !selectedStudents.includes(student.id) &&
                            selectedStudents.length >= 10
                          }
                        />
                        <label className="flex-1 cursor-pointer text-sm">
                          {student.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Main Content - Comparison View */}
          <div>
            {selectedStudents.length === 0 ? (
              <Card className="h-full">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <Users className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-xl font-semibold text-muted-foreground mb-2">
                    Nenhum aluno selecionado
                  </p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Selecione até 10 alunos na lista ao lado para visualizar e comparar seus dados
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedStudentsData.map((student) => {
                  const stats = studentsStats?.find((s) => s.studentId === student.id);
                  return (
                    <Card key={student.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">{student.name}</CardTitle>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/alunos/${student.id}`}>Ver Perfil</Link>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {statsLoading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-32 w-full" />
                          </div>
                        ) : (
                          <Tabs defaultValue="summary" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="summary">Resumo</TabsTrigger>
                              <TabsTrigger value="details">Detalhes</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="summary" className="space-y-3 mt-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                  <Dumbbell className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Sessões</p>
                                    <p className="text-lg font-bold">{stats?.totalSessions || 0}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                  <TrendingUp className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Volume Total</p>
                                    <p className="text-lg font-bold">{stats?.totalVolume || 0} kg</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                  <TrendingUp className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Carga Média</p>
                                    <p className="text-lg font-bold">{stats?.avgLoad || 0} kg</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                  <Calendar className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Última Sessão</p>
                                    <p className="text-sm font-semibold">
                                      {stats?.lastSessionDate
                                        ? new Date(stats.lastSessionDate).toLocaleDateString('pt-BR')
                                        : "Nenhuma"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {stats?.activePrescription && (
                                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                  <p className="text-xs text-muted-foreground mb-1">Prescrição Ativa</p>
                                  <p className="text-sm font-semibold text-primary">
                                    {stats.activePrescription}
                                  </p>
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="details" className="mt-4">
                              {stats?.exerciseDetails && stats.exerciseDetails.length > 0 ? (
                                <div className="rounded-md border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Exercício</TableHead>
                                        <TableHead>Carga</TableHead>
                                        <TableHead>Reps</TableHead>
                                        <TableHead>Treino</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {stats.exerciseDetails.map((detail, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="font-medium">
                                            {new Date(detail.date).toLocaleDateString('pt-BR')}
                                          </TableCell>
                                          <TableCell>{detail.exerciseName}</TableCell>
                                          <TableCell>{detail.load} kg</TableCell>
                                          <TableCell>{detail.reps}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline">{detail.prescription}</Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  Nenhum dado disponível com os filtros selecionados
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentsComparisonPage;
