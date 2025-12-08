import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Save, Trash2, Target } from "lucide-react";
import { useFunctionalFindings, useCreateFunctionalFinding, useUpdateFunctionalFinding, useDeleteFunctionalFinding, SeverityLevel } from "@/hooks/useFunctionalFindings";
import { LoadingState } from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

interface AssessmentFindingsTabProps {
  assessmentId: string;
  canEdit: boolean;
}

const BODY_REGIONS = [
  "Cervical",
  "Ombro",
  "Cotovelo",
  "Punho/Mão",
  "Torácica",
  "Lombar",
  "Quadril",
  "Joelho",
  "Tornozelo/Pé",
  "Core",
];

const CLASSIFICATION_TAGS = [
  { value: "mobility_deficit", label: "Déficit de Mobilidade" },
  { value: "stability_deficit", label: "Déficit de Estabilidade" },
  { value: "strength_deficit", label: "Déficit de Força" },
  { value: "motor_control", label: "Controle Motor" },
  { value: "muscle_imbalance", label: "Desequilíbrio Muscular" },
  { value: "postural_deviation", label: "Desvio Postural" },
  { value: "pain_pattern", label: "Padrão de Dor" },
  { value: "movement_dysfunction", label: "Disfunção de Movimento" },
];

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; color: string }> = {
  none: { label: "Nenhum", color: "bg-muted" },
  mild: { label: "Leve", color: "bg-yellow-500/20 text-yellow-700" },
  moderate: { label: "Moderado", color: "bg-orange-500/20 text-orange-700" },
  severe: { label: "Severo", color: "bg-red-500/20 text-red-700" },
};

const COMMON_MUSCLES = [
  "Trapézio Superior",
  "Trapézio Médio",
  "Trapézio Inferior",
  "Romboides",
  "Serrátil Anterior",
  "Peitoral Maior",
  "Peitoral Menor",
  "Deltóide",
  "Bíceps",
  "Tríceps",
  "Grande Dorsal",
  "Eretores da Espinha",
  "Quadrado Lombar",
  "Reto Abdominal",
  "Oblíquos",
  "Transverso Abdominal",
  "Glúteo Máximo",
  "Glúteo Médio",
  "Glúteo Mínimo",
  "Iliopsoas",
  "Tensor da Fáscia Lata",
  "Piriforme",
  "Quadríceps",
  "Isquiotibiais",
  "Adutores",
  "Gastrocnêmio",
  "Sóleo",
  "Tibial Anterior",
];

export function AssessmentFindingsTab({ assessmentId, canEdit }: AssessmentFindingsTabProps) {
  const { data: findings, isLoading } = useFunctionalFindings(assessmentId);
  const createMutation = useCreateFunctionalFinding();
  const updateMutation = useUpdateFunctionalFinding();
  const deleteMutation = useDeleteFunctionalFinding();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<any>(null);
  const [formData, setFormData] = useState({
    body_region: "",
    classification_tag: "",
    severity: "mild" as SeverityLevel,
    hypoactive_muscles: [] as string[],
    hyperactive_muscles: [] as string[],
    biomechanical_importance: 5,
    context_weight: 5,
  });

  const [muscleInput, setMuscleInput] = useState({ hypo: "", hyper: "" });

  const openNewFinding = () => {
    setEditingFinding(null);
    setFormData({
      body_region: "",
      classification_tag: "",
      severity: "mild",
      hypoactive_muscles: [],
      hyperactive_muscles: [],
      biomechanical_importance: 5,
      context_weight: 5,
    });
    setDialogOpen(true);
  };

  const openEditFinding = (finding: any) => {
    setEditingFinding(finding);
    setFormData({
      body_region: finding.body_region,
      classification_tag: finding.classification_tag,
      severity: finding.severity,
      hypoactive_muscles: finding.hypoactive_muscles || [],
      hyperactive_muscles: finding.hyperactive_muscles || [],
      biomechanical_importance: finding.biomechanical_importance || 5,
      context_weight: finding.context_weight || 5,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const priorityScore = (formData.biomechanical_importance * formData.context_weight) / 10;

    const data = {
      body_region: formData.body_region,
      classification_tag: formData.classification_tag,
      severity: formData.severity,
      hypoactive_muscles: formData.hypoactive_muscles,
      hyperactive_muscles: formData.hyperactive_muscles,
      biomechanical_importance: formData.biomechanical_importance,
      context_weight: formData.context_weight,
      priority_score: priorityScore,
    };

    if (editingFinding) {
      await updateMutation.mutateAsync({ 
        id: editingFinding.id, 
        assessment_id: assessmentId,
        ...data 
      });
    } else {
      await createMutation.mutateAsync({ assessment_id: assessmentId, ...data });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este achado?")) {
      await deleteMutation.mutateAsync({ id, assessment_id: assessmentId });
    }
  };

  const addMuscle = (type: "hypo" | "hyper", muscle: string) => {
    if (!muscle.trim()) return;
    const key = type === "hypo" ? "hypoactive_muscles" : "hyperactive_muscles";
    if (!formData[key].includes(muscle)) {
      setFormData({ ...formData, [key]: [...formData[key], muscle] });
    }
    setMuscleInput({ ...muscleInput, [type]: "" });
  };

  const removeMuscle = (type: "hypo" | "hyper", muscle: string) => {
    const key = type === "hypo" ? "hypoactive_muscles" : "hyperactive_muscles";
    setFormData({ ...formData, [key]: formData[key].filter(m => m !== muscle) });
  };

  if (isLoading) {
    return <LoadingState text="Carregando achados funcionais..." />;
  }

  // Group findings by region
  const findingsByRegion = findings?.reduce((acc, finding) => {
    const region = finding.body_region;
    if (!acc[region]) acc[region] = [];
    acc[region].push(finding);
    return acc;
  }, {} as Record<string, typeof findings>) || {};

  // Sort findings by priority score
  const sortedFindings = findings?.slice().sort((a, b) => 
    (b.priority_score || 0) - (a.priority_score || 0)
  ) || [];

  return (
    <div className="space-y-lg">
      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Achados Funcionais</CardTitle>
            <CardDescription>
              {findings?.length || 0} achado(s) registrado(s) em {Object.keys(findingsByRegion).length} região(ões)
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={openNewFinding} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Achado
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {findings?.length === 0 ? (
            <EmptyState
              icon={<Target className="h-8 w-8 text-muted-foreground" />}
              title="Nenhum achado registrado"
              description="Registre os achados funcionais identificados na avaliação."
              primaryAction={canEdit ? {
                label: "Adicionar Achado",
                onClick: openNewFinding,
              } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {/* Priority List */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Por Prioridade</h4>
                <div className="space-y-2">
                  {sortedFindings.map((finding, index) => {
                    const classificationLabel = CLASSIFICATION_TAGS.find(t => t.value === finding.classification_tag)?.label || finding.classification_tag;
                    const severityConfig = SEVERITY_CONFIG[finding.severity];

                    return (
                      <div 
                        key={finding.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{finding.body_region}</span>
                              <Badge variant="outline">{classificationLabel}</Badge>
                              <Badge className={severityConfig.color}>{severityConfig.label}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Prioridade: {finding.priority_score?.toFixed(1) || "—"}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditFinding(finding)}>
                            Editar
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(finding.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finding Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFinding ? "Editar Achado" : "Novo Achado Funcional"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-md">
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-2">
                <Label>Região Corporal</Label>
                <Select 
                  value={formData.body_region} 
                  onValueChange={(v) => setFormData({ ...formData, body_region: v })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a região" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Classificação</Label>
                <Select 
                  value={formData.classification_tag} 
                  onValueChange={(v) => setFormData({ ...formData, classification_tag: v })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATION_TAGS.map((tag) => (
                      <SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Severidade</Label>
              <div className="flex gap-2">
                {(Object.keys(SEVERITY_CONFIG) as SeverityLevel[]).map((severity) => (
                  <Button
                    key={severity}
                    variant={formData.severity === severity ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, severity })}
                    disabled={!canEdit}
                    className="flex-1"
                  >
                    {SEVERITY_CONFIG[severity].label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Hypoactive Muscles */}
            <div className="space-y-2">
              <Label>Músculos Hipoativos (fracos/inibidos)</Label>
              <div className="flex gap-2">
                <Select
                  value={muscleInput.hypo}
                  onValueChange={(v) => addMuscle("hypo", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar músculo" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_MUSCLES.filter(m => !formData.hypoactive_muscles.includes(m)).map((muscle) => (
                      <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.hypoactive_muscles.map((muscle) => (
                  <Badge 
                    key={muscle} 
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => canEdit && removeMuscle("hypo", muscle)}
                  >
                    {muscle} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Hyperactive Muscles */}
            <div className="space-y-2">
              <Label>Músculos Hiperativos (encurtados/tensos)</Label>
              <div className="flex gap-2">
                <Select
                  value={muscleInput.hyper}
                  onValueChange={(v) => addMuscle("hyper", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar músculo" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_MUSCLES.filter(m => !formData.hyperactive_muscles.includes(m)).map((muscle) => (
                      <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.hyperactive_muscles.map((muscle) => (
                  <Badge 
                    key={muscle} 
                    variant="outline"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => canEdit && removeMuscle("hyper", muscle)}
                  >
                    {muscle} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Priority Scores */}
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-3">
                <Label>Importância Biomecânica: {formData.biomechanical_importance}</Label>
                <Slider
                  value={[formData.biomechanical_importance]}
                  onValueChange={([v]) => setFormData({ ...formData, biomechanical_importance: v })}
                  min={1}
                  max={10}
                  step={1}
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground">
                  Impacto na função e movimento geral
                </p>
              </div>

              <div className="space-y-3">
                <Label>Peso Contextual: {formData.context_weight}</Label>
                <Slider
                  value={[formData.context_weight]}
                  onValueChange={([v]) => setFormData({ ...formData, context_weight: v })}
                  min={1}
                  max={10}
                  step={1}
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground">
                  Relevância para os objetivos do aluno
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-sm">
                <strong>Score de Prioridade: </strong>
                {((formData.biomechanical_importance * formData.context_weight) / 10).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Calculado automaticamente para ordenar os achados
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            {canEdit && (
              <Button 
                onClick={handleSave}
                disabled={!formData.body_region || !formData.classification_tag || createMutation.isPending || updateMutation.isPending}
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
