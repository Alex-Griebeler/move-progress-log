import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle } from "lucide-react";
import { formatDateSP, formatTimeSP } from "@/utils/displayFormat";

interface StudentObservationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  observations: Array<{
    id: string;
    observation_text: string;
    categories: string[] | null;
    severity: string | null;
    created_at: string | null;
    is_resolved: boolean | null;
  }>;
}

export function StudentObservationsDialog({
  open,
  onOpenChange,
  studentName,
  observations,
}: StudentObservationsDialogProps) {
  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'alta': return 'destructive';
      case 'média': return 'default';
      case 'baixa': return 'secondary';
      default: return 'outline';
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Observações Importantes - {studentName}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-full max-h-[60vh] pr-4">
          {observations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-4 text-success" aria-hidden="true" />
              <p className="text-lg font-medium">Nenhuma observação importante</p>
              <p className="text-sm">Nenhum alerta ativo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {observations.map((obs) => (
                <div 
                  key={obs.id} 
                  className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(obs.severity)}>
                        {obs.severity || 'sem gravidade'}
                      </Badge>
                      {obs.categories && obs.categories.length > 0 && (
                        <Badge variant="outline" className="capitalize">
                          {obs.categories[0]}
                        </Badge>
                      )}
                    </div>
                    {obs.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDateSP(obs.created_at, true)} às {formatTimeSP(obs.created_at)}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm leading-relaxed">
                    {obs.observation_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
