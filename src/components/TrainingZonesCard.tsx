import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";

interface TrainingZone {
  name: string;
  minPercent: number;
  maxPercent: number;
  color: string;
  description: string;
}

const TRAINING_ZONES: TrainingZone[] = [
  {
    name: "Zona 1 - Recuperação",
    minPercent: 50,
    maxPercent: 60,
    color: "bg-blue-500",
    description: "Recuperação ativa"
  },
  {
    name: "Zona 2 - Aeróbico",
    minPercent: 60,
    maxPercent: 70,
    color: "bg-green-500",
    description: "Base aeróbica"
  },
  {
    name: "Zona 3 - Limiar",
    minPercent: 70,
    maxPercent: 80,
    color: "bg-yellow-500",
    description: "Ritmo sustentável"
  },
  {
    name: "Zona 4 - Anaeróbico",
    minPercent: 80,
    maxPercent: 90,
    color: "bg-orange-500",
    description: "Alta intensidade"
  },
  {
    name: "Zona 5 - VO2max",
    minPercent: 90,
    maxPercent: 100,
    color: "bg-red-500",
    description: "Esforço máximo"
  }
];

interface TrainingZonesCardProps {
  maxHeartRate?: number | null;
}

const TrainingZonesCard = ({ maxHeartRate }: TrainingZonesCardProps) => {
  if (!maxHeartRate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Zonas de Treinamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Configure a FC máxima do aluno para visualizar as zonas de treinamento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Zonas de Treinamento
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Baseado em FC máxima de {maxHeartRate} bpm
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {TRAINING_ZONES.map((zone) => {
          const minBpm = Math.round((zone.minPercent / 100) * maxHeartRate);
          const maxBpm = Math.round((zone.maxPercent / 100) * maxHeartRate);

          return (
            <div key={zone.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${zone.color}`} />
                  <span className="font-semibold text-sm">{zone.name}</span>
                </div>
                <Badge variant="outline">
                  {minBpm}-{maxBpm} bpm
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pl-5">
                <span>{zone.description}</span>
                <span>{zone.minPercent}-{zone.maxPercent}%</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TrainingZonesCard;
