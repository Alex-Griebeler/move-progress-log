import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  return (
    <Card className={cn("border-dashed animate-fade-in", className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-4 mb-6 animate-scale-in">
          <Icon className="h-10 w-10 text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button 
            onClick={onAction} 
            variant="gradient"
            size="lg"
            className="gap-2"
          >
            <Icon className="h-5 w-5" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
