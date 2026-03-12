import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash } from "lucide-react";
import { Severity } from "@/types/sessionRecording";

// Generic observation that works for both group (categories[]) and individual (category)
interface BaseObservation {
  observation_text: string;
  severity: Severity;
}

interface ObservationEditorProps<T extends BaseObservation> {
  observations: T[];
  onObservationsChange: (observations: T[]) => void;
  /** Used to create a new empty observation */
  createEmpty: () => T;
  /** Render category selector for a single observation */
  renderCategorySelector?: (obs: T, index: number, onChange: (updated: T) => void) => React.ReactNode;
}

export function ObservationEditor<T extends BaseObservation>({
  observations,
  onObservationsChange,
  createEmpty,
  renderCategorySelector,
}: ObservationEditorProps<T>) {
  const updateObservation = (index: number, updated: T) => {
    const newObs = [...observations];
    newObs[index] = updated;
    onObservationsChange(newObs);
  };

  const removeObservation = (index: number) => {
    onObservationsChange(observations.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          🩺 Observações Clínicas
          <Button
            size="sm"
            variant="outline"
            onClick={() => onObservationsChange([...observations, createEmpty()])}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Observação
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {observations.map((obs, idx) => (
          <div key={idx} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Observação {idx + 1}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeObservation(idx)}
              >
                <Trash className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Texto</Label>
              <Textarea
                value={obs.observation_text}
                onChange={(e) =>
                  updateObservation(idx, { ...obs, observation_text: e.target.value })
                }
                placeholder="Descrição da observação..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              {renderCategorySelector?.(obs, idx, (updated) => updateObservation(idx, updated))}

              <Select
                value={obs.severity}
                onValueChange={(value: Severity) =>
                  updateObservation(idx, { ...obs, severity: value })
                }
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="média">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
