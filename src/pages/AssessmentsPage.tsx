import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardCheck,
  Plus, 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  Search,
  MoreVertical,
  Eye,
  Play,
  CheckCircle,
  Archive,
  FileText,
  User as UserIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useAssessments, 
  useCreateAssessment, 
  useStartAssessment,
  useCompleteAssessment,
  useUpdateAssessment,
  useDeleteAssessment,
  AssessmentStatus 
} from "@/hooks/useAssessments";
import { useStudents } from "@/hooks/useStudents";
import EmptyState from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<AssessmentStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof FileText }> = {
  draft: { label: "Rascunho", variant: "secondary", icon: FileText },
  in_progress: { label: "Em andamento", variant: "default", icon: Play },
  completed: { label: "Concluída", variant: "outline", icon: CheckCircle },
  archived: { label: "Arquivada", variant: "destructive", icon: Archive },
};

export default function AssessmentsPage() {
  const navigate = useNavigate();
  // Filters state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | "all">("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAssessmentStudentId, setNewAssessmentStudentId] = useState("");
  const [newAssessmentNotes, setNewAssessmentNotes] = useState("");

  // Data queries
  const { data: students } = useStudents();
  const { data: assessments, isLoading, error, refetch } = useAssessments({
    status: statusFilter !== "all" ? statusFilter : undefined,
    studentId: selectedStudentIds.length === 1 ? selectedStudentIds[0] : undefined,
  });

  // Mutations
  const createMutation = useCreateAssessment();
  const startMutation = useStartAssessment();
  const completeMutation = useCompleteAssessment();
  const updateMutation = useUpdateAssessment();
  const deleteMutation = useDeleteAssessment();

  // Filter student list based on search
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!studentSearchTerm) return students;
    return students.filter(s => 
      s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
    );
  }, [students, studentSearchTerm]);

  // Filter assessments by date range (client-side)
  const filteredAssessments = useMemo(() => {
    if (!assessments) return [];
    
    let result = assessments;

    // Filter by multiple students
    if (selectedStudentIds.length > 1) {
      result = result.filter(a => selectedStudentIds.includes(a.student_id));
    }

    // Filter by date range
    if (startDate) {
      result = result.filter(a => new Date(a.created_at) >= startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(a => new Date(a.created_at) <= endOfDay);
    }

    return result;
  }, [assessments, selectedStudentIds, startDate, endDate]);

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedStudentIds([]);
    setStatusFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = 
    selectedStudentIds.length > 0 ||
    statusFilter !== "all" ||
    startDate ||
    endDate;

  const handleCreateAssessment = async () => {
    if (!newAssessmentStudentId) return;
    
    await createMutation.mutateAsync({
      student_id: newAssessmentStudentId,
      notes: newAssessmentNotes || undefined,
    });

    setCreateDialogOpen(false);
    setNewAssessmentStudentId("");
    setNewAssessmentNotes("");
  };

  const handleStartAssessment = async (id: string) => {
    await startMutation.mutateAsync(id);
  };

  const handleCompleteAssessment = async (id: string) => {
    await completeMutation.mutateAsync(id);
  };

  const handleArchiveAssessment = async (id: string) => {
    await updateMutation.mutateAsync({ id, status: 'archived' });
  };

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState text="Carregando avaliações..." />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <ErrorState 
          title="Erro ao carregar avaliações" 
          description={error.message}
          onRetry={refetch}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Avaliações"
        description="Gerencie avaliações funcionais dos seus alunos"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Avaliação
          </Button>
        }
      />

      <div className="space-y-lg">
        {/* Filters Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {[
                    selectedStudentIds.length > 0 && `${selectedStudentIds.length} aluno(s)`,
                    statusFilter !== "all" && STATUS_CONFIG[statusFilter].label,
                    (startDate || endDate) && "data",
                  ].filter(Boolean).join(", ")}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              {filtersOpen ? "Ocultar" : "Mostrar"}
            </Button>
          </CardHeader>
          
          {filtersOpen && (
            <CardContent className="space-y-md">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
                {/* Student Filter */}
                <div className="space-y-2">
                  <Label>Alunos</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <UserIcon className="h-4 w-4 mr-2" />
                        {selectedStudentIds.length > 0 
                          ? `${selectedStudentIds.length} selecionado(s)`
                          : "Selecionar alunos"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-3">
                        <Input
                          placeholder="Buscar aluno..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                          className="mb-2"
                        />
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {filteredStudents?.map((student) => (
                            <div key={student.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`student-${student.id}`}
                                checked={selectedStudentIds.includes(student.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedStudentIds([...selectedStudentIds, student.id]);
                                  } else {
                                    setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`student-${student.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {student.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <RadioGroup 
                    value={statusFilter} 
                    onValueChange={(v) => setStatusFilter(v as any)}
                    className="flex flex-wrap gap-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="all" id="status-all" />
                      <Label htmlFor="status-all" className="cursor-pointer text-sm">Todos</Label>
                    </div>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <div key={key} className="flex items-center space-x-1">
                        <RadioGroupItem value={key} id={`status-${key}`} />
                        <Label htmlFor={`status-${key}`} className="cursor-pointer text-sm">{config.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-md border-t">
                <Button variant="outline" onClick={handleClearFilters} disabled={!hasActiveFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredAssessments.length} {filteredAssessments.length === 1 ? "avaliação encontrada" : "avaliações encontradas"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAssessments.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="h-8 w-8 text-muted-foreground" />}
                title="Nenhuma avaliação encontrada"
                description={hasActiveFilters 
                  ? "Tente ajustar os filtros para encontrar avaliações."
                  : "Comece criando a primeira avaliação funcional."}
                primaryAction={{
                  label: "Nova Avaliação",
                  onClick: () => setCreateDialogOpen(true),
                }}
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead>Iniciada em</TableHead>
                      <TableHead>Concluída em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssessments.map((assessment) => {
                      const statusConfig = STATUS_CONFIG[assessment.status];
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <TableRow key={assessment.id}>
                          <TableCell className="font-medium">
                            {assessment.student_name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(assessment.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {assessment.started_at 
                              ? format(new Date(assessment.started_at), "dd/MM/yyyy", { locale: ptBR })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {assessment.completed_at 
                              ? format(new Date(assessment.completed_at), "dd/MM/yyyy", { locale: ptBR })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/avaliacoes/${assessment.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                {assessment.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleStartAssessment(assessment.id)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Iniciar avaliação
                                  </DropdownMenuItem>
                                )}
                                {assessment.status === 'in_progress' && (
                                  <DropdownMenuItem onClick={() => handleCompleteAssessment(assessment.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Concluir avaliação
                                  </DropdownMenuItem>
                                )}
                                {assessment.status !== 'archived' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleArchiveAssessment(assessment.id)}
                                    className="text-destructive"
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Arquivar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Assessment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Avaliação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student">Aluno *</Label>
              <Select value={newAssessmentStudentId} onValueChange={setNewAssessmentStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  {students?.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações iniciais</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre a avaliação..."
                value={newAssessmentNotes}
                onChange={(e) => setNewAssessmentNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAssessment} 
              disabled={!newAssessmentStudentId || createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Avaliação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
