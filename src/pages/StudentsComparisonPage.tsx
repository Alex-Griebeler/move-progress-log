import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStudents } from "@/hooks/useStudents";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, Users, TrendingUp, Calendar, Dumbbell, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { getWebPageSchema, getBreadcrumbSchema } from "@/utils/structuredData";

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
    loadDescription: string | null;
  }>;
}

const StudentsComparisonPage = () => {
  usePageTitle(NAV_LABELS.studentsComparison);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: `${NAV_LABELS.studentsComparison} · Fabrik Performance`,
    description: 'Comparação de métricas e desempenho entre alunos do sistema Fabrik Performance.',
    type: 'website',
    url: true,
  });
  
  const [searchParams] = useSearchParams();
  
  // Read query params and initialize state
  const initialStudents = searchParams.get('students')?.split(',').filter(Boolean) || [];
  const initialPrescription = searchParams.get('prescription') || 'all';
  const initialStartDateStr = searchParams.get('startDate');
  const initialEndDateStr = searchParams.get('endDate');
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>(initialStudents);
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDateStr ? new Date(initialStartDateStr) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialEndDateStr ? new Date(initialEndDateStr) : undefined
  );
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<string>(initialPrescription);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState<string>("");
  
  const { data: students, isLoading: studentsLoading } = useStudents();

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
    queryKey: ["students-comparison-stats", selectedStudents, startDate, endDate, selectedExercises, selectedPrescription],
    enabled: selectedStudents.length > 0,
    queryFn: async () => {
      const stats = await Promise.all(
        selectedStudents.map(async (studentId) => {
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

          let exercisesQuery = supabase
            .from("exercises")
            .select("load_kg, reps, session_id, exercise_name, load_description")
            .in("session_id", filteredSessions.map(s => s.id));

          if (selectedExercises.length > 0) {
            exercisesQuery = exercisesQuery.in("exercise_name", selectedExercises);
          }

          const { data: exercisesData } = await exercisesQuery;

          const exerciseDetails = await Promise.all(
            (exercisesData || []).map(async (exercise) => {
              const session = filteredSessions.find(s => s.id === exercise.session_id);
              
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
                loadDescription: exercise.load_description || null,
              };
            })
          );

          const totalVolume = exercisesData?.reduce((sum, ex) => {
            return sum + ((ex.load_kg || 0) * (ex.reps || 0));
          }, 0) || 0;

          const avgLoad = exercisesData && exercisesData.length > 0
            ? exercisesData.reduce((sum, ex) => sum + (ex.load_kg || 0), 0) / exercisesData.length
            : 0;

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

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students || [];
    return students?.filter((student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  }, [students, searchQuery]);

  const selectedStudentsData = useMemo(() => {
    return students?.filter((s) => selectedStudents.includes(s.id)) || [];
  }, [students, selectedStudents]);

  return (
    <PageLayout
      structuredData={[
        { data: getWebPageSchema(NAV_LABELS.studentsComparison, NAV_LABELS.subtitleComparison), id: "webpage-schema" },
        { data: getBreadcrumbSchema([{ label: "Home", href: "/" }, { label: NAV_LABELS.students, href: "/alunos" }, { label: NAV_LABELS.studentsComparison }]), id: "breadcrumb-schema" },
      ]}
    >
      <PageHeader
        title={NAV_LABELS.studentsComparison}
        description={NAV_LABELS.subtitleComparison}
        breadcrumbs={[
          { label: NAV_LABELS.students, href: "/alunos" },
          { label: NAV_LABELS.studentsComparison },
        ]}
        actions={
          <Link to="/alunos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        }
      />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {NAV_LABELS.sectionFilters}
            </CardTitle>
            <CardDescription>
              Refine a visualização dos dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Exercícios {selectedExercises.length > 0 && `(${selectedExercises.length}/10)`}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Dumbbell className="mr-2 h-4 w-4" />
                      {selectedExercises.length === 0
                        ? "Todos os exercícios"
                        : selectedExercises.length === 1
                        ? selectedExercises[0]
                        : `${selectedExercises.length} selecionados`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar exercício..."
                          value={exerciseSearchQuery}
                          onChange={(e) => setExerciseSearchQuery(e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-[280px]">
                      <div className="p-2 space-y-1">
                        {exercises
                          ?.filter((ex) =>
                            ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
                          )
                          .map((exercise) => (
                            <div
                              key={exercise.id}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
                            >
                              <Checkbox
                                checked={selectedExercises.includes(exercise.name)}
                                onCheckedChange={() => {
                                  setSelectedExercises((prev) => {
                                    if (prev.includes(exercise.name)) {
                                      return prev.filter((e) => e !== exercise.name);
                                    } else if (prev.length < 10) {
                                      return [...prev, exercise.name];
                                    }
                                    return prev;
                                  });
                                }}
                                disabled={
                                  !selectedExercises.includes(exercise.name) &&
                                  selectedExercises.length >= 10
                                }
                              />
                              <label className="flex-1 cursor-pointer text-sm">
                                {exercise.name}
                              </label>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                    {selectedExercises.length > 0 && (
                      <div className="p-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setSelectedExercises([])}
                        >
                          Limpar seleção
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

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

            {(startDate || endDate || selectedExercises.length > 0 || selectedPrescription !== "all") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setSelectedExercises([]);
                  setSelectedPrescription("all");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecionar Alunos</CardTitle>
              <CardDescription>
                {selectedStudents.length}/10 selecionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar aluno..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[560px] pr-4">
                {studentsLoading ? (
                  <LoadingSpinner size="sm" text="Carregando alunos..." />
                ) : (
                  <div className="space-y-3">
                    {filteredStudents?.map((student) => (
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
                           <LoadingSpinner size="sm" text="Carregando estatísticas..." />
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
                                        <TableHead>Descrição Carga</TableHead>
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
                                          <TableCell className="text-muted-foreground text-sm">
                                            {detail.loadDescription || "—"}
                                          </TableCell>
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
    </PageLayout>
  );
};

export default StudentsComparisonPage;
