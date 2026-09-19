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
  /**
   * UX-14: dentro de um accordion que já diz "Zonas de frequência cardíaca
   * (FCmáx N bpm)", a lista entra sem card, sem título e sem a frase da
   * FCmáx — a mesma informação não aparece três vezes, caixa dentro de caixa.
   */
  embedded?: boolean;
}

const ZoneList = ({ maxHeartRate }: { maxHeartRate: number }) => (
  <div className="space-y-3">
    {TRAINING_ZONES.map((zone) => {
      const minBpm = Math.round((zone.minPercent / 100) * maxHeartRate);
      const maxBpm = Math.round((zone.maxPercent / 100) * maxHeartRate);

      return (
        <div key={zone.name} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div aria-hidden="true" className={`w-3 h-3 rounded-full ${zone.color}`} />
              <span className="font-semibold text-sm">{zone.name}</span>
            </div>
            <Badge variant="outline" className="tabular-nums">
              {minBpm}–{maxBpm} bpm
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground pl-5">
            <span>{zone.description}</span>
            <span className="tabular-nums">{zone.minPercent}–{zone.maxPercent}%</span>
          </div>
        </div>
      );
    })}
  </div>
);

const TrainingZonesCard = ({ maxHeartRate, embedded = false }: TrainingZonesCardProps) => {
  if (!maxHeartRate) {
    if (embedded) {
      return (
        <p className="text-muted-foreground text-sm">
          Cadastre a FC máxima para ver as zonas de treinamento.
        </p>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" aria-hidden="true" />
            Zonas de treinamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Cadastre a FC máxima para ver as zonas de treinamento.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (embedded) return <ZoneList maxHeartRate={maxHeartRate} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" aria-hidden="true" />
          Zonas de treinamento
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Baseado em FC máxima de {maxHeartRate} bpm
        </p>
      </CardHeader>
      <CardContent>
        <ZoneList maxHeartRate={maxHeartRate} />
      </CardContent>
    </Card>
  );
};

export default TrainingZonesCard;
