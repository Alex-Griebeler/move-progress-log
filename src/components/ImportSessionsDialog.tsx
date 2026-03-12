import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useGetOrCreateStudent } from "@/hooks/useStudents";
import { useCreateWorkoutSession } from "@/hooks/useWorkoutSessions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type SpreadsheetRow = Record<string, unknown>;

const getStringValue = (row: SpreadsheetRow, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
};

const getNumberValue = (row: SpreadsheetRow, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return undefined;
};

interface ImportSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SessionRow {
  aluno: string;
  data: string;
  hora: string;
  exercicio: string;
  series?: number;
  reps?: number;
  carga?: number;
  observacoes?: string;
}

interface ProcessingStatus {
  total: number;
  processed: number;
  errors: string[];
  success: boolean;
}

export const ImportSessionsDialog = ({ open, onOpenChange }: ImportSessionsDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);

  const getOrCreateStudent = useGetOrCreateStudent();
  const createSession = useCreateWorkoutSession();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus(null);
    }
  };

  const parseExcelDate = (excelDate: unknown): string => {
    if (typeof excelDate === "string") {
      // Tenta parsear string no formato DD/MM/YYYY ou YYYY-MM-DD
      const parts = excelDate.includes("/") ? excelDate.split("/") : excelDate.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return excelDate;
        } else {
          // DD/MM/YYYY
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    }
    
    if (typeof excelDate === "number") {
      // Excel armazena datas como números (dias desde 1900)
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }
    
    return new Date().toISOString().split("T")[0];
  };

  const parseTime = (timeValue: any): string => {
    if (typeof timeValue === "string") {
      return timeValue;
    }
    if (typeof timeValue === "number") {
      // Excel armazena tempo como fração do dia
      const totalMinutes = Math.round(timeValue * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
    return "12:00";
  };

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    setStatus({ total: 0, processed: 0, errors: [], success: false });
    
    let toastId: string | number | undefined;

    try {
      // Toast inicial
      toastId = toast.loading("Lendo arquivo Excel...", {
        description: "Processando planilha"
      });

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Agrupa por aluno + data + hora
      const sessionsMap = new Map<string, SessionRow[]>();

      jsonData.forEach((row) => {
        const sessionKey = `${row.Aluno || row.aluno}_${row.Data || row.data}_${row.Hora || row.hora}`;
        const sessionRow: SessionRow = {
          aluno: row.Aluno || row.aluno,
          data: parseExcelDate(row.Data || row.data),
          hora: parseTime(row.Hora || row.hora),
          exercicio: row.Exercicio || row.exercicio || row.Exercício,
          series: row.Series || row.series || row.Séries,
          reps: row.Reps || row.reps || row.Repetições,
          carga: row.Carga || row.carga || row["Carga (kg)"],
          observacoes: row.Observacoes || row.observacoes || row.Observações,
        };

        if (!sessionsMap.has(sessionKey)) {
          sessionsMap.set(sessionKey, []);
        }
        sessionsMap.get(sessionKey)!.push(sessionRow);
      });

      const totalSessions = sessionsMap.size;
      setStatus((prev) => ({ ...prev!, total: totalSessions }));
      
      // Atualiza toast com total encontrado
      toast.loading(`Processando ${totalSessions} sessão(ões)...`, {
        id: toastId,
        description: "Importando dados para o sistema"
      });

      let processed = 0;
      const errors: string[] = [];

      for (const [key, exercises] of sessionsMap) {
        try {
          const firstRow = exercises[0];
          
          // Atualiza toast com progresso atual
          toast.loading(`Processando sessão ${processed + 1} de ${totalSessions}`, {
            id: toastId,
            description: `Aluno: ${firstRow.aluno} - ${exercises.length} exercício(s)`
          });
          
          // Cria ou busca aluno
          const student = await getOrCreateStudent.mutateAsync(firstRow.aluno);

          // Cria sessão com exercícios
          await createSession.mutateAsync({
            student_id: student.id,
            date: firstRow.data,
            time: firstRow.hora,
            exercises: exercises.map((ex) => ({
              exercise_name: ex.exercicio,
              sets: ex.series,
              reps: ex.reps,
              load_kg: ex.carga,
              observations: ex.observacoes,
            })),
          });

          processed++;
          setStatus((prev) => ({ ...prev!, processed }));
        } catch (error: any) {
          errors.push(`Sessão ${key}: ${error.message}`);
        }
      }

      // Toast final
      toast.dismiss(toastId);
      
      if (errors.length === 0) {
        toast.success("Importação concluída com sucesso!", {
          description: `${processed} sessão(ões) importada(s) com todos os exercícios.`,
          duration: 5000,
        });
      } else {
        toast.warning("Importação concluída com avisos", {
          description: `${processed} de ${totalSessions} sessão(ões) importada(s). ${errors.length} erro(s) encontrado(s).`,
          duration: 7000,
        });
      }

      setStatus({
        total: totalSessions,
        processed,
        errors,
        success: errors.length === 0,
      });
    } catch (error: any) {
      if (toastId) toast.dismiss(toastId);
      
      toast.error("Erro ao processar arquivo", {
        description: error.message || "Verifique o formato do arquivo Excel e tente novamente.",
      });
      
      setStatus({
        total: 0,
        processed: 0,
        errors: [error.message],
        success: false,
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setStatus(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Sessões via Excel
          </DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel (.xlsx ou .xls) com os dados das sessões.
            <br />
            <strong>Colunas necessárias:</strong> Aluno, Data, Hora, Exercicio, Series, Reps, Carga, Observacoes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          {!status && (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
                disabled={processing}
              />
              <label
                htmlFor="excel-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : "Clique para selecionar arquivo Excel"}
                </p>
              </label>
            </div>
          )}

          {/* Processing status */}
          {processing && status && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Processando sessões...</span>
                <span className="font-medium">
                  {status.processed} / {status.total}
                </span>
              </div>
              <Progress value={(status.processed / status.total) * 100} />
            </div>
          )}

          {/* Results */}
          {!processing && status && (
            <div className="space-y-3">
              {status.success ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importação concluída com sucesso!</strong>
                    <br />
                    {status.processed} sessão(ões) importada(s).
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importação concluída com erros</strong>
                    <br />
                    {status.processed} de {status.total} sessão(ões) importada(s).
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                      {status.errors.map((error, i) => (
                        <div key={i} className="mt-1">
                          • {error}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetDialog} disabled={processing}>
              {status ? "Fechar" : "Cancelar"}
            </Button>
            {!status && (
              <Button onClick={processFile} disabled={!file || processing}>
                {processing ? "Processando..." : "Importar"}
              </Button>
            )}
          </div>

          {/* Instructions */}
          {!status && (
            <div className="text-xs text-muted-foreground border-t pt-4 space-y-2">
              <p><strong>Formato da planilha:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Cada linha representa um exercício de uma sessão</li>
                <li>Múltiplas linhas com mesmo Aluno + Data + Hora = mesma sessão</li>
                <li>Alunos não cadastrados serão criados automaticamente</li>
                <li>Data: formato DD/MM/AAAA ou AAAA-MM-DD</li>
                <li>Hora: formato HH:MM</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
