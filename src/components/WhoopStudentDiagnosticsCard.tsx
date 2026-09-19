import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWhoopConnection } from "@/hooks/useWhoopConnection";
import { useWhoopMetrics } from "@/hooks/useWhoopMetrics";
import { formatDateSP, formatNumberBR, formatTimeSP } from "@/utils/displayFormat";
import { ROUTES } from "@/constants/navigation";

interface WhoopStudentDiagnosticsCardProps {
  studentId: string;
  studentName: string;
}

export const WhoopStudentDiagnosticsCard = ({ studentId, studentName }: WhoopStudentDiagnosticsCardProps) => {
  const navigate = useNavigate();
  const { data: connection } = useWhoopConnection(studentId);
  const { data: metrics } = useWhoopMetrics(studentId, 1);
  const latest = metrics?.[0];

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-semibold">{studentName}</span>
            {connection ? (
              <Badge variant="outline" className="border-success/40 font-normal text-success">Conectado</Badge>
            ) : (
              <Badge variant="outline" className="font-normal text-muted-foreground">Não conectado</Badge>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate(ROUTES.studentDetail(studentId))}>
            Ver detalhes
          </Button>
        </div>

        {connection && (
          <p className="text-xs text-muted-foreground">
            {connection.last_sync_at
              ? `Última sincronização: ${formatDateSP(connection.last_sync_at, true)} às ${formatTimeSP(connection.last_sync_at)}`
              : "Aguardando primeira sincronização"}
          </p>
        )}

        {latest ? (
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Recuperação</span>
              <br />
              <span className="font-medium">
                {latest.recovery_score !== null ? `${latest.recovery_score}%` : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Strain</span>
              <br />
              <span className="font-medium">{formatNumberBR(latest.day_strain, 1)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sono</span>
              <br />
              <span className="font-medium">
                {latest.sleep_performance !== null ? `${latest.sleep_performance}%` : "—"}
              </span>
            </div>
          </div>
        ) : connection ? (
          <p className="text-sm text-muted-foreground">Sem dados do Whoop ainda.</p>
        ) : null}
      </CardContent>
    </Card>
  );
};
