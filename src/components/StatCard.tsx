import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LucideIcon, TrendingUp, TrendingDown, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardTone = "default" | "success" | "warning" | "danger";

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
  /**
   * Visual tone for thresholded KPIs. Affects the icon container background
   * and the value color. "default" keeps the existing neutral look.
   */
  tone?: StatCardTone;
}

// Tom aplicado de verdade (antes os quatro tons viravam a mesma classe).
// Tokens recalibrados na Onda 1: ≥4,5:1 como texto nos dois temas.
// A cor nunca é o único portador: warning/danger levam ícone + rótulo.
const TONE_VALUE_CLASS: Record<StatCardTone, string> = {
  default: "text-foreground",
  success: "text-foreground",
  warning: "text-warning",
  danger: "text-destructive",
};

const TONE_ICON_CLASS: Record<StatCardTone, string> = {
  default: "bg-secondary text-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

const TONE_STATUS: Record<StatCardTone, { label: string; icon: LucideIcon; className: string } | null> = {
  default: null,
  success: { label: "Em dia", icon: CheckCircle2, className: "text-success" },
  warning: { label: "Atenção", icon: AlertTriangle, className: "text-warning" },
  danger: { label: "Prioridade", icon: AlertCircle, className: "text-destructive" },
};

const NO_DATA_VALUES = new Set(["—", "-", "--", ""]);

const StatCard = ({
  title,
  value,
  icon: Icon,
  subtitle,
  gradient,
  onClick,
  progress,
  badge,
  trend,
  tone: toneProp = "default"
}: StatCardProps) => {
  // Sem número, sem tom: um "—" vermelho diria "prioridade" sobre um dado ausente.
  const tone: StatCardTone =
    typeof value === "string" && NO_DATA_VALUES.has(value.trim()) ? "default" : toneProp;
  const status = TONE_STATUS[tone];
  const StatusIcon = status?.icon;

  return (
    <Card
      className={onClick ? "card-interactive" : undefined}
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
      <CardHeader className="pb-sm p-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-body-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn("p-sm rounded-md", TONE_ICON_CLASS[tone])} aria-hidden="true">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-md p-lg pt-0">
        <div className="flex items-baseline gap-xs">
          <div className={cn("text-display tabular-nums", TONE_VALUE_CLASS[tone])}>
            {value}
          </div>
          {status && tone !== "success" && StatusIcon && (
            <span className={cn("inline-flex items-center gap-1 text-caption font-medium", status.className)}>
              <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {status.label}
            </span>
          )}
          {trend && (
            <div className={`flex items-center gap-xs text-xs font-semibold ${
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

        {subtitle && <p className="text-body-sm text-muted-foreground">{subtitle}</p>}
        
        {progress !== undefined && (
          <div className="space-y-xs">
            <Progress value={progress} className="h-1.5" />
            <p className="text-body-sm text-muted-foreground">{Math.round(progress)}% da meta</p>
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
