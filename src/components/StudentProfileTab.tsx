import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Activity, Target, AlertCircle, Edit } from "lucide-react";
import type { Student } from "@/hooks/useStudents";
import { getObjectiveLabel } from "@/constants/objectives";
import { differenceInYears } from "date-fns";

interface StudentProfileTabProps {
  student: Student;
  onEdit: () => void;
}

const calculateAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  return differenceInYears(new Date(), new Date(birthDate));
};

const calculateIMC = (weight: number | null, height: number | null): number | null => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

export const StudentProfileTab = ({ student, onEdit }: StudentProfileTabProps) => {
  const age = calculateAge(student.birth_date);
  const imc = calculateIMC(student.weight_kg, student.height_cm);

  return (
    <div className="space-y-md">
      {/* Botão Editar Perfil */}
      <div className="flex justify-end">
        <Button onClick={onEdit} variant="outline">
          <Edit className="h-4 w-4 mr-xs" />
          Editar Perfil
        </Button>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-xs text-lg">
              <User className="h-5 w-5 text-primary" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-sm">
            <div className="flex items-center gap-md">
              <Avatar className="h-16 w-16">
                <AvatarImage src={student.avatar_url || undefined} alt={student.name} />
                <AvatarFallback className="text-lg">{student.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-base">{student.name}</p>
                {age && <p className="text-sm text-muted-foreground">{age} anos</p>}
              </div>
            </div>
            {student.birth_date && (
              <div>
                <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                <p className="text-sm">
                  {new Date(student.birth_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dados Físicos e Biométricos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-xs text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Dados Físicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-sm">
            <div className="grid grid-cols-2 gap-sm">
              {student.weight_kg && (
                <div>
                  <p className="text-xs text-muted-foreground">Peso</p>
                  <p className="text-sm font-medium">{student.weight_kg} kg</p>
                </div>
              )}
              {student.height_cm && (
                <div>
                  <p className="text-xs text-muted-foreground">Altura</p>
                  <p className="text-sm font-medium">{student.height_cm} cm</p>
                </div>
              )}
              {imc && (
                <div>
                  <p className="text-xs text-muted-foreground">IMC</p>
                  <p className="text-sm font-medium">{imc.toFixed(1)}</p>
                </div>
              )}
              {student.max_heart_rate && (
                <div>
                  <p className="text-xs text-muted-foreground">FC Máx</p>
                  <p className="text-sm font-medium">{student.max_heart_rate} bpm</p>
                </div>
              )}
            </div>
            {student.fitness_level && (
              <div>
                <p className="text-xs text-muted-foreground">Nível de Condicionamento</p>
                <Badge variant="secondary" className="mt-1">
                  {student.fitness_level === "iniciante" && "Iniciante"}
                  {student.fitness_level === "intermediario" && "Intermediário"}
                  {student.fitness_level === "avancado" && "Avançado"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planejamento de Treino */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-xs text-lg">
              <Target className="h-5 w-5 text-primary" />
              Planejamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-sm">
            <div>
              <p className="text-xs text-muted-foreground">Sessões por Semana</p>
              <p className="text-sm font-medium">{student.weekly_sessions_proposed}x</p>
            </div>
            {student.objectives && student.objectives.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Objetivos</p>
                <div className="flex flex-wrap gap-xs">
                  {student.objectives.map((objective) => (
                    <Badge key={objective} variant="default">
                      {getObjectiveLabel(objective)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {student.preferences && (
              <div>
                <p className="text-xs text-muted-foreground">Preferências</p>
                <p className="text-sm whitespace-pre-wrap">{student.preferences}</p>
              </div>
            )}
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
          <CardContent className="space-y-sm">
            {student.limitations && (
              <div>
                <p className="text-xs text-muted-foreground">Limitações</p>
                <p className="text-sm whitespace-pre-wrap">{student.limitations}</p>
              </div>
            )}
            {student.injury_history && (
              <div>
                <p className="text-xs text-muted-foreground">Histórico de Lesões</p>
                <p className="text-sm whitespace-pre-wrap">{student.injury_history}</p>
              </div>
            )}
            {!student.limitations && !student.injury_history && (
              <p className="text-sm text-muted-foreground">Nenhuma restrição médica cadastrada</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentProfileTab;
