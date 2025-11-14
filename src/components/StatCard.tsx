import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  gradient?: boolean;
  onClick?: () => void;
  progress?: number; // 0-100 percentage
  badge?: string;
  trend?: {
    value: number;
    label: string;
  };
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  subtitle, 
  gradient, 
  onClick,
  progress,
  badge,
  trend
}: StatCardProps) => {
  return (
    <Card 
      className={`animate-fade-in card-glass-hover transition-smooth ${gradient ? 'bg-gradient-card border-primary/20' : ''} ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <CardHeader className="pb-sm">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground leading-normal">{title}</CardTitle>
          <div className={`p-sm rounded-md ${gradient ? 'bg-gradient-primary' : 'bg-secondary'}`}>
            <Icon className={`h-4 w-4 ${gradient ? 'text-primary-foreground' : 'text-primary'}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-sm">
        <div className="flex items-baseline gap-xs">
          <div className="text-3xl font-bold leading-tight text-gradient-primary">
            {value}
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-xs font-semibold ${
              trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {trend.value > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend.value < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              <span>{trend.label}</span>
            </div>
          )}
        </div>

        {subtitle && <p className="text-xs text-muted-foreground leading-normal">{subtitle}</p>}
        
        {progress !== undefined && (
          <div className="space-y-xs">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% da meta</p>
          </div>
        )}

        {badge && (
          <Badge variant="secondary" className="text-xs font-medium">
            {badge}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
