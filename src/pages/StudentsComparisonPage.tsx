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
import { ArrowLeft, Users, TrendingUp, Calendar, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StudentStats {
  studentId: string;
  totalSessions: number;
  totalVolume: number;
  lastSessionDate: string | null;
  activePrescription: string | null;
  avgLoad: number;
}

const StudentsComparisonPage = () => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const { data: students, isLoading: studentsLoading } = useStudents();

  const { data: studentsStats, isLoading: statsLoading } = useQuery({
    queryKey: ["students-comparison-stats", selectedStudents],
    enabled: selectedStudents.length > 0,
    queryFn: async () => {
      const stats = await Promise.all(
        selectedStudents.map(async (studentId) => {
          // Get sessions count and stats
          const { data: sessions } = await supabase
            .from("workout_sessions")
            .select("id, date")
            .eq("student_id", studentId)
            .order("date", { ascending: false });

          // Get exercises and calculate total volume
          const { data: exercises } = await supabase
            .from("exercises")
            .select("load_kg, reps, session_id")
            .in("session_id", sessions?.map(s => s.id) || []);

          const totalVolume = exercises?.reduce((sum, ex) => {
            return sum + ((ex.load_kg || 0) * (ex.reps || 0));
          }, 0) || 0;

          const avgLoad = exercises && exercises.length > 0
            ? exercises.reduce((sum, ex) => sum + (ex.load_kg || 0), 0) / exercises.length
            : 0;

          // Get active prescription
          const { data: prescription } = await supabase
            .from("prescription_assignments")
            .select("prescription:workout_prescriptions(name)")
            .eq("student_id", studentId)
            .order("start_date", { ascending: false })
            .limit(1)
            .single();

          return {
            studentId,
            totalSessions: sessions?.length || 0,
            totalVolume: Math.round(totalVolume),
            lastSessionDate: sessions?.[0]?.date || null,
            activePrescription: prescription?.prescription?.name || null,
            avgLoad: Math.round(avgLoad * 10) / 10,
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {selectedStudentsData.map((student) => {
                  const stats = studentsStats?.find((s) => s.studentId === student.id);
                  return (
                    <Card key={student.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Users className="h-5 w-5 text-primary" />
                          {student.name}
                        </CardTitle>
                        <CardDescription className="space-y-1">
                          {student.birth_date && (
                            <div className="text-xs">
                              {new Date().getFullYear() - new Date(student.birth_date).getFullYear()} anos
                            </div>
                          )}
                          {student.fitness_level && (
                            <Badge variant="outline" className="text-xs">
                              {student.fitness_level}
                            </Badge>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {statsLoading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <Dumbbell className="h-5 w-5 text-primary" />
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Sessões</p>
                                <p className="text-lg font-bold">{stats?.totalSessions || 0}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <TrendingUp className="h-5 w-5 text-primary" />
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Volume Total</p>
                                <p className="text-lg font-bold">{stats?.totalVolume || 0} kg</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <TrendingUp className="h-5 w-5 text-primary" />
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Carga Média</p>
                                <p className="text-lg font-bold">{stats?.avgLoad || 0} kg</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <Calendar className="h-5 w-5 text-primary" />
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Última Sessão</p>
                                <p className="text-sm font-semibold">
                                  {stats?.lastSessionDate
                                    ? new Date(stats.lastSessionDate).toLocaleDateString('pt-BR')
                                    : "Nenhuma"}
                                </p>
                              </div>
                            </div>

                            {stats?.activePrescription && (
                              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Prescrição Ativa
                                </p>
                                <p className="text-sm font-semibold text-primary">
                                  {stats.activePrescription}
                                </p>
                              </div>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              asChild
                            >
                              <Link to={`/alunos/${student.id}`}>
                                Ver Detalhes Completos
                              </Link>
                            </Button>
                          </>
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
