import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  gradient?: boolean;
  onClick?: () => void;
}

const StatCard = ({ title, value, icon: Icon, subtitle, gradient, onClick }: StatCardProps) => {
  return (
    <Card 
      className={`hover:shadow-premium transition-smooth ${gradient ? 'bg-gradient-card border-primary/20' : ''} ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
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
      <CardContent>
        <div className="text-3xl font-bold leading-tight text-gradient-primary">
          {value}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-xs leading-normal">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};

export default StatCard;
