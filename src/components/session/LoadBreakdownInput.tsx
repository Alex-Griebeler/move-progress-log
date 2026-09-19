import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { expandLoadShorthand } from "@/utils/loadShorthand";
import { calculateLoadFromBreakdown } from "@/utils/loadCalculation";
import { LOAD_BREAKDOWN_PLACEHOLDER } from "./loadCopy";

interface LoadBreakdownInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Chamado no blur SÓ quando o texto mudou: devolve o texto expandido e o
   *  total calculado (ou null se a taquigrafia não fecha). */
  onCalculated?: (expanded: string, loadKg: number | null) => void;
  exerciseName?: string | null;
  studentWeightKg?: number;
  className?: string;
  "aria-invalid"?: boolean;
}

/**
 * Campo de descrição da carga com a MESMA gramática da entrada por exercício
 * (revisão UX-13): aceita a taquigrafia ("2x24, KB32, 10cl b15"), expande no
 * blur e calcula o total. Se o texto não mudou, o total editado à mão é
 * preservado.
 */
export function LoadBreakdownInput({
  id,
  value,
  onChange,
  onCalculated,
  exerciseName,
  studentWeightKg,
  className,
  ...aria
}: LoadBreakdownInputProps) {
  const valueOnFocus = useRef<string>(value);

  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => {
        valueOnFocus.current = value;
      }}
      onBlur={() => {
        if (!onCalculated || value === valueOnFocus.current || !value.trim()) return;
        const expanded = expandLoadShorthand(value);
        const loadKg = calculateLoadFromBreakdown(expanded, studentWeightKg, {
          exerciseName: exerciseName ?? null,
        });
        onCalculated(expanded, loadKg);
      }}
      placeholder={LOAD_BREAKDOWN_PLACEHOLDER}
      enterKeyHint="next"
      className={className}
      aria-invalid={aria["aria-invalid"]}
    />
  );
}
