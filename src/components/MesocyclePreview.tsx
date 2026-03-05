/**
 * Preview rico do mesociclo gerado
 * Fabrik Performance - Back to Basics
 * 
 * Exibe: blocos, fases, progressão S1-S4+, warnings, metadata de segurança
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Wind,
  Brain,
  Activity,
  TrendingUp,
  BarChart3,
  Sparkles,
  Info,
  Heart,
} from "lucide-react";
import { MESOCYCLE_STRUCTURE, TRAINING_VALENCES, STUDENT_LEVELS, PERIODIZATION_CYCLES } from "@/constants/backToBasics";
import type { GeneratedMesocycle, GeneratedWorkout, SessionPhase } from "@/types/aiSession";
import type { WorkoutSlot, TrainingValence, PeriodizationCycle } from "@/constants/backToBasics";

// ============================================================================
// TIPOS
// ============================================================================

interface MesocyclePreviewProps {
  mesocycle: GeneratedMesocycle;
  warnings?: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

const PHASE_ICONS: Record<string, React.ReactNode> = {
  "Abertura": <Wind className="h-3.5 w-3.5 text-sky-500" />,
  "Mobilidade Específica": <Activity className="h-3.5 w-3.5 text-emerald-500" />,
  "Core Biplanar": <Shield className="h-3.5 w-3.5 text-amber-500" />,
  "Bloco Principal 1": <Dumbbell className="h-3.5 w-3.5 text-primary" />,
  "Bloco Principal 2": <Dumbbell className="h-3.5 w-3.5 text-primary" />,
  "Bloco Complementar": <Dumbbell className="h-3.5 w-3.5 text-primary/70" />,
  "Respiração Inter-bloco": <Wind className="h-3.5 w-3.5 text-sky-400" />,
  "Finalizador": <TrendingUp className="h-3.5 w-3.5 text-orange-500" />,
  "Encerramento": <Heart className="h-3.5 w-3.5 text-rose-500" />,
};

function getPhaseIcon(phaseName: string) {
  for (const [key, icon] of Object.entries(PHASE_ICONS)) {
    if (phaseName.includes(key)) return icon;
  }
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
}

function getSlotColor(slot: string): string {
  const colors: Record<string, string> = {
    A: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400",
    B: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400",
    C: "bg-violet-500/10 text-violet-700 border-violet-200 dark:text-violet-400",
  };
  return colors[slot] || "";
}

function countExercises(workout: GeneratedWorkout): number {
  return workout.phases.reduce((total, phase) =>
    total + phase.blocks.reduce((bt, block) => bt + block.exercises.length, 0), 0);
}

function countEffectiveSets(workout: GeneratedWorkout): number {
  let total = 0;
  for (const phase of workout.phases) {
    for (const block of phase.blocks) {
      const method = String(block.method);
      if (method === "respiracao" || method === "autoliberacao") continue;
      for (const ex of block.exercises) {
        const parts = ex.sets.split("-").map(Number);
        if (parts.some(isNaN)) continue;
        total += parts[parts.length - 1];
      }
    }
  }
  return total;
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function WarningsPanel({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Observações da IA ({warnings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {warnings.map((warning, i) => (
          <p key={i} className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <span className="shrink-0 mt-0.5">•</span>
            <span>{warning}</span>
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function ProgressionTimeline({ mesocycle }: { mesocycle: GeneratedMesocycle }) {
  const progression = mesocycle.metadata.recommendedProgression || {};
  const weekCount = mesocycle.metadata.weekCount || 4;
  const cycles = Object.entries(progression).slice(0, weekCount);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Progressão — {weekCount} semanas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          {cycles.map(([cycle, config], index) => {
            const baseCycle = `s${((index) % 4) + 1}` as PeriodizationCycle;
            const cycleInfo = PERIODIZATION_CYCLES[baseCycle];
            const intensityPct = Math.round((config.intensityMultiplier || 1) * 100);
            const volumePct = Math.round((config.volumeMultiplier || 1) * 100);

            return (
              <TooltipProvider key={cycle}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex-1 rounded-md p-2 text-center cursor-default transition-all ${
                      index === cycles.length - 1 
                        ? "bg-primary/10 border border-primary/30" 
                        : "bg-muted/50 border border-transparent"
                    }`}>
                      <div className="text-[10px] font-medium text-muted-foreground uppercase">S{index + 1}</div>
                      <div className="text-xs font-semibold mt-0.5">{cycleInfo?.name || cycle}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        PSE {config.pse || "—"}
                      </div>
                      {/* Intensity bar */}
                      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${intensityPct}%` }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p><strong>{cycleInfo?.name}</strong></p>
                    <p>Volume: {volumePct}% | Intensidade: {intensityPct}%</p>
                    <p>PSE: {config.pse}</p>
                    {config.metconMethod && <p>MetCon: {config.metconMethod}</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PatternsBalance({ mesocycle }: { mesocycle: GeneratedMesocycle }) {
  const balance = mesocycle.metadata.totalPatternsBalance || {};
  const patternLabels: Record<string, string> = {
    empurrar: "Push",
    puxar: "Pull",
    dominancia_joelho: "Joelho",
    cadeia_posterior: "Quadril",
    lunge: "Lunge",
    carregar: "Carry",
  };

  const entries = Object.entries(balance)
    .filter(([key]) => key in patternLabels)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  const maxValue = Math.max(...entries.map(([, v]) => v));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Balanço Semanal de Padrões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map(([pattern, count]) => (
          <div key={pattern} className="flex items-center gap-3">
            <span className="text-xs w-16 text-right text-muted-foreground">
              {patternLabels[pattern] || pattern}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${(count / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium w-6">{count}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SafetyFiltersPanel({ mesocycle }: { mesocycle: GeneratedMesocycle }) {
  const filters = mesocycle.metadata.safetyFilters || {};
  const audienceRestrictions = mesocycle.metadata.audienceRestrictions || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600" />
          Filtros de Segurança Aplicados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(filters).map(([key, desc]) => (
          <div key={key} className="flex items-start gap-2">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-medium">{key}</span>
              <span className="text-xs text-muted-foreground ml-1.5">{desc}</span>
            </div>
          </div>
        ))}
        {audienceRestrictions.length > 0 && (
          <>
            <Separator className="my-2" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Preset: {mesocycle.metadata.audiencePreset}
            </p>
            {audienceRestrictions.map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground ml-4">• {r}</p>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PhaseDetail({ phase }: { phase: SessionPhase }) {
  const [open, setOpen] = useState(
    phase.name.includes("Bloco Principal") || phase.name.includes("Finalizador")
  );
  const hasExercises = phase.blocks.some((b) => b.exercises.length > 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group">
          {open ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          {getPhaseIcon(phase.name)}
          <span className="text-sm font-medium flex-1 text-left">{phase.name}</span>
          <span className="text-[10px] text-muted-foreground">{phase.duration} min</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-8 space-y-2 pb-2">
          {phase.blocks.map((block) => (
            <div key={block.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{block.name}</span>
                <Badge variant="outline" className="text-[10px] py-0 h-4">
                  {String(block.method)}
                </Badge>
              </div>

              {block.exercises.length > 0 ? (
                <div className="space-y-1">
                  {block.exercises.map((exercise) => (
                    <div key={exercise.id} className="text-xs bg-muted/40 rounded-md px-3 py-1.5 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{exercise.name}</span>
                        <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap shrink-0">
                          <span className="font-mono">{exercise.sets}×{exercise.reps}</span>
                          {exercise.interval > 0 && <span>{exercise.interval}s</span>}
                          {exercise.pse && (
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">
                              PSE {exercise.pse}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {exercise.executionCues && (
                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                          💡 {exercise.executionCues}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : block.notes ? (
                <p className="text-xs text-muted-foreground italic ml-1">{block.notes}</p>
              ) : null}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function WorkoutCard({ workout }: { workout: GeneratedWorkout }) {
  const exerciseCount = countExercises(workout);
  const effectiveSets = countEffectiveSets(workout);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge className={getSlotColor(workout.slot)} variant="outline">
              {MESOCYCLE_STRUCTURE.workoutSlots[workout.slot as WorkoutSlot]?.name || workout.slot}
            </Badge>
            <span>{workout.name}</span>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{exerciseCount} exercícios</span>
            <span>•</span>
            <span>{effectiveSets} sets</span>
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span>{workout.totalDuration} min</span>
          </div>
        </div>

        {/* Valences + Core check */}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex gap-1.5">
            {workout.valences.map((v) => (
              <Badge key={v} variant="secondary" className="text-xs">
                {TRAINING_VALENCES[v as TrainingValence] || v}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 text-[10px]">
            {[
              { key: "anti_extensao", label: "Anti-ext" },
              { key: "anti_flexao_lateral", label: "Anti-flex" },
              { key: "anti_rotacao", label: "Anti-rot" },
            ].map(({ key, label }) => (
              <span key={key} className="flex items-center gap-0.5">
                {workout.coreTriplanarCheck[key as keyof typeof workout.coreTriplanarCheck] ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                )}
                {label}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Separator className="mb-2" />
        <div className="space-y-0.5">
          {workout.phases.map((phase) => (
            <PhaseDetail key={phase.id} phase={phase} />
          ))}
        </div>

        {/* Motivational phrase */}
        {workout.motivationalPhrase && (
          <div className="mt-3 pt-2 border-t">
            <p className="text-xs italic text-primary/80 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 shrink-0" />
              {workout.motivationalPhrase}
            </p>
          </div>
        )}

        {/* Mindfulness script */}
        {workout.mindfulnessScript && (
          <div className="mt-1.5">
            <p className="text-[10px] text-muted-foreground italic flex items-start gap-1.5">
              <Brain className="h-3 w-3 shrink-0 mt-0.5" />
              {workout.mindfulnessScript}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function MesocyclePreview({ mesocycle, warnings = [] }: MesocyclePreviewProps) {
  const weekCount = mesocycle.metadata.weekCount || 4;
  const levelName = STUDENT_LEVELS[mesocycle.groupLevel]?.name || mesocycle.groupLevel;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary">{levelName}</Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {weekCount} semanas
        </Badge>
        {mesocycle.metadata.audiencePreset && mesocycle.metadata.audiencePreset !== "adulto" && (
          <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400">
            <Shield className="h-3 w-3" />
            {mesocycle.metadata.audiencePreset === "senior_70" ? "70+" : "Adolescente"}
          </Badge>
        )}
        {mesocycle.metadata.rotationMode === "B" && (
          <Badge variant="outline" className="text-xs">Modo B — Rotação seletiva</Badge>
        )}
        {mesocycle.metadata.groupReadiness != null && (
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            Readiness: {mesocycle.metadata.groupReadiness}
          </Badge>
        )}
      </div>

      {/* Warnings */}
      <WarningsPanel warnings={warnings} />

      {/* Tabs: Treinos | Progressão | Segurança */}
      <Tabs defaultValue="workouts" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="workouts" className="text-xs">
            <Dumbbell className="h-3.5 w-3.5 mr-1.5" />
            Treinos
          </TabsTrigger>
          <TabsTrigger value="progression" className="text-xs">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Progressão
          </TabsTrigger>
          <TabsTrigger value="safety" className="text-xs">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* Tab: Treinos A/B/C */}
        <TabsContent value="workouts" className="space-y-4 mt-4">
          {mesocycle.workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </TabsContent>

        {/* Tab: Progressão */}
        <TabsContent value="progression" className="space-y-4 mt-4">
          <ProgressionTimeline mesocycle={mesocycle} />
          <PatternsBalance mesocycle={mesocycle} />
        </TabsContent>

        {/* Tab: Segurança */}
        <TabsContent value="safety" className="space-y-4 mt-4">
          <SafetyFiltersPanel mesocycle={mesocycle} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
