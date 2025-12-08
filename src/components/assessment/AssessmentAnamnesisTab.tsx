import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Plus, X, AlertTriangle } from "lucide-react";
import { useAnamnesis, useCreateAnamnesis, useUpdateAnamnesis } from "@/hooks/useAnamnesis";
import { LoadingState } from "@/components/LoadingState";
import { notify } from "@/lib/notify";

interface AssessmentAnamnesisTabProps {
  assessmentId: string;
  canEdit: boolean;
}

const WORK_TYPES = [
  { value: "sedentary", label: "Sedentário (escritório)" },
  { value: "light", label: "Leve (em pé, caminhadas)" },
  { value: "moderate", label: "Moderado (esforço físico moderado)" },
  { value: "heavy", label: "Pesado (trabalho braçal)" },
];

const LATERALITY_OPTIONS = [
  { value: "right", label: "Destro" },
  { value: "left", label: "Canhoto" },
  { value: "ambidextrous", label: "Ambidestro" },
];

const TIME_HORIZONS = [
  { value: "short", label: "Curto prazo (até 3 meses)" },
  { value: "medium", label: "Médio prazo (3-6 meses)" },
  { value: "long", label: "Longo prazo (6+ meses)" },
];

const RED_FLAGS = [
  { key: "unexplained_weight_loss", label: "Perda de peso inexplicada" },
  { key: "night_pain", label: "Dor noturna que acorda" },
  { key: "fever", label: "Febre recente" },
  { key: "numbness", label: "Dormência ou formigamento" },
  { key: "bladder_issues", label: "Problemas de bexiga/intestino" },
  { key: "progressive_weakness", label: "Fraqueza progressiva" },
  { key: "cancer_history", label: "Histórico de câncer" },
  { key: "steroid_use", label: "Uso prolongado de corticoides" },
];

export function AssessmentAnamnesisTab({ assessmentId, canEdit }: AssessmentAnamnesisTabProps) {
  const { data: anamnesis, isLoading } = useAnamnesis(assessmentId);
  const createMutation = useCreateAnamnesis();
  const updateMutation = useUpdateAnamnesis();

  // Form state
  const [birthDate, setBirthDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [laterality, setLaterality] = useState<string>("");
  const [occupation, setOccupation] = useState("");
  const [workType, setWorkType] = useState("");
  const [sedentaryHours, setSedentaryHours] = useState<number>(8);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<number>(5);
  const [activityFrequency, setActivityFrequency] = useState<number>(0);
  const [activityDuration, setActivityDuration] = useState<number>(0);
  const [objectives, setObjectives] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("");
  const [painHistory, setPainHistory] = useState<Array<{ region: string; duration: string; intensity: number }>>([]);
  const [surgeries, setSurgeries] = useState<Array<{ type: string; year: string; notes: string }>>([]);
  const [sports, setSports] = useState<Array<{ name: string; frequency: string; level: string }>>([]);
  const [redFlags, setRedFlags] = useState<Record<string, boolean>>({});
  const [lgpdConsent, setLgpdConsent] = useState(false);

  // Load existing data
  useEffect(() => {
    if (anamnesis) {
      setBirthDate(anamnesis.birth_date || "");
      setWeightKg(anamnesis.weight_kg?.toString() || "");
      setHeightCm(anamnesis.height_cm?.toString() || "");
      setLaterality(anamnesis.laterality || "");
      setOccupation(anamnesis.occupation || "");
      setWorkType(anamnesis.work_type || "");
      setSedentaryHours(anamnesis.sedentary_hours_per_day || 8);
      setSleepHours(anamnesis.sleep_hours || 7);
      setSleepQuality(anamnesis.sleep_quality || 5);
      setActivityFrequency(anamnesis.activity_frequency || 0);
      setActivityDuration(anamnesis.activity_duration_minutes || 0);
      setObjectives(anamnesis.objectives || "");
      setTimeHorizon(anamnesis.time_horizon || "");
      setPainHistory(anamnesis.pain_history || []);
      setSurgeries(anamnesis.surgeries || []);
      setSports(anamnesis.sports || []);
      setRedFlags(anamnesis.red_flags || {});
      setLgpdConsent(anamnesis.lgpd_consent || false);
    }
  }, [anamnesis]);

  const hasRedFlags = Object.values(redFlags).some(v => v);

  const handleSave = async () => {
    const data = {
      birth_date: birthDate || null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      laterality: laterality as any || null,
      occupation: occupation || null,
      work_type: workType || null,
      sedentary_hours_per_day: sedentaryHours,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      activity_frequency: activityFrequency,
      activity_duration_minutes: activityDuration,
      objectives: objectives || null,
      time_horizon: timeHorizon || null,
      pain_history: painHistory,
      surgeries,
      sports,
      red_flags: redFlags,
      has_red_flags: hasRedFlags,
      lgpd_consent: lgpdConsent,
      lgpd_consent_date: lgpdConsent ? new Date().toISOString() : null,
    };

    try {
      if (anamnesis) {
        await updateMutation.mutateAsync({ id: anamnesis.id, ...data });
      } else {
        await createMutation.mutateAsync({ assessment_id: assessmentId, ...data });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const addPainEntry = () => {
    setPainHistory([...painHistory, { region: "", duration: "", intensity: 5 }]);
  };

  const removePainEntry = (index: number) => {
    setPainHistory(painHistory.filter((_, i) => i !== index));
  };

  const addSurgery = () => {
    setSurgeries([...surgeries, { type: "", year: "", notes: "" }]);
  };

  const removeSurgery = (index: number) => {
    setSurgeries(surgeries.filter((_, i) => i !== index));
  };

  const addSport = () => {
    setSports([...sports, { name: "", frequency: "", level: "" }]);
  };

  const removeSport = (index: number) => {
    setSports(sports.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <LoadingState text="Carregando anamnese..." />;
  }

  return (
    <div className="space-y-lg">
      {/* Personal Data */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Informações básicas do aluno</CardDescription>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                disabled={!canEdit}
                placeholder="75.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                disabled={!canEdit}
                placeholder="175"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="space-y-2">
              <Label>Lateralidade</Label>
              <RadioGroup 
                value={laterality} 
                onValueChange={setLaterality}
                disabled={!canEdit}
                className="flex gap-4"
              >
                {LATERALITY_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`lat-${opt.value}`} />
                    <Label htmlFor={`lat-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work & Lifestyle */}
      <Card>
        <CardHeader>
          <CardTitle>Trabalho e Estilo de Vida</CardTitle>
          <CardDescription>Rotina profissional e hábitos diários</CardDescription>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="space-y-2">
              <Label htmlFor="occupation">Ocupação</Label>
              <Input
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                disabled={!canEdit}
                placeholder="Ex: Empresário, Médico, Advogado"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Trabalho</Label>
              <Select value={workType} onValueChange={setWorkType} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_TYPES.map((wt) => (
                    <SelectItem key={wt.value} value={wt.value}>{wt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Horas sedentárias por dia: {sedentaryHours}h</Label>
            <Slider
              value={[sedentaryHours]}
              onValueChange={([v]) => setSedentaryHours(v)}
              min={0}
              max={16}
              step={1}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sleep */}
      <Card>
        <CardHeader>
          <CardTitle>Sono</CardTitle>
          <CardDescription>Qualidade e duração do sono</CardDescription>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="space-y-3">
              <Label>Horas de sono por noite: {sleepHours}h</Label>
              <Slider
                value={[sleepHours]}
                onValueChange={([v]) => setSleepHours(v)}
                min={4}
                max={12}
                step={0.5}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-3">
              <Label>Qualidade do sono (1-10): {sleepQuality}</Label>
              <Slider
                value={[sleepQuality]}
                onValueChange={([v]) => setSleepQuality(v)}
                min={1}
                max={10}
                step={1}
                disabled={!canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physical Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Física</CardTitle>
          <CardDescription>Nível atual de atividade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="space-y-3">
              <Label>Frequência semanal: {activityFrequency}x</Label>
              <Slider
                value={[activityFrequency]}
                onValueChange={([v]) => setActivityFrequency(v)}
                min={0}
                max={7}
                step={1}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-3">
              <Label>Duração média (min): {activityDuration}</Label>
              <Slider
                value={[activityDuration]}
                onValueChange={([v]) => setActivityDuration(v)}
                min={0}
                max={180}
                step={15}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Sports */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Esportes Praticados</Label>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={addSport}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </div>
            {sports.map((sport, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  placeholder="Esporte"
                  value={sport.name}
                  onChange={(e) => {
                    const updated = [...sports];
                    updated[index].name = e.target.value;
                    setSports(updated);
                  }}
                  disabled={!canEdit}
                  className="flex-1"
                />
                <Input
                  placeholder="Frequência"
                  value={sport.frequency}
                  onChange={(e) => {
                    const updated = [...sports];
                    updated[index].frequency = e.target.value;
                    setSports(updated);
                  }}
                  disabled={!canEdit}
                  className="w-32"
                />
                <Select 
                  value={sport.level} 
                  onValueChange={(v) => {
                    const updated = [...sports];
                    updated[index].level = v;
                    setSports(updated);
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                    <SelectItem value="professional">Profissional</SelectItem>
                  </SelectContent>
                </Select>
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => removeSport(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pain History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Dor</CardTitle>
          <CardDescription>Dores atuais ou recorrentes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {painHistory.length === 0 ? "Nenhum registro de dor" : `${painHistory.length} registro(s)`}
            </span>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={addPainEntry}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            )}
          </div>
          {painHistory.map((pain, index) => (
            <div key={index} className="flex gap-2 items-start p-3 bg-muted/30 rounded-lg">
              <Input
                placeholder="Região (ex: lombar, ombro direito)"
                value={pain.region}
                onChange={(e) => {
                  const updated = [...painHistory];
                  updated[index].region = e.target.value;
                  setPainHistory(updated);
                }}
                disabled={!canEdit}
                className="flex-1"
              />
              <Input
                placeholder="Duração (ex: 2 meses)"
                value={pain.duration}
                onChange={(e) => {
                  const updated = [...painHistory];
                  updated[index].duration = e.target.value;
                  setPainHistory(updated);
                }}
                disabled={!canEdit}
                className="w-32"
              />
              <div className="flex items-center gap-2 w-40">
                <Label className="text-xs whitespace-nowrap">Intensidade:</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={pain.intensity}
                  onChange={(e) => {
                    const updated = [...painHistory];
                    updated[index].intensity = parseInt(e.target.value) || 5;
                    setPainHistory(updated);
                  }}
                  disabled={!canEdit}
                  className="w-16"
                />
              </div>
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={() => removePainEntry(index)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Surgeries */}
      <Card>
        <CardHeader>
          <CardTitle>Cirurgias</CardTitle>
          <CardDescription>Histórico cirúrgico relevante</CardDescription>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {surgeries.length === 0 ? "Nenhuma cirurgia registrada" : `${surgeries.length} cirurgia(s)`}
            </span>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={addSurgery}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            )}
          </div>
          {surgeries.map((surgery, index) => (
            <div key={index} className="flex gap-2 items-start p-3 bg-muted/30 rounded-lg">
              <Input
                placeholder="Tipo de cirurgia"
                value={surgery.type}
                onChange={(e) => {
                  const updated = [...surgeries];
                  updated[index].type = e.target.value;
                  setSurgeries(updated);
                }}
                disabled={!canEdit}
                className="flex-1"
              />
              <Input
                placeholder="Ano"
                value={surgery.year}
                onChange={(e) => {
                  const updated = [...surgeries];
                  updated[index].year = e.target.value;
                  setSurgeries(updated);
                }}
                disabled={!canEdit}
                className="w-24"
              />
              <Input
                placeholder="Observações"
                value={surgery.notes}
                onChange={(e) => {
                  const updated = [...surgeries];
                  updated[index].notes = e.target.value;
                  setSurgeries(updated);
                }}
                disabled={!canEdit}
                className="flex-1"
              />
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={() => removeSurgery(index)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Red Flags */}
      <Card className={hasRedFlags ? "border-destructive" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasRedFlags && <AlertTriangle className="h-5 w-5 text-destructive" />}
            Red Flags
          </CardTitle>
          <CardDescription>Sinais de alerta que requerem atenção médica</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RED_FLAGS.map((flag) => (
              <div key={flag.key} className="flex items-center space-x-2">
                <Checkbox
                  id={flag.key}
                  checked={redFlags[flag.key] || false}
                  onCheckedChange={(checked) => {
                    setRedFlags({ ...redFlags, [flag.key]: !!checked });
                  }}
                  disabled={!canEdit}
                />
                <Label 
                  htmlFor={flag.key} 
                  className={`cursor-pointer ${redFlags[flag.key] ? "text-destructive font-medium" : ""}`}
                >
                  {flag.label}
                </Label>
              </div>
            ))}
          </div>
          {hasRedFlags && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
              <strong>Atenção:</strong> Um ou mais sinais de alerta foram identificados. 
              Considere encaminhamento médico antes de prosseguir com a avaliação física.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Objectives */}
      <Card>
        <CardHeader>
          <CardTitle>Objetivos</CardTitle>
          <CardDescription>Metas e expectativas do aluno</CardDescription>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="space-y-2">
            <Label htmlFor="objectives">Objetivos principais</Label>
            <Textarea
              id="objectives"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              disabled={!canEdit}
              placeholder="Descreva os principais objetivos do aluno..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Horizonte de tempo</Label>
            <RadioGroup 
              value={timeHorizon} 
              onValueChange={setTimeHorizon}
              disabled={!canEdit}
              className="flex flex-wrap gap-4"
            >
              {TIME_HORIZONS.map((th) => (
                <div key={th.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={th.value} id={`th-${th.value}`} />
                  <Label htmlFor={`th-${th.value}`} className="cursor-pointer">{th.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* LGPD Consent */}
      <Card>
        <CardHeader>
          <CardTitle>Consentimento LGPD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="lgpd"
              checked={lgpdConsent}
              onCheckedChange={(checked) => setLgpdConsent(!!checked)}
              disabled={!canEdit}
            />
            <Label htmlFor="lgpd" className="cursor-pointer text-sm leading-relaxed">
              Autorizo a coleta, armazenamento e processamento dos meus dados pessoais e de saúde 
              para fins de avaliação física e acompanhamento de treinamento, conforme a 
              Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={createMutation.isPending || updateMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar Anamnese"}
          </Button>
        </div>
      )}
    </div>
  );
}
