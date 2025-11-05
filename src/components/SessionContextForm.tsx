import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { WORKOUT_TYPES, FABRIK_ROOMS } from "@/constants/workouts";

interface SessionContextFormProps {
  workoutName: string;
  roomName: string;
  trainerName: string;
  date: string;
  time: string;
  onWorkoutNameChange: (value: string) => void;
  onRoomNameChange: (value: string) => void;
  onTrainerNameChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

export function SessionContextForm({
  workoutName,
  roomName,
  trainerName,
  date,
  time,
  onWorkoutNameChange,
  onRoomNameChange,
  onTrainerNameChange,
  onDateChange,
  onTimeChange,
}: SessionContextFormProps) {
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
        <Label>Tipo de Treino</Label>
        <Select value={workoutName} onValueChange={onWorkoutNameChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de treino" />
          </SelectTrigger>
          <SelectContent>
            {WORKOUT_TYPES.map((workout) => (
              <SelectItem key={workout.value} value={workout.value}>
                {workout.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sala da Fabrik</Label>
        <Select value={roomName} onValueChange={onRoomNameChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a sala" />
          </SelectTrigger>
          <SelectContent>
            {FABRIK_ROOMS.map((room) => (
              <SelectItem key={room.value} value={room.value}>
                {room.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="trainer">Nome do Treinador</Label>
        <Input
          id="trainer"
          type="text"
          value={trainerName}
          onChange={(e) => onTrainerNameChange(e.target.value)}
          placeholder="Digite o nome do treinador"
        />
      </div>
    </div>
  );
}