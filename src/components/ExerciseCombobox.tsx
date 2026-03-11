import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Exercise {
  id: string;
  name: string;
}

interface ExerciseComboboxProps {
  exercises: Exercise[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function ExerciseCombobox({
  exercises,
  value,
  onValueChange,
  placeholder = "Buscar exercício...",
}: ExerciseComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedExercise = exercises.find((ex) => ex.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedExercise ? selectedExercise.name : "Selecione o exercício"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command filter={(value, search) => {
            const searchTokens = search.toLowerCase().split(/\s+/).filter(Boolean);
            const nameTokens = value.toLowerCase().split(/\s+/);
            return searchTokens.every(st => nameTokens.some(nt => nt.startsWith(st))) ? 1 : 0;
          }}>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>Nenhum exercício encontrado.</CommandEmpty>
            <CommandGroup>
              {exercises.map((exercise) => (
                <CommandItem
                  key={exercise.id}
                  value={exercise.name}
                  onSelect={() => {
                    onValueChange(exercise.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === exercise.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {exercise.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
