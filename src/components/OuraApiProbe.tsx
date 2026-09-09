import { useState } from "react";
import { Loader2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { spToday } from "@/hooks/useOuraMetrics";
import { buildErrorDescription } from "@/utils/errorParsing";

interface ProbeRow {
  http: number | null;
  count: number;
  days: string[];
  count_for_day?: number;
  error?: string;
}

interface ProbeReport {
  probe: true;
  date: string;
  windows: Record<string, { start_date: string; end_date: string }>;
  report: Record<string, Record<string, ProbeRow>>;
}

interface OuraApiProbeProps {
  studentId: string;
}

/**
 * Sonda da API do Oura (admin): pede ao `oura-sync` que consulte a API nas duas
 * janelas — legado `D..D` e atual `D..D+1` — e devolva só contagens e dias, sem
 * gravar nada. É a prova, em produção e sem expor token, de que `end_date` é
 * exclusivo e de que o dia D passa a chegar com a janela nova.
 */
export const OuraApiProbe = ({ studentId }: OuraApiProbeProps) => {
  const [date, setDate] = useState<string>(spToday());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProbeReport | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("oura-sync", {
        body: { student_id: studentId, date, probe: true },
      });
      if (invokeError) throw invokeError;
      if (!data || data.probe !== true) throw new Error("Resposta inesperada da sonda.");
      setResult(data as ProbeReport);
    } catch (e) {
      setError(buildErrorDescription(e, "Falha ao sondar a API do Oura."));
    } finally {
      setBusy(false);
    }
  };

  const endpoints = result ? Object.keys(result.report.current ?? {}) : [];

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-card" data-testid="oura-api-probe">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor={`probe-date-${studentId}`} className="text-xs font-medium">
            Sonda da API (sem gravar): dia
          </label>
          <Input
            id={`probe-date-${studentId}`}
            type="date"
            value={date}
            max={spToday()}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 w-40"
          />
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={busy || !date}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Radar className="h-4 w-4 mr-1" />}
          Sondar D..D vs D..D+1
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Compara a janela antiga (<code>start_date=end_date=D</code>) com a atual (<code>D..D+1</code>) em cada
        endpoint. Não grava métricas nem logs; só contagens e dias devolvidos pela API (o token OAuth pode ser
        renovado se estiver vencido). Só admin.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-2">endpoint</th>
                <th className="py-1 pr-2">legado {result.windows.legacy?.start_date}..{result.windows.legacy?.end_date}</th>
                <th className="py-1 pr-2">atual {result.windows.current?.start_date}..{result.windows.current?.end_date}</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep) => {
                const legacy = result.report.legacy?.[ep];
                const current = result.report.current?.[ep];
                const cell = (row?: ProbeRow) =>
                  row
                    ? row.error
                      ? `erro: ${row.error}`
                      : `HTTP ${row.http} · ${row.count} doc(s)${row.days.length ? ` · dias ${row.days.join(", ")}` : ""}`
                    : "—";
                return (
                  <tr key={ep} className="border-t">
                    <td className="py-1 pr-2 font-mono">{ep}</td>
                    <td className="py-1 pr-2">{cell(legacy)}</td>
                    <td className={`py-1 pr-2 ${current?.count_for_day ? "text-green-600 dark:text-green-400" : ""}`}>
                      {cell(current)}
                      {current?.count_for_day ? ` · dia ${result.date} presente` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
