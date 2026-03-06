import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSeverityVariant, getCategoryIcon } from "@/types/sessionRecording";

interface ObservationPreviewProps {
  observations: Array<{
    observation_text: string;
    severity: string;
    categories?: string[];
    category?: string;
  }>;
}

export function ObservationPreview({ observations }: ObservationPreviewProps) {
  if (observations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          🩺 Observações Clínicas ({observations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {observations.map((obs, idx) => (
          <div key={idx} className="p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant={getSeverityVariant(obs.severity)}>
                {obs.severity}
              </Badge>
              {obs.categories?.map((cat, catIdx) => (
                <Badge key={catIdx} variant="outline" className="text-xs">
                  <span className="mr-1">{getCategoryIcon(cat)}</span>
                  {cat}
                </Badge>
              ))}
              {obs.category && !obs.categories && (
                <Badge variant="outline" className="text-xs">
                  {obs.category}
                </Badge>
              )}
            </div>
            <p className="text-sm">{obs.observation_text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
