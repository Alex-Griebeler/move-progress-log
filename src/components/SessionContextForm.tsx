import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useTrainers } from "@/hooks/useTrainers";

interface SessionContextFormProps {
  trainerName: string;
  date: string;
  time: string;
  onTrainerNameChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

export function SessionContextForm({
  trainerName,
  date,
  time,
  onTrainerNameChange,
  onDateChange,
  onTimeChange,
}: SessionContextFormProps) {
  const { data: trainers } = useTrainers();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Horário</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Treinador Responsável *</Label>
        <Select value={trainerName} onValueChange={onTrainerNameChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o treinador" />
          </SelectTrigger>
          <SelectContent>
            {trainers?.map((trainer) => (
              <SelectItem key={trainer.id} value={trainer.full_name || ''}>
                {trainer.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}