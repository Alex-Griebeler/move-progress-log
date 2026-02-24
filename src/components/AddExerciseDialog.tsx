import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, AlertTriangle } from "lucide-react";
import {
  useCreateExercise,
  FUNCTIONAL_GROUPS,
  MOVEMENT_PATTERNS,
  LATERALITY_OPTIONS,
  MOVEMENT_PLANES,
  CONTRACTION_TYPES,
  EXERCISE_CATEGORIES,
  RISK_LEVELS,
  NUMERIC_LEVEL_SCALE,
  PATTERN_TO_FUNCTIONAL_GROUP,
  GROUP_TO_CATEGORY,
} from "@/hooks/useExercisesLibrary";
import { useDuplicateExerciseCheck } from "@/hooks/useDuplicateExerciseCheck";
import { EQUIPMENT_CATEGORIES } from "@/constants/equipment";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// Flatten equipment for selection
const ALL_EQUIPMENT = Object.values(EQUIPMENT_CATEGORIES).flat();

export const AddExerciseDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [movementPattern, setMovementPattern] = useState("");
  const [laterality, setLaterality] = useState("");
  const [movementPlane, setMovementPlane] = useState("");
  const [contractionType, setContractionType] = useState("");
  const [numericLevel, setNumericLevel] = useState("");
  const [description, setDescription] = useState("");
  
  // New fields
  const [videoUrl, setVideoUrl] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [plyometricPhase, setPlyometricPhase] = useState("");
  const [defaultSets, setDefaultSets] = useState("");
  const [defaultReps, setDefaultReps] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  const createExercise = useCreateExercise();
  const { data: duplicates } = useDuplicateExerciseCheck(name);

  const handleMovementPatternChange = (pattern: string) => {
    setMovementPattern(pattern);
    // Auto-fill category based on functional group mapping
    const functionalGroup = PATTERN_TO_FUNCTIONAL_GROUP[pattern];
    if (functionalGroup) {
      const autoCategory = GROUP_TO_CATEGORY[functionalGroup];
      if (autoCategory) {
        setCategory(autoCategory);
      }
    }
  };

  const handleEquipmentToggle = (equipment: string) => {
    setSelectedEquipment(prev => 
      prev.includes(equipment) 
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !movementPattern) {
      return;
    }

    await createExercise.mutateAsync({
      name: name.trim(),
      movement_pattern: movementPattern,
      laterality: laterality && laterality !== "none" ? laterality : null,
      movement_plane: movementPlane && movementPlane !== "none" ? movementPlane : null,
      contraction_type: contractionType && contractionType !== "none" ? contractionType : null,
      level: null,
      description: description.trim() || null,
      video_url: videoUrl.trim() || null,
      risk_level: riskLevel && riskLevel !== "none" ? riskLevel : null,
      category: category && category !== "none" ? category : null,
      subcategory: subcategory.trim() || null,
      plyometric_phase: plyometricPhase ? parseInt(plyometricPhase) : null,
      default_sets: defaultSets.trim() || null,
      default_reps: defaultReps.trim() || null,
      equipment_required: selectedEquipment.length > 0 ? selectedEquipment : null,
    });

    // Reset form
    setName("");
    setMovementPattern("");
    setLaterality("");
    setMovementPlane("");
    setContractionType("");
    setNumericLevel("");
    setDescription("");
    setVideoUrl("");
    setRiskLevel("");
    setCategory("");
    setSubcategory("");
    setPlyometricPhase("");
    setDefaultSets("");
    setDefaultReps("");
    setSelectedEquipment([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Exercício
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Exercício</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-4" id="add-exercise-form">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Informações Básicas</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Nome do Exercício *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Agachamento Livre"
                    required
                  />
                  {duplicates && duplicates.length > 0 && (
                    <Alert variant="default" className="border-accent/50 bg-accent/10">
                      <AlertTriangle className="h-4 w-4 text-accent-foreground" />
                      <AlertDescription className="text-sm">
                        Exercício(s) similar(es) encontrado(s):
                        <ul className="mt-1 list-disc list-inside">
                          {duplicates.map((d) => (
                            <li key={d.id} className="text-muted-foreground">{d.name}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="movement-pattern">Padrão de Movimento *</Label>
                  <Select value={movementPattern} onValueChange={handleMovementPatternChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MOVEMENT_PATTERNS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {Object.entries(EXERCISE_CATEGORIES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeric-level">Nível (1-9)</Label>
                  <Select value={numericLevel} onValueChange={setNumericLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {Object.entries(NUMERIC_LEVEL_SCALE).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label} — {val.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risk-level">Nível de Risco</Label>
                  <Select value={riskLevel} onValueChange={setRiskLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {Object.entries(RISK_LEVELS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Classification Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground">Classificação Biomecânica</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="laterality">Lateralidade</Label>
                  <Select value={laterality} onValueChange={setLaterality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {Object.entries(LATERALITY_OPTIONS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="movement-plane">Plano de Movimento</Label>
                  <Select value={movementPlane} onValueChange={setMovementPlane}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {Object.entries(MOVEMENT_PLANES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contraction-type">Tipo de Contração</Label>
                  <Select value={contractionType} onValueChange={setContractionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {Object.entries(CONTRACTION_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plyometric-phase">Fase Pliométrica (1-19)</Label>
                  <Input
                    id="plyometric-phase"
                    type="number"
                    min="1"
                    max="19"
                    value={plyometricPhase}
                    onChange={(e) => setPlyometricPhase(e.target.value)}
                    placeholder="Ex: 5"
                  />
                </div>
              </div>
            </div>

            {/* Defaults Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground">Prescrição Padrão</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-sets">Séries Padrão</Label>
                  <Input
                    id="default-sets"
                    value={defaultSets}
                    onChange={(e) => setDefaultSets(e.target.value)}
                    placeholder="Ex: 3-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-reps">Repetições Padrão</Label>
                  <Input
                    id="default-reps"
                    value={defaultReps}
                    onChange={(e) => setDefaultReps(e.target.value)}
                    placeholder="Ex: 8-12"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="subcategory">Subcategoria</Label>
                  <Input
                    id="subcategory"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="Ex: Agachamentos, Flexões"
                  />
                </div>
              </div>
            </div>

            {/* Video and Description */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground">Mídia e Descrição</h3>
              
              <div className="space-y-2">
                <Label htmlFor="video-url">URL do Vídeo</Label>
                <Input
                  id="video-url"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional do exercício, dicas de execução..."
                  rows={3}
                />
              </div>
            </div>

            {/* Equipment Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground">Equipamentos Necessários</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                {ALL_EQUIPMENT.map((equipment) => (
                  <div key={equipment} className="flex items-center space-x-2">
                    <Checkbox
                      id={`equip-${equipment}`}
                      checked={selectedEquipment.includes(equipment)}
                      onCheckedChange={() => handleEquipmentToggle(equipment)}
                    />
                    <label
                      htmlFor={`equip-${equipment}`}
                      className="text-sm cursor-pointer truncate"
                    >
                      {equipment}
                    </label>
                  </div>
                ))}
              </div>
              {selectedEquipment.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedEquipment.length} equipamento(s) selecionado(s)
                </p>
              )}
            </div>
          </form>
        </ScrollArea>

        <div className="pt-4 border-t border-border">
          <Button 
            type="submit" 
            form="add-exercise-form"
            className="w-full" 
            disabled={createExercise.isPending}
          >
            {createExercise.isPending ? "Criando..." : "Criar Exercício"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
