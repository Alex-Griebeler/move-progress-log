import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  gradient?: boolean;
}

const StatCard = ({ title, value, icon: Icon, subtitle, gradient }: StatCardProps) => {
  return (
    <Card className={`hover:shadow-md transition-all duration-300 ${gradient ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20' : ''}`}>
      <CardHeader className="pb-sm">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground leading-normal">{title}</CardTitle>
          <div className={`p-sm rounded-radius-md ${gradient ? 'bg-gradient-to-br from-primary to-accent' : 'bg-secondary'}`}>
            <Icon className={`h-4 w-4 ${gradient ? 'text-primary-foreground' : 'text-primary'}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold leading-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {value}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-xs leading-normal">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};

export default StatCard;
