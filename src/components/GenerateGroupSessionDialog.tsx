import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sparkles, ArrowRight, ArrowLeft, Loader2, Clock, Target, Layers, CheckCircle2, AlertTriangle } from "lucide-react";
import { useGenerateGroupSession } from "@/hooks/useGenerateGroupSession";
import {
  PERIODIZATION_CYCLES,
  SESSION_FORMATS,
  TRAINING_VALENCES,
} from "@/constants/backToBasics";
import type { SessionGenerationInput, GeneratedSession } from "@/types/aiSession";

// Local constants for dialog options
const GROUP_LEVELS = [
  { id: "iniciante", label: "Iniciante" },
  { id: "intermediario", label: "Intermediário" },
  { id: "avancado", label: "Avançado" },
] as const;

const FOCUS_OPTIONS = [
  { id: "inferior", label: "Membros Inferiores" },
  { id: "superior", label: "Membros Superiores" },
  { id: "full_body", label: "Full Body" },
] as const;

interface GenerateGroupSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionGenerated?: (session: GeneratedSession) => void;
}

type Step = "format" | "config" | "generating" | "preview";

export function GenerateGroupSessionDialog({
  open,
  onOpenChange,
  onSessionGenerated,
}: GenerateGroupSessionDialogProps) {
  const [step, setStep] = useState<Step>("format");
  const [generatedSession, setGeneratedSession] = useState<GeneratedSession | null>(null);

  // Form state
  const [format, setFormat] = useState<"tradicional" | "time_efficient">("tradicional");
  const [cycle, setCycle] = useState<"s1" | "s2" | "s3" | "s4">("s2");
  const [valences, setValences] = useState<(keyof typeof TRAINING_VALENCES)[]>(["forca"]);
  const [groupLevel, setGroupLevel] = useState<"iniciante" | "intermediario" | "avancado">("intermediario");
  const [focus, setFocus] = useState<"inferior" | "superior" | "full_body">("full_body");
  const [includePlyometrics, setIncludePlyometrics] = useState(false);
  const [includeLMF, setIncludeLMF] = useState(true);

  const generateSession = useGenerateGroupSession();

  const handleValenceToggle = (valence: keyof typeof TRAINING_VALENCES) => {
    setValences((prev) => {
      if (prev.includes(valence)) {
        return prev.filter((v) => v !== valence);
      }
      if (prev.length >= 2) {
        return [prev[1], valence]; // Replace first with new
      }
      return [...prev, valence];
    });
  };

  const handleGenerate = async () => {
    setStep("generating");

    const input: SessionGenerationInput = {
      format,
      cycle,
      valences,
      groupLevel,
      focus,
      includePlyometrics,
      includeLMF,
    };

    try {
      const session = await generateSession.mutateAsync(input);
      setGeneratedSession(session);
      setStep("preview");
    } catch {
      setStep("config");
    }
  };

  const handleConfirm = () => {
    if (generatedSession && onSessionGenerated) {
      onSessionGenerated(generatedSession);
    }
    handleClose();
  };

  const handleClose = () => {
    setStep("format");
    setGeneratedSession(null);
    onOpenChange(false);
  };

  const canProceedToConfig = format && cycle && valences.length > 0;
  const canGenerate = canProceedToConfig && groupLevel && focus;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Sessão com IA
          </DialogTitle>
          <DialogDescription>
            {step === "format" && "Escolha o formato e objetivos da sessão"}
            {step === "config" && "Configure o grupo e opções avançadas"}
            {step === "generating" && "Montando sua sessão Back to Basics..."}
            {step === "preview" && "Revise a sessão gerada"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Format */}
          {step === "format" && (
            <div className="space-y-6 py-4">
              {/* Format Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Formato da Sessão</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SESSION_FORMATS).map(([key, config]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-all ${
                        format === key
                          ? "ring-2 ring-primary border-primary"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setFormat(key as "tradicional" | "time_efficient")}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{config.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {config.duration} min
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Cycle Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Ciclo de Periodização</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(PERIODIZATION_CYCLES).map(([key, config]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-all ${
                        cycle === key
                          ? "ring-2 ring-primary border-primary"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setCycle(key as "s1" | "s2" | "s3" | "s4")}
                    >
                      <CardContent className="p-3 text-center">
                        <span className="text-sm font-medium">{key.toUpperCase()}</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.name}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Valences Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Valências do Treino</Label>
                  <span className="text-xs text-muted-foreground">
                    {valences.length}/2 selecionadas
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TRAINING_VALENCES) as (keyof typeof TRAINING_VALENCES)[]).map((key) => (
                    <Badge
                      key={key}
                      variant={valences.includes(key) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1.5"
                      onClick={() => handleValenceToggle(key)}
                    >
                      {TRAINING_VALENCES[key]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Config */}
          {step === "config" && (
            <div className="space-y-6 py-4">
              {/* Group Level */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Nível Médio do Grupo</Label>
                <Select value={groupLevel} onValueChange={(v) => setGroupLevel(v as typeof groupLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_LEVELS.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Focus */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Foco da Sessão</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FOCUS_OPTIONS.map((opt) => (
                    <Card
                      key={opt.id}
                      className={`cursor-pointer transition-all ${
                        focus === opt.id
                          ? "ring-2 ring-primary border-primary"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setFocus(opt.id as typeof focus)}
                    >
                      <CardContent className="p-3 text-center">
                        <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Opções</Label>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="plyometrics"
                    checked={includePlyometrics}
                    onCheckedChange={(checked) => setIncludePlyometrics(!!checked)}
                    disabled={groupLevel === "iniciante" || cycle === "s1"}
                  />
                  <div>
                    <Label htmlFor="plyometrics" className="text-sm font-medium">
                      Incluir Pliometria
                    </Label>
                    {(groupLevel === "iniciante" || cycle === "s1") && (
                      <p className="text-xs text-muted-foreground">
                        Disponível apenas para intermediário+ em ciclos S2+
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="lmf"
                    checked={includeLMF}
                    onCheckedChange={(checked) => setIncludeLMF(!!checked)}
                    disabled={format === "time_efficient"}
                  />
                  <div>
                    <Label htmlFor="lmf" className="text-sm font-medium">
                      Incluir LMF (Liberação Miofascial)
                    </Label>
                    {format === "time_efficient" && (
                      <p className="text-xs text-muted-foreground">
                        Não disponível no formato Time Efficient
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Resumo</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {SESSION_FORMATS[format].name}
                  </Badge>
                  <Badge variant="secondary">
                    {cycle.toUpperCase()} - {PERIODIZATION_CYCLES[cycle].name}
                  </Badge>
                  {valences.map((v) => (
                    <Badge key={v} variant="outline">
                      {TRAINING_VALENCES[v]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Montando sua sessão...</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Selecionando exercícios, validando core triplanar e gerando script de mindfulness
              </p>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === "preview" && generatedSession && (
            <div className="space-y-6 py-4">
              {/* Header */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{generatedSession.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {generatedSession.totalDuration} min
                  </Badge>
                  <Badge variant="secondary">
                    <Layers className="h-3 w-3 mr-1" />
                    {generatedSession.phases.length} fases
                  </Badge>
                  {generatedSession.valences.map((v) => (
                    <Badge key={v} variant="outline">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Core Triplanar Check */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Core Triplanar</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    {generatedSession.coreTriplanarCheck.anti_extensao ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-xs">Anti-extensão</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {generatedSession.coreTriplanarCheck.anti_flexao_lateral ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-xs">Anti-flexão lateral</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {generatedSession.coreTriplanarCheck.anti_rotacao ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-xs">Anti-rotação</span>
                  </div>
                </CardContent>
              </Card>

              {/* Phases */}
              <div className="space-y-4">
                {generatedSession.phases.map((phase) => (
                  <Card key={phase.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{phase.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {phase.duration} min
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {phase.blocks.map((block) => (
                        <div key={block.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{block.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {block.method}
                            </Badge>
                          </div>
                          {block.exercises.length > 0 ? (
                            <ul className="space-y-1 ml-4">
                              {block.exercises.map((ex) => (
                                <li key={ex.id} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                  {ex.name}
                                  <span className="text-xs">
                                    ({ex.sets}×{ex.reps})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : block.notes ? (
                            <p className="text-sm text-muted-foreground ml-4">{block.notes}</p>
                          ) : null}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Motivational */}
              {generatedSession.motivationalPhrase && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-4">
                    <p className="text-sm italic text-center">
                      "{generatedSession.motivationalPhrase}"
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          {step === "format" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep("config")}
                disabled={!canProceedToConfig}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {step === "config" && (
            <>
              <Button variant="outline" onClick={() => setStep("format")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || generateSession.isPending}
                variant="gradient"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Sessão
              </Button>
            </>
          )}

          {step === "generating" && (
            <div className="w-full text-center text-sm text-muted-foreground">
              Aguarde...
            </div>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("config")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ajustar
              </Button>
              <Button onClick={handleConfirm} variant="gradient">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Usar Sessão
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
