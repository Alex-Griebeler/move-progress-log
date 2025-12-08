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
import { useAnamnesis, useCreateAnamnesis, useUpdateAnamnesis, PainHistory, Surgery, Sport, RedFlags, LateralityType } from "@/hooks/useAnamnesis";
import { LoadingState } from "@/components/LoadingState";

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

const RED_FLAGS_LIST = [
  { key: "unexplained_weight_loss", label: "Perda de peso inexplicada" },
  { key: "night_pain", label: "Dor noturna que acorda" },
  { key: "fever", label: "Febre recente" },
  { key: "bladder_bowel_dysfunction", label: "Problemas de bexiga/intestino" },
  { key: "progressive_weakness", label: "Fraqueza progressiva" },
  { key: "recent_trauma", label: "Trauma recente" },
];

export function AssessmentAnamnesisTab({ assessmentId, canEdit }: AssessmentAnamnesisTabProps) {
  const { data: anamnesis, isLoading } = useAnamnesis(assessmentId);
  const createMutation = useCreateAnamnesis();
  const updateMutation = useUpdateAnamnesis();

  // Form state
  const [birthDate, setBirthDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [laterality, setLaterality] = useState<LateralityType | "">("");
  const [occupation, setOccupation] = useState("");
  const [workType, setWorkType] = useState("");
  const [sedentaryHours, setSedentaryHours] = useState<number>(8);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<number>(5);
  const [activityFrequency, setActivityFrequency] = useState<number>(0);
  const [activityDuration, setActivityDuration] = useState<number>(0);
  const [objectives, setObjectives] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("");
  const [painHistory, setPainHistory] = useState<PainHistory[]>([]);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [redFlags, setRedFlags] = useState<RedFlags>({});
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

  const hasRedFlags = Object.values(redFlags).some(v => v === true);

  const handleSave = async () => {
    const data = {
      birth_date: birthDate || undefined,
      weight_kg: weightKg ? parseFloat(weightKg) : undefined,
      height_cm: heightCm ? parseFloat(heightCm) : undefined,
      laterality: (laterality as LateralityType) || undefined,
      occupation: occupation || undefined,
      work_type: workType || undefined,
      sedentary_hours_per_day: sedentaryHours,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      activity_frequency: activityFrequency,
      activity_duration_minutes: activityDuration,
      objectives: objectives || undefined,
      time_horizon: timeHorizon || undefined,
      pain_history: painHistory,
      surgeries,
      sports,
      red_flags: redFlags,
      lgpd_consent: lgpdConsent,
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
    setPainHistory([...painHistory, { location: "", duration: "", intensity: 5, frequency: "" }]);
  };

  const removePainEntry = (index: number) => {
    setPainHistory(painHistory.filter((_, i) => i !== index));
  };

  const addSurgery = () => {
    setSurgeries([...surgeries, { procedure: "", date: "", notes: "" }]);
  };

  const removeSurgery = (index: number) => {
    setSurgeries(surgeries.filter((_, i) => i !== index));
  };

  const addSport = () => {
    setSports([...sports, { name: "", frequency_per_week: 1, years_practicing: 1 }]);
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
                onValueChange={(v) => setLaterality(v as LateralityType)}
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
                    updated[index] = { ...updated[index], name: e.target.value };
                    setSports(updated);
                  }}
                  disabled={!canEdit}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="x/semana"
                  value={sport.frequency_per_week}
                  onChange={(e) => {
                    const updated = [...sports];
                    updated[index] = { ...updated[index], frequency_per_week: parseInt(e.target.value) || 1 };
                    setSports(updated);
                  }}
                  disabled={!canEdit}
                  className="w-24"
                />
                <Input
                  type="number"
                  placeholder="Anos"
                  value={sport.years_practicing}
                  onChange={(e) => {
                    const updated = [...sports];
                    updated[index] = { ...updated[index], years_practicing: parseInt(e.target.value) || 1 };
                    setSports(updated);
                  }}
                  disabled={!canEdit}
                  className="w-24"
                />
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
                placeholder="Localização (ex: lombar, ombro direito)"
                value={pain.location}
                onChange={(e) => {
                  const updated = [...painHistory];
                  updated[index] = { ...updated[index], location: e.target.value };
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
                  updated[index] = { ...updated[index], duration: e.target.value };
                  setPainHistory(updated);
                }}
                disabled={!canEdit}
                className="w-32"
              />
              <Input
                placeholder="Frequência"
                value={pain.frequency}
                onChange={(e) => {
                  const updated = [...painHistory];
                  updated[index] = { ...updated[index], frequency: e.target.value };
                  setPainHistory(updated);
                }}
                disabled={!canEdit}
                className="w-32"
              />
              <div className="flex items-center gap-2 w-28">
                <Label className="text-xs whitespace-nowrap">Int:</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={pain.intensity}
                  onChange={(e) => {
                    const updated = [...painHistory];
                    updated[index] = { ...updated[index], intensity: parseInt(e.target.value) || 5 };
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
            <div key={index} className="flex gap-2 items-start">
              <Input
                placeholder="Procedimento"
                value={surgery.procedure}
                onChange={(e) => {
                  const updated = [...surgeries];
                  updated[index] = { ...updated[index], procedure: e.target.value };
                  setSurgeries(updated);
                }}
                disabled={!canEdit}
                className="flex-1"
              />
              <Input
                placeholder="Data (ex: 2020)"
                value={surgery.date}
                onChange={(e) => {
                  const updated = [...surgeries];
                  updated[index] = { ...updated[index], date: e.target.value };
                  setSurgeries(updated);
                }}
                disabled={!canEdit}
                className="w-32"
              />
              <Input
                placeholder="Notas"
                value={surgery.notes || ""}
                onChange={(e) => {
                  const updated = [...surgeries];
                  updated[index] = { ...updated[index], notes: e.target.value };
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
          <CardDescription>Sinais de alerta que requerem encaminhamento médico</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {RED_FLAGS_LIST.map((flag) => (
            <div key={flag.key} className="flex items-center space-x-2">
              <Checkbox
                id={flag.key}
                checked={(redFlags as Record<string, boolean>)[flag.key] || false}
                onCheckedChange={(checked) => {
                  setRedFlags({ ...redFlags, [flag.key]: !!checked });
                }}
                disabled={!canEdit}
              />
              <Label htmlFor={flag.key} className="cursor-pointer">{flag.label}</Label>
            </div>
          ))}
          {hasRedFlags && (
            <Badge variant="destructive" className="mt-2">
              Atenção: Red flags identificados - considerar encaminhamento médico
            </Badge>
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
            <Label htmlFor="objectives">Objetivos Principais</Label>
            <Textarea
              id="objectives"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              disabled={!canEdit}
              placeholder="Descreva os objetivos do aluno..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Horizonte de Tempo</Label>
            <Select value={timeHorizon} onValueChange={setTimeHorizon} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIME_HORIZONS.map((th) => (
                  <SelectItem key={th.value} value={th.value}>{th.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* LGPD Consent */}
      <Card>
        <CardHeader>
          <CardTitle>Consentimento LGPD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="lgpd"
              checked={lgpdConsent}
              onCheckedChange={(checked) => setLgpdConsent(!!checked)}
              disabled={!canEdit}
            />
            <Label htmlFor="lgpd" className="cursor-pointer text-sm">
              O aluno consente com o armazenamento e processamento de seus dados de saúde conforme a LGPD.
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
            Salvar Anamnese
          </Button>
        </div>
      )}
    </div>
  );
}
