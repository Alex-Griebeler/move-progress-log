import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, Eye } from "lucide-react";
import { useGlobalTestResults, useCreateGlobalTestResult, useUpdateGlobalTestResult, useDeleteGlobalTestResult } from "@/hooks/useTestResults";
import { LoadingState } from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

interface AssessmentGlobalTestsTabProps {
  assessmentId: string;
  canEdit: boolean;
}

const GLOBAL_TESTS = [
  { name: "Avaliação Postural Estática", description: "Análise da postura em diferentes vistas" },
  { name: "Teste de Adams", description: "Avaliação de escoliose" },
  { name: "Overhead Squat Assessment", description: "Avaliação de mobilidade global" },
  { name: "Single Leg Squat", description: "Avaliação de estabilidade unilateral" },
  { name: "Push-up Assessment", description: "Avaliação de estabilidade de core e ombro" },
];

const POSTURAL_VIEWS = ["anterior", "lateral", "posterior"] as const;
const SIDES = ["left", "right"] as const;

const POSTURAL_CHECKPOINTS: Record<string, string[]> = {
  anterior: [
    "Cabeça alinhada",
    "Ombros nivelados",
    "Clavículas simétricas",
    "Braços equidistantes",
    "Cristas ilíacas niveladas",
    "Joelhos alinhados",
    "Pés paralelos",
  ],
  lateral: [
    "Orelha alinhada com ombro",
    "Ombro alinhado com quadril",
    "Quadril alinhado com joelho",
    "Joelho alinhado com tornozelo",
    "Curva cervical preservada",
    "Curva torácica preservada",
    "Curva lombar preservada",
  ],
  posterior: [
    "Cabeça centralizada",
    "Escápulas simétricas",
    "Triângulo de talhe simétrico",
    "Pregas glúteas niveladas",
    "Pregas poplíteas niveladas",
    "Tendões de Aquiles alinhados",
  ],
};

export function AssessmentGlobalTestsTab({ assessmentId, canEdit }: AssessmentGlobalTestsTabProps) {
  const { data: tests, isLoading } = useGlobalTestResults(assessmentId);
  const createMutation = useCreateGlobalTestResult();
  const updateMutation = useUpdateGlobalTestResult();
  const deleteMutation = useDeleteGlobalTestResult();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [editingTest, setEditingTest] = useState<any>(null);
  const [formData, setFormData] = useState<{
    notes: string;
    anterior_view: Record<string, boolean>;
    lateral_view: Record<string, boolean>;
    posterior_view: Record<string, boolean>;
    left_side: Record<string, any>;
    right_side: Record<string, any>;
  }>({
    notes: "",
    anterior_view: {},
    lateral_view: {},
    posterior_view: {},
    left_side: {},
    right_side: {},
  });

  const openNewTest = (testName: string) => {
    setSelectedTest(testName);
    setEditingTest(null);
    setFormData({
      notes: "",
      anterior_view: {},
      lateral_view: {},
      posterior_view: {},
      left_side: {},
      right_side: {},
    });
    setDialogOpen(true);
  };

  const openEditTest = (test: any) => {
    setSelectedTest(test.test_name);
    setEditingTest(test);
    setFormData({
      notes: test.notes || "",
      anterior_view: test.anterior_view || {},
      lateral_view: test.lateral_view || {},
      posterior_view: test.posterior_view || {},
      left_side: test.left_side || {},
      right_side: test.right_side || {},
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      test_name: selectedTest,
      notes: formData.notes || null,
      anterior_view: formData.anterior_view,
      lateral_view: formData.lateral_view,
      posterior_view: formData.posterior_view,
      left_side: formData.left_side,
      right_side: formData.right_side,
    };

    if (editingTest) {
      await updateMutation.mutateAsync({ id: editingTest.id, ...data });
    } else {
      await createMutation.mutateAsync({ assessment_id: assessmentId, ...data });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este teste?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const isPosturalTest = selectedTest === "Avaliação Postural Estática";

  if (isLoading) {
    return <LoadingState text="Carregando testes globais..." />;
  }

  const completedTests = tests?.map(t => t.test_name) || [];

  return (
    <div className="space-y-lg">
      {/* Available Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Testes Globais Disponíveis</CardTitle>
          <CardDescription>Selecione um teste para registrar os resultados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GLOBAL_TESTS.map((test) => {
              const isCompleted = completedTests.includes(test.name);
              const existingTest = tests?.find(t => t.test_name === test.name);
              
              return (
                <div 
                  key={test.name}
                  className={`p-4 border rounded-lg ${isCompleted ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{test.name}</span>
                        {isCompleted && <Badge variant="outline" className="text-xs">Registrado</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
                    </div>
                    <div className="flex gap-1">
                      {isCompleted ? (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditTest(existingTest)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(existingTest!.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      ) : canEdit ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openNewTest(test.name)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Registrar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Test Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTest}</DialogTitle>
          </DialogHeader>

          <div className="space-y-md">
            {isPosturalTest ? (
              /* Postural Assessment Form */
              <div className="space-y-md">
                {POSTURAL_VIEWS.map((view) => (
                  <Card key={view}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base capitalize">
                        Vista {view === 'anterior' ? 'Anterior' : view === 'lateral' ? 'Lateral' : 'Posterior'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {POSTURAL_CHECKPOINTS[view].map((checkpoint) => (
                          <div key={checkpoint} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${view}-${checkpoint}`}
                              checked={formData[`${view}_view` as keyof typeof formData]?.[checkpoint] || false}
                              onCheckedChange={(checked) => {
                                const viewKey = `${view}_view` as keyof typeof formData;
                                setFormData({
                                  ...formData,
                                  [viewKey]: {
                                    ...formData[viewKey],
                                    [checkpoint]: !!checked,
                                  },
                                });
                              }}
                              disabled={!canEdit}
                            />
                            <Label 
                              htmlFor={`${view}-${checkpoint}`} 
                              className="cursor-pointer text-sm"
                            >
                              {checkpoint}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Generic Test Form */
              <div className="grid grid-cols-2 gap-md">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Lado Esquerdo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="left-pass"
                          checked={formData.left_side?.pass || false}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              left_side: { ...formData.left_side, pass: !!checked },
                            });
                          }}
                          disabled={!canEdit}
                        />
                        <Label htmlFor="left-pass" className="cursor-pointer">Passou no teste</Label>
                      </div>
                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea
                          value={formData.left_side?.notes || ""}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              left_side: { ...formData.left_side, notes: e.target.value },
                            });
                          }}
                          disabled={!canEdit}
                          placeholder="Compensações, limitações..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Lado Direito</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="right-pass"
                          checked={formData.right_side?.pass || false}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              right_side: { ...formData.right_side, pass: !!checked },
                            });
                          }}
                          disabled={!canEdit}
                        />
                        <Label htmlFor="right-pass" className="cursor-pointer">Passou no teste</Label>
                      </div>
                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea
                          value={formData.right_side?.notes || ""}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              right_side: { ...formData.right_side, notes: e.target.value },
                            });
                          }}
                          disabled={!canEdit}
                          placeholder="Compensações, limitações..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações Gerais</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={!canEdit}
                placeholder="Observações adicionais sobre o teste..."
                rows={3}
              />
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
