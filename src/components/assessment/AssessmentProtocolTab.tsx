import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Trash2, Dumbbell, Play, ChevronDown, ChevronUp } from "lucide-react";
import { useAssessmentProtocols, useCreateAssessmentProtocol, useUpdateAssessmentProtocol, useDeleteAssessmentProtocol, PriorityLevel } from "@/hooks/useAssessmentProtocols";
import { useAssessmentExercises, FabrikPhase } from "@/hooks/useAssessmentExercises";
import { useFunctionalFindings } from "@/hooks/useFunctionalFindings";
import { LoadingState } from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AssessmentProtocolTabProps {
  assessmentId: string;
  canEdit: boolean;
}

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; color: string }> = {
  critical: { label: "Crítica", color: "bg-red-500/20 text-red-700" },
  high: { label: "Alta", color: "bg-orange-500/20 text-orange-700" },
  medium: { label: "Média", color: "bg-yellow-500/20 text-yellow-700" },
  low: { label: "Baixa", color: "bg-blue-500/20 text-blue-700" },
  maintenance: { label: "Manutenção", color: "bg-green-500/20 text-green-700" },
};

const PHASE_CONFIG: Record<FabrikPhase, { label: string; order: number }> = {
  mobility: { label: "Mobilidade", order: 1 },
  inhibition: { label: "Inibição", order: 2 },
  activation: { label: "Ativação", order: 3 },
  stability: { label: "Estabilidade", order: 4 },
  strength: { label: "Força", order: 5 },
  integration: { label: "Integração", order: 6 },
};

export function AssessmentProtocolTab({ assessmentId, canEdit }: AssessmentProtocolTabProps) {
  const { data: protocols, isLoading: protocolsLoading } = useAssessmentProtocols(assessmentId);
  const { data: exercises, isLoading: exercisesLoading } = useAssessmentExercises();
  const { data: findings } = useFunctionalFindings(assessmentId);
  
  const createMutation = useCreateAssessmentProtocol();
  const updateMutation = useUpdateAssessmentProtocol();
  const deleteMutation = useDeleteAssessmentProtocol();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<any>(null);
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    name: "",
    priority_level: "medium" as PriorityLevel,
    phase: 1,
    frequency_per_week: 3,
    duration_weeks: 4,
    selected_exercises: [] as Array<{
      exercise_id: string;
      sets: number;
      reps: string;
      notes: string;
    }>,
  });

  // Group exercises by phase
  const exercisesByPhase = useMemo(() => {
    if (!exercises) return {};
    return exercises.reduce((acc, ex) => {
      if (!acc[ex.fabrik_phase]) acc[ex.fabrik_phase] = [];
      acc[ex.fabrik_phase].push(ex);
      return acc;
    }, {} as Record<FabrikPhase, typeof exercises>);
  }, [exercises]);

  const openNewProtocol = () => {
    setEditingProtocol(null);
    setFormData({
      name: "",
      priority_level: "medium",
      phase: 1,
      frequency_per_week: 3,
      duration_weeks: 4,
      selected_exercises: [],
    });
    setDialogOpen(true);
  };

  const openEditProtocol = (protocol: any) => {
    setEditingProtocol(protocol);
    setFormData({
      name: protocol.name || "",
      priority_level: protocol.priority_level,
      phase: protocol.phase || 1,
      frequency_per_week: protocol.frequency_per_week || 3,
      duration_weeks: protocol.duration_weeks || 4,
      selected_exercises: protocol.exercises || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      name: formData.name || `Protocolo Fase ${formData.phase}`,
      priority_level: formData.priority_level,
      phase: formData.phase,
      frequency_per_week: formData.frequency_per_week,
      duration_weeks: formData.duration_weeks,
      exercises: formData.selected_exercises,
    };

    if (editingProtocol) {
      await updateMutation.mutateAsync({ id: editingProtocol.id, ...data });
    } else {
      await createMutation.mutateAsync({ assessment_id: assessmentId, ...data });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este protocolo?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const toggleExercise = (exerciseId: string, exerciseName: string) => {
    const exists = formData.selected_exercises.find(e => e.exercise_id === exerciseId);
    if (exists) {
      setFormData({
        ...formData,
        selected_exercises: formData.selected_exercises.filter(e => e.exercise_id !== exerciseId),
      });
    } else {
      setFormData({
        ...formData,
        selected_exercises: [
          ...formData.selected_exercises,
          { exercise_id: exerciseId, sets: 3, reps: "10-12", notes: "" },
        ],
      });
    }
  };

  const updateExerciseConfig = (exerciseId: string, field: string, value: any) => {
    setFormData({
      ...formData,
      selected_exercises: formData.selected_exercises.map(e =>
        e.exercise_id === exerciseId ? { ...e, [field]: value } : e
      ),
    });
  };

  const toggleProtocolExpanded = (id: string) => {
    const newExpanded = new Set(expandedProtocols);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedProtocols(newExpanded);
  };

  if (protocolsLoading || exercisesLoading) {
    return <LoadingState text="Carregando protocolos..." />;
  }

  return (
    <div className="space-y-lg">
      {/* Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Protocolos de Exercícios</CardTitle>
            <CardDescription>
              {protocols?.length || 0} protocolo(s) baseado(s) em {findings?.length || 0} achado(s) funcional(is)
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={openNewProtocol} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Protocolo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {protocols?.length === 0 ? (
            <EmptyState
              icon={<Dumbbell className="h-8 w-8 text-muted-foreground" />}
              title="Nenhum protocolo criado"
              description="Crie protocolos de exercícios baseados nos achados funcionais identificados."
              primaryAction={canEdit ? {
                label: "Criar Protocolo",
                onClick: openNewProtocol,
              } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {protocols?.map((protocol) => {
                const priorityConfig = PRIORITY_CONFIG[protocol.priority_level];
                const isExpanded = expandedProtocols.has(protocol.id);

                return (
                  <Collapsible key={protocol.id} open={isExpanded}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleProtocolExpanded(protocol.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                              <Dumbbell className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {protocol.name || `Protocolo Fase ${protocol.phase}`}
                                </span>
                                <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
                                <Badge variant="outline">Fase {protocol.phase}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {protocol.frequency_per_week}x/semana • {protocol.duration_weeks} semanas • 
                                {protocol.exercises?.length || 0} exercícios
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-32">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Progresso</span>
                                <span>{protocol.completion_percentage || 0}%</span>
                              </div>
                              <Progress value={protocol.completion_percentage || 0} />
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t">
                          <div className="pt-4 space-y-3">
                            <h4 className="font-medium text-sm">Exercícios do Protocolo</h4>
                            {protocol.exercises?.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Nenhum exercício adicionado</p>
                            ) : (
                              <div className="grid gap-2">
                                {protocol.exercises?.map((ex: any, index: number) => {
                                  const exerciseData = exercises?.find(e => e.id === ex.exercise_id);
                                  return (
                                    <div 
                                      key={ex.exercise_id || index} 
                                      className="flex items-center justify-between p-2 bg-muted/30 rounded"
                                    >
                                      <div>
                                        <span className="font-medium text-sm">
                                          {exerciseData?.name || "Exercício não encontrado"}
                                        </span>
                                        {exerciseData && (
                                          <span className="text-xs text-muted-foreground ml-2">
                                            {PHASE_CONFIG[exerciseData.fabrik_phase]?.label}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-sm text-muted-foreground">
                                        {ex.sets}x{ex.reps}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex gap-2 pt-2">
                              <Button variant="outline" size="sm" onClick={() => openEditProtocol(protocol)}>
                                Editar
                              </Button>
                              {canEdit && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDelete(protocol.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Excluir
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocol Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProtocol ? "Editar Protocolo" : "Novo Protocolo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-md">
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-2">
                <Label>Nome do Protocolo</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!canEdit}
                  placeholder="Ex: Correção Postural - Ombro"
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select 
                  value={formData.priority_level} 
                  onValueChange={(v) => setFormData({ ...formData, priority_level: v as PriorityLevel })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_CONFIG) as PriorityLevel[]).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_CONFIG[priority].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-md">
              <div className="space-y-2">
                <Label>Fase</Label>
                <Select 
                  value={formData.phase.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, phase: parseInt(v) })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((phase) => (
                      <SelectItem key={phase} value={phase.toString()}>
                        Fase {phase}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência (x/semana)</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={formData.frequency_per_week}
                  onChange={(e) => setFormData({ ...formData, frequency_per_week: parseInt(e.target.value) || 3 })}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (semanas)</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={formData.duration_weeks}
                  onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) || 4 })}
                  disabled={!canEdit}
                />
              </div>
            </div>

            {/* Exercise Selection */}
            <div className="space-y-3">
              <Label>Exercícios ({formData.selected_exercises.length} selecionado(s))</Label>
              
              {(Object.keys(PHASE_CONFIG) as FabrikPhase[])
                .sort((a, b) => PHASE_CONFIG[a].order - PHASE_CONFIG[b].order)
                .map((phase) => {
                  const phaseExercises = exercisesByPhase[phase] || [];
                  if (phaseExercises.length === 0) return null;

                  return (
                    <Card key={phase}>
                      <CardHeader className="py-2">
                        <CardTitle className="text-sm">{PHASE_CONFIG[phase].label}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {phaseExercises.map((exercise) => {
                            const isSelected = formData.selected_exercises.some(e => e.exercise_id === exercise.id);
                            const config = formData.selected_exercises.find(e => e.exercise_id === exercise.id);

                            return (
                              <div 
                                key={exercise.id}
                                className={`p-2 border rounded ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                              >
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleExercise(exercise.id, exercise.name)}
                                    disabled={!canEdit}
                                  />
                                  <Label className="cursor-pointer flex-1 text-sm">
                                    {exercise.name}
                                  </Label>
                                </div>
                                {isSelected && (
                                  <div className="flex gap-2 mt-2 pl-6">
                                    <Input
                                      type="number"
                                      placeholder="Séries"
                                      value={config?.sets || 3}
                                      onChange={(e) => updateExerciseConfig(exercise.id, 'sets', parseInt(e.target.value) || 3)}
                                      disabled={!canEdit}
                                      className="w-20 h-8 text-xs"
                                    />
                                    <Input
                                      placeholder="Reps"
                                      value={config?.reps || "10-12"}
                                      onChange={(e) => updateExerciseConfig(exercise.id, 'reps', e.target.value)}
                                      disabled={!canEdit}
                                      className="w-24 h-8 text-xs"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              {exercises?.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum exercício cadastrado na biblioteca de avaliação.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            {canEdit && (
              <Button 
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
