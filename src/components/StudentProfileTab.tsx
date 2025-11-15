import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Activity, Target, AlertCircle } from "lucide-react";
import type { Student } from "@/hooks/useStudents";
import { getObjectiveLabel } from "@/constants/objectives";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface StudentProfileTabProps {
  student: Student;
  onEdit: () => void;
}

const OBJECTIVES_OPTIONS = [
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "saude_longevidade", label: "Saúde & Longevidade" },
  { value: "performance_esportiva", label: "Performance Esportiva" },
  { value: "reabilitacao", label: "Reabilitação" },
];

export const StudentProfileTab = ({ student, onEdit }: StudentProfileTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: student.name,
    birth_date: student.birth_date || "",
    weight_kg: student.weight_kg || "",
    height_cm: student.height_cm || "",
    max_heart_rate: student.max_heart_rate || "",
    fitness_level: student.fitness_level || "",
    weekly_sessions_proposed: student.weekly_sessions_proposed || "",
    objectives: student.objectives || [],
    preferences: student.preferences || "",
    limitations: student.limitations || "",
    injury_history: student.injury_history || "",
  });

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("students")
        .update({
          name: formData.name,
          birth_date: formData.birth_date || null,
          weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
          height_cm: formData.height_cm ? Number(formData.height_cm) : null,
          max_heart_rate: formData.max_heart_rate ? Number(formData.max_heart_rate) : null,
          fitness_level: formData.fitness_level || null,
          weekly_sessions_proposed: formData.weekly_sessions_proposed ? Number(formData.weekly_sessions_proposed) : null,
          objectives: formData.objectives.length > 0 ? formData.objectives : null,
          preferences: formData.preferences || null,
          limitations: formData.limitations || null,
          injury_history: formData.injury_history || null,
        })
        .eq("id", student.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      setIsEditing(false);
      onEdit(); // Trigger refetch
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil");
    }
  };

  const handleCancel = () => {
    setFormData({
      name: student.name,
      birth_date: student.birth_date || "",
      weight_kg: student.weight_kg || "",
      height_cm: student.height_cm || "",
      max_heart_rate: student.max_heart_rate || "",
      fitness_level: student.fitness_level || "",
      weekly_sessions_proposed: student.weekly_sessions_proposed || "",
      objectives: student.objectives || [],
      preferences: student.preferences || "",
      limitations: student.limitations || "",
      injury_history: student.injury_history || "",
    });
    setIsEditing(false);
  };

  const toggleObjective = (objective: string) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.includes(objective)
        ? prev.objectives.filter(o => o !== objective)
        : [...prev.objectives, objective]
    }));
  };

  return (
    <div className="space-y-lg">
      {/* Action Button */}
      <div className="flex justify-end">
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="default">
            Editar Perfil
          </Button>
        ) : (
          <div className="flex gap-sm">
            <Button onClick={handleCancel} variant="outline">
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Alterações
            </Button>
          </div>
        )}
      </div>

      {/* Form Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-xs text-lg">
              <User className="h-5 w-5 text-primary" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="space-y-xs">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-xs">
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados Físicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-xs text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Dados Físicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-xs">
                <Label htmlFor="weight_kg">Peso (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-xs">
                <Label htmlFor="height_cm">Altura (cm)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-xs">
              <Label htmlFor="max_heart_rate">FC Máxima (bpm)</Label>
              <Input
                id="max_heart_rate"
                type="number"
                value={formData.max_heart_rate}
                onChange={(e) => setFormData({ ...formData, max_heart_rate: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-xs">
              <Label htmlFor="fitness_level">Nível de Condicionamento</Label>
              <Select
                value={formData.fitness_level}
                onValueChange={(value) => setFormData({ ...formData, fitness_level: value })}
                disabled={!isEditing}
              >
                <SelectTrigger id="fitness_level">
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Planejamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-xs text-lg">
              <Target className="h-5 w-5 text-primary" />
              Planejamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="space-y-xs">
              <Label htmlFor="weekly_sessions">Sessões por Semana</Label>
              <Input
                id="weekly_sessions"
                type="number"
                value={formData.weekly_sessions_proposed}
                onChange={(e) => setFormData({ ...formData, weekly_sessions_proposed: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-xs">
              <Label>Objetivos</Label>
              <div className="space-y-sm">
                {OBJECTIVES_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-xs">
                    <Checkbox
                      id={option.value}
                      checked={formData.objectives.includes(option.value)}
                      onCheckedChange={() => toggleObjective(option.value)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor={option.value} className="font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-xs">
              <Label htmlFor="preferences">Preferências</Label>
              <Textarea
                id="preferences"
                value={formData.preferences}
                onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                disabled={!isEditing}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Considerações Médicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-xs text-lg">
              <AlertCircle className="h-5 w-5 text-primary" />
              Considerações Médicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="space-y-xs">
              <Label htmlFor="limitations">Limitações</Label>
              <Textarea
                id="limitations"
                value={formData.limitations}
                onChange={(e) => setFormData({ ...formData, limitations: e.target.value })}
                disabled={!isEditing}
                rows={3}
                placeholder="Descreva limitações físicas ou restrições..."
              />
            </div>
            <div className="space-y-xs">
              <Label htmlFor="injury_history">Histórico de Lesões</Label>
              <Textarea
                id="injury_history"
                value={formData.injury_history}
                onChange={(e) => setFormData({ ...formData, injury_history: e.target.value })}
                disabled={!isEditing}
                rows={3}
                placeholder="Descreva lesões anteriores ou cirurgias..."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentProfileTab;
