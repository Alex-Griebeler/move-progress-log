import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, TrendingUp } from "lucide-react";

interface WorkoutCardProps {
  name: string;
  exercises: number;
  date: string;
  totalVolume?: number;
}

const WorkoutCard = ({ name, exercises, date, totalVolume }: WorkoutCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{name}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{exercises} exercícios</span>
          {totalVolume && (
            <div className="flex items-center gap-1 text-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="font-semibold">{totalVolume}kg</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutCard;
