import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { expandExerciseName } from "@/constants/exerciseSiglas";

interface ExerciseNameProps {
  name: string;
  className?: string;
}

/**
 * Nome de exercício com tooltip que expande as siglas (LMF, KB, SAJ...) para
 * o texto por extenso — combinado do dicionário canônico de 2026-07-14.
 * Sem sigla no nome → renderiza um span simples, sem tooltip.
 */
export const ExerciseName = ({ name, className }: ExerciseNameProps) => {
  const expanded = expandExerciseName(name);
  if (expanded === name) return <span className={className}>{name}</span>;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className ? `${className} cursor-help` : "cursor-help"}>{name}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-sm">
          {expanded}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
