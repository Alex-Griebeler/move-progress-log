import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  useUpdateExercise,
  MOVEMENT_PATTERNS,
  LATERALITY_OPTIONS,
  MOVEMENT_PLANES,
  CONTRACTION_TYPES,
  LEVEL_OPTIONS,
  EXERCISE_CATEGORIES,
  RISK_LEVELS,
  ExerciseLibrary,
} from "@/hooks/useExercisesLibrary";
import { EQUIPMENT_CATEGORIES } from "@/constants/equipment";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// Flatten equipment for selection
const ALL_EQUIPMENT = Object.values(EQUIPMENT_CATEGORIES).flat();

interface EditExerciseLibraryDialogProps {
  exercise: ExerciseLibrary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditExerciseLibraryDialog = ({
  exercise,
  open,
  onOpenChange,
}: EditExerciseLibraryDialogProps) => {
  const [name, setName] = useState(exercise.name);
  const [movementPattern, setMovementPattern] = useState(exercise.movement_pattern);
  const [laterality, setLaterality] = useState(exercise.laterality || "");
  const [movementPlane, setMovementPlane] = useState(exercise.movement_plane || "");
  const [contractionType, setContractionType] = useState(exercise.contraction_type || "");
  const [level, setLevel] = useState(exercise.level || "");
  const [description, setDescription] = useState(exercise.description || "");
  
  // New fields
  const [videoUrl, setVideoUrl] = useState(exercise.video_url || "");
  const [riskLevel, setRiskLevel] = useState(exercise.risk_level || "");
  const [category, setCategory] = useState(exercise.category || "");
  const [subcategory, setSubcategory] = useState(exercise.subcategory || "");
  const [plyometricPhase, setPlyometricPhase] = useState(exercise.plyometric_phase?.toString() || "");
  const [defaultSets, setDefaultSets] = useState(exercise.default_sets || "");
  const [defaultReps, setDefaultReps] = useState(exercise.default_reps || "");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(exercise.equipment_required || []);

  const updateExercise = useUpdateExercise();

  useEffect(() => {
    setName(exercise.name);
    setMovementPattern(exercise.movement_pattern);
    setLaterality(exercise.laterality || "");
    setMovementPlane(exercise.movement_plane || "");
    setContractionType(exercise.contraction_type || "");
    setLevel(exercise.level || "");
    setDescription(exercise.description || "");
    setVideoUrl(exercise.video_url || "");
    setRiskLevel(exercise.risk_level || "");
    setCategory(exercise.category || "");
    setSubcategory(exercise.subcategory || "");
    setPlyometricPhase(exercise.plyometric_phase?.toString() || "");
    setDefaultSets(exercise.default_sets || "");
    setDefaultReps(exercise.default_reps || "");
    setSelectedEquipment(exercise.equipment_required || []);
  }, [exercise]);

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

    await updateExercise.mutateAsync({
      id: exercise.id,
      name: name.trim(),
      movement_pattern: movementPattern,
      laterality: laterality && laterality !== "none" ? laterality : null,
      movement_plane: movementPlane && movementPlane !== "none" ? movementPlane : null,
      contraction_type: contractionType && contractionType !== "none" ? contractionType : null,
      level: level && level !== "none" ? level : null,
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

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Exercício</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-4" id="edit-exercise-form">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Informações Básicas</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-name">Nome do Exercício *</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Agachamento Livre"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-movement-pattern">Padrão de Movimento *</Label>
                  <Select value={movementPattern} onValueChange={setMovementPattern} required>
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
                  <Label htmlFor="edit-category">Categoria</Label>
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
                  <Label htmlFor="edit-level">Nível</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {Object.entries(LEVEL_OPTIONS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-risk-level">Nível de Risco</Label>
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
                  <Label htmlFor="edit-laterality">Lateralidade</Label>
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
                  <Label htmlFor="edit-movement-plane">Plano de Movimento</Label>
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
                  <Label htmlFor="edit-contraction-type">Tipo de Contração</Label>
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
                  <Label htmlFor="edit-plyometric-phase">Fase Pliométrica (1-19)</Label>
                  <Input
                    id="edit-plyometric-phase"
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
                  <Label htmlFor="edit-default-sets">Séries Padrão</Label>
                  <Input
                    id="edit-default-sets"
                    value={defaultSets}
                    onChange={(e) => setDefaultSets(e.target.value)}
                    placeholder="Ex: 3-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-default-reps">Repetições Padrão</Label>
                  <Input
                    id="edit-default-reps"
                    value={defaultReps}
                    onChange={(e) => setDefaultReps(e.target.value)}
                    placeholder="Ex: 8-12"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-subcategory">Subcategoria</Label>
                  <Input
                    id="edit-subcategory"
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
                <Label htmlFor="edit-video-url">URL do Vídeo</Label>
                <Input
                  id="edit-video-url"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
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
                      id={`edit-equip-${equipment}`}
                      checked={selectedEquipment.includes(equipment)}
                      onCheckedChange={() => handleEquipmentToggle(equipment)}
                    />
                    <label
                      htmlFor={`edit-equip-${equipment}`}
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
            form="edit-exercise-form"
            className="w-full" 
            disabled={updateExercise.isPending}
          >
            {updateExercise.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
