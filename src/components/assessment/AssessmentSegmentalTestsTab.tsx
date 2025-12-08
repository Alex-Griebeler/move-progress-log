import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Save, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useSegmentalTestResults, useCreateSegmentalTestResult, useUpdateSegmentalTestResult, useDeleteSegmentalTestResult, SegmentalTestResult } from "@/hooks/useTestResults";
import { LoadingState } from "@/components/LoadingState";

interface AssessmentSegmentalTestsTabProps {
  assessmentId: string;
  canEdit: boolean;
}

const BODY_REGIONS = [
  { value: "cervical", label: "Cervical" },
  { value: "shoulder", label: "Ombro" },
  { value: "elbow", label: "Cotovelo" },
  { value: "wrist", label: "Punho/Mão" },
  { value: "thoracic", label: "Torácica" },
  { value: "lumbar", label: "Lombar" },
  { value: "hip", label: "Quadril" },
  { value: "knee", label: "Joelho" },
  { value: "ankle", label: "Tornozelo/Pé" },
];

const SEGMENTAL_TESTS: Record<string, Array<{ name: string; unit?: string; cutoff?: number }>> = {
  cervical: [
    { name: "Flexão Cervical", unit: "graus", cutoff: 45 },
    { name: "Extensão Cervical", unit: "graus", cutoff: 45 },
    { name: "Rotação Cervical", unit: "graus", cutoff: 70 },
    { name: "Inclinação Lateral", unit: "graus", cutoff: 45 },
    { name: "Deep Neck Flexor Test", unit: "segundos", cutoff: 30 },
  ],
  shoulder: [
    { name: "Flexão de Ombro", unit: "graus", cutoff: 170 },
    { name: "Abdução de Ombro", unit: "graus", cutoff: 170 },
    { name: "Rotação Externa", unit: "graus", cutoff: 90 },
    { name: "Rotação Interna", unit: "graus", cutoff: 70 },
    { name: "Apley Superior", unit: "pass/fail" },
    { name: "Apley Inferior", unit: "pass/fail" },
  ],
  hip: [
    { name: "Flexão de Quadril", unit: "graus", cutoff: 120 },
    { name: "Extensão de Quadril", unit: "graus", cutoff: 20 },
    { name: "Abdução de Quadril", unit: "graus", cutoff: 45 },
    { name: "Adução de Quadril", unit: "graus", cutoff: 30 },
    { name: "Rotação Interna", unit: "graus", cutoff: 40 },
    { name: "Rotação Externa", unit: "graus", cutoff: 45 },
    { name: "Thomas Test", unit: "pass/fail" },
    { name: "Ober Test", unit: "pass/fail" },
    { name: "FABER Test", unit: "pass/fail" },
  ],
  knee: [
    { name: "Flexão de Joelho", unit: "graus", cutoff: 140 },
    { name: "Extensão de Joelho", unit: "graus", cutoff: 0 },
    { name: "Teste de Gaveta Anterior", unit: "pass/fail" },
    { name: "Teste de Gaveta Posterior", unit: "pass/fail" },
    { name: "Teste de Lachman", unit: "pass/fail" },
    { name: "Teste de McMurray", unit: "pass/fail" },
  ],
  ankle: [
    { name: "Dorsiflexão", unit: "graus", cutoff: 20 },
    { name: "Flexão Plantar", unit: "graus", cutoff: 50 },
    { name: "Inversão", unit: "graus", cutoff: 35 },
    { name: "Eversão", unit: "graus", cutoff: 20 },
    { name: "Teste de Gaveta Anterior", unit: "pass/fail" },
  ],
  thoracic: [
    { name: "Rotação Torácica", unit: "graus", cutoff: 45 },
    { name: "Extensão Torácica", unit: "graus", cutoff: 25 },
  ],
  lumbar: [
    { name: "Flexão Lombar", unit: "graus", cutoff: 60 },
    { name: "Extensão Lombar", unit: "graus", cutoff: 25 },
    { name: "Inclinação Lateral", unit: "graus", cutoff: 25 },
    { name: "Straight Leg Raise", unit: "graus", cutoff: 80 },
    { name: "Slump Test", unit: "pass/fail" },
  ],
  elbow: [
    { name: "Flexão de Cotovelo", unit: "graus", cutoff: 145 },
    { name: "Extensão de Cotovelo", unit: "graus", cutoff: 0 },
    { name: "Pronação", unit: "graus", cutoff: 80 },
    { name: "Supinação", unit: "graus", cutoff: 80 },
  ],
  wrist: [
    { name: "Flexão de Punho", unit: "graus", cutoff: 80 },
    { name: "Extensão de Punho", unit: "graus", cutoff: 70 },
    { name: "Desvio Radial", unit: "graus", cutoff: 20 },
    { name: "Desvio Ulnar", unit: "graus", cutoff: 30 },
  ],
};

export function AssessmentSegmentalTestsTab({ assessmentId, canEdit }: AssessmentSegmentalTestsTabProps) {
  const { data: tests, isLoading } = useSegmentalTestResults(assessmentId);
  const createMutation = useCreateSegmentalTestResult();
  const updateMutation = useUpdateSegmentalTestResult();
  const deleteMutation = useDeleteSegmentalTestResult();

  const [activeRegion, setActiveRegion] = useState("shoulder");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<{ name: string; unit?: string; cutoff?: number } | null>(null);
  const [editingTest, setEditingTest] = useState<SegmentalTestResult | null>(null);
  const [formData, setFormData] = useState({
    left_value: "",
    right_value: "",
    pass_fail_left: null as boolean | null,
    pass_fail_right: null as boolean | null,
    notes: "",
  });

  const openNewTest = (test: { name: string; unit?: string; cutoff?: number }) => {
    setSelectedTest(test);
    setEditingTest(null);
    setFormData({
      left_value: "",
      right_value: "",
      pass_fail_left: null,
      pass_fail_right: null,
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEditTest = (test: SegmentalTestResult, testConfig: { name: string; unit?: string; cutoff?: number }) => {
    setSelectedTest(testConfig);
    setEditingTest(test);
    setFormData({
      left_value: test.left_value?.toString() || "",
      right_value: test.right_value?.toString() || "",
      pass_fail_left: test.pass_fail_left,
      pass_fail_right: test.pass_fail_right,
      notes: test.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTest) return;

    const isPassFail = selectedTest.unit === "pass/fail";
    
    const data = {
      test_name: selectedTest.name,
      body_region: activeRegion,
      unit: selectedTest.unit || undefined,
      cutoff_value: selectedTest.cutoff || undefined,
      left_value: !isPassFail && formData.left_value ? parseFloat(formData.left_value) : undefined,
      right_value: !isPassFail && formData.right_value ? parseFloat(formData.right_value) : undefined,
      pass_fail_left: isPassFail ? formData.pass_fail_left ?? undefined : undefined,
      pass_fail_right: isPassFail ? formData.pass_fail_right ?? undefined : undefined,
      notes: formData.notes || undefined,
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
      await deleteMutation.mutateAsync({ id, assessment_id: assessmentId });
    }
  };

  if (isLoading) {
    return <LoadingState text="Carregando testes segmentares..." />;
  }

  const regionTests = tests?.filter(t => t.body_region === activeRegion) || [];

  return (
    <div className="space-y-lg">
      <Card>
        <CardHeader>
          <CardTitle>Testes Segmentares por Região</CardTitle>
          <CardDescription>Avaliação de mobilidade e estabilidade por segmento corporal</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeRegion} onValueChange={setActiveRegion}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {BODY_REGIONS.map((region) => {
                const regionTestCount = tests?.filter(t => t.body_region === region.value).length || 0;
                return (
                  <TabsTrigger key={region.value} value={region.value} className="relative">
                    {region.label}
                    {regionTestCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs rounded-full">
                        {regionTestCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {BODY_REGIONS.map((region) => (
              <TabsContent key={region.value} value={region.value} className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SEGMENTAL_TESTS[region.value]?.map((test) => {
                    const existingTest = regionTests.find(t => t.test_name === test.name);
                    const isCompleted = !!existingTest;

                    return (
                      <div 
                        key={test.name}
                        className={`p-4 border rounded-lg ${isCompleted ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{test.name}</span>
                              {test.unit && test.unit !== "pass/fail" && (
                                <Badge variant="outline" className="text-xs">{test.unit}</Badge>
                              )}
                              {test.cutoff && (
                                <Badge variant="secondary" className="text-xs">
                                  Ref: {test.cutoff}°
                                </Badge>
                              )}
                            </div>
                            {isCompleted && existingTest && (
                              <div className="flex gap-4 mt-2 text-sm">
                                {test.unit === "pass/fail" ? (
                                  <>
                                    <span className="flex items-center gap-1">
                                      E: {existingTest.pass_fail_left ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-destructive" />
                                      )}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      D: {existingTest.pass_fail_right ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-destructive" />
                                      )}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>E: {existingTest.left_value || "—"}°</span>
                                    <span>D: {existingTest.right_value || "—"}°</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {isCompleted && existingTest ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openEditTest(existingTest, test)}
                                >
                                  Editar
                                </Button>
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDelete(existingTest.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </>
                            ) : canEdit ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openNewTest(test)}
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
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTest?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-md">
            {selectedTest?.unit === "pass/fail" ? (
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-2">
                  <Label>Lado Esquerdo</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={formData.pass_fail_left === true ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, pass_fail_left: true })}
                      disabled={!canEdit}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Passou
                    </Button>
                    <Button
                      variant={formData.pass_fail_left === false ? "destructive" : "outline"}
                      onClick={() => setFormData({ ...formData, pass_fail_left: false })}
                      disabled={!canEdit}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Falhou
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Lado Direito</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={formData.pass_fail_right === true ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, pass_fail_right: true })}
                      disabled={!canEdit}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Passou
                    </Button>
                    <Button
                      variant={formData.pass_fail_right === false ? "destructive" : "outline"}
                      onClick={() => setFormData({ ...formData, pass_fail_right: false })}
                      disabled={!canEdit}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Falhou
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-2">
                  <Label htmlFor="left">Lado Esquerdo ({selectedTest?.unit})</Label>
                  <Input
                    id="left"
                    type="number"
                    value={formData.left_value}
                    onChange={(e) => setFormData({ ...formData, left_value: e.target.value })}
                    disabled={!canEdit}
                    placeholder={`Ref: ${selectedTest?.cutoff || "—"}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="right">Lado Direito ({selectedTest?.unit})</Label>
                  <Input
                    id="right"
                    type="number"
                    value={formData.right_value}
                    onChange={(e) => setFormData({ ...formData, right_value: e.target.value })}
                    disabled={!canEdit}
                    placeholder={`Ref: ${selectedTest?.cutoff || "—"}`}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={!canEdit}
                placeholder="Compensações, limitações, dor..."
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
