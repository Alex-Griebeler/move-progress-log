import { useState, useRef } from "react";
import { useStudents } from "@/hooks/useStudents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoadingSkeleton } from "@/components/PageLoadingSkeleton";
import { OuraApiDiagnosticsCard } from "@/components/OuraApiDiagnosticsCard";
import { Button } from "@/components/ui/button";
import { ExerciseDistributionDiagnostic } from "@/components/ExerciseDistributionDiagnostic";
import { ArrowLeft, Shield, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AppHeader } from "@/components/AppHeader";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NAV_LABELS, ROUTES } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import exercisesJSON from "@/data/exercicios_fabrik_categorizado.json";
import * as XLSX from "xlsx";

const AdminDiagnosticsPage = () => {
  usePageTitle(NAV_LABELS.adminDiagnostics);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: `${NAV_LABELS.adminDiagnostics} · Fabrik Performance`,
    description: 'Diagnósticos e monitoramento do sistema Fabrik Performance.',
    type: 'website',
    url: true,
  });
  
  const navigate = useNavigate();
  const { data: students, isLoading } = useStudents();
  const { isAdmin, isLoading: isLoadingRole } = useIsAdmin();
  const [importing, setImporting] = useState(false);
  const [importingXlsx, setImportingXlsx] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExercises = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-exercises", {
        body: exercisesJSON,
      });
      if (error) throw error;
      setImportResult(data);
      toast.success(`Importação concluída: ${data.inserted} inseridos, ${data.updated} atualizados`);
    } catch (err) {
      toast.error(`Erro na importação: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  const [xlsxDebug, setXlsxDebug] = useState<Record<string, unknown> | null>(null);

  const handleImportXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportingXlsx(true);
    setImportResult(null);
    setXlsxDebug(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      // Pick the correct sheet - prefer "Exercicios_Consolidado", fallback to first
      const targetSheetName = workbook.SheetNames.find(
        (n: string) => n.toLowerCase().includes("exercicio") || n.toLowerCase().includes("consolidado")
      ) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[targetSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
      
      // Debug: capture raw spreadsheet info
      const firstRow = rows[0] || {};
      const rawKeys = Object.keys(firstRow);
      const debugInfo: Record<string, unknown> = {
        sheetName: targetSheetName,
        totalSheets: workbook.SheetNames.length,
        allSheetNames: workbook.SheetNames,
        rowCount: rows.length,
        rawKeys,
        firstRowSample: Object.entries(firstRow).slice(0, 8).map(([k, v]) => `${k}=${v}`),
        secondRowSample: rows[1] ? Object.entries(rows[1]).slice(0, 8).map(([k, v]) => `${k}=${v}`) : "N/A",
      };
      setXlsxDebug(debugInfo);

      // Normalize column headers to handle Unicode differences
      const normalizeKey = (key: string) => 
        key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      
      const normalizedRows = rows.map(row => {
        const normalized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          normalized[normalizeKey(key)] = value;
          normalized[key] = value; // keep original too
        }
        return normalized;
      });

      // Map spreadsheet columns to expected format
      const exercises = normalizedRows.map(row => ({
        exercicio_pt: row["exercicio_pt"] || row["nome"] || row["name"],
        aliases_origem: row["aliases_origem"] || "",
        Padrao_movimento: row["Padrao_movimento"] || row["padrao_movimento"],
        subcategoria: row["subcategoria"],
        boyle_score: row["boyle_score"] != null ? Number(row["boyle_score"]) : undefined,
        AX: row["AX"] != null ? Number(row["AX"]) : undefined,
        LOM: row["LOM"] != null ? Number(row["LOM"]) : undefined,
        TEC: row["TEC"] != null ? Number(row["TEC"]) : undefined,
        MET: row["MET"] != null ? Number(row["MET"]) : undefined,
        JOE: row["JOE"] != null ? Number(row["JOE"]) : undefined,
        QUA: row["QUA"] != null ? Number(row["QUA"]) : undefined,
        grupo_muscular: row["grupo_muscular"],
        "Ênfase": row["Ênfase"] || row["enfase"] || row["enfase"],
        Base: row["Base"] || row["base"],
        lateralidade: row["lateralidade"],
        "Posição": row["Posição"] || row["posicao"] || row["posicao"],
        plano: row["plano"],
        Tipo_contracao: row["Tipo_contracao"] || row["tipo_contracao"],
        risco: row["risco"],
        nivel_boyle: row["nivel_boyle"],
        equipamento: row["equipamento"],
        Implemento: row["Implemento"] || row["implemento"],
      }));

      // Debug: check how many have exercicio_pt
      const withName = exercises.filter(e => e.exercicio_pt);
      debugInfo.exercisesWithName = withName.length;
      debugInfo.exercisesTotal = exercises.length;
      debugInfo.firstMapped = exercises[0];
      setXlsxDebug({ ...debugInfo });

      const { data: result, error } = await supabase.functions.invoke("import-exercises", {
        body: { format: "spreadsheet", exercises },
      });
      if (error) throw error;
      setImportResult(result);
      toast.success(`Importação XLSX: ${result.inserted} inseridos, ${result.updated} atualizados, ${result.orphans_reclassified || 0} órfãos reclassificados`);
    } catch (err) {
      toast.error(`Erro na importação XLSX: ${(err as Error).message}`);
    } finally {
      setImportingXlsx(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoadingRole) {
    return <PageLoadingSkeleton layout="list" />;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Você não tem permissão para acessar esta página. Apenas administradores podem ver o diagnóstico da API Oura.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(ROUTES.students)} className="mt-4">
          Voltar para Alunos
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumbs 
          items={[
            { label: NAV_LABELS.students, href: "/alunos" },
            { label: NAV_LABELS.adminDiagnostics, icon: Shield }
          ]}
        />
        
        <AppHeader
          title={NAV_LABELS.adminDiagnostics}
          actions={
            <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.students)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
        />

        {/* Import Exercises Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Exercícios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* JSON Import */}
              <div className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  JSON oficial (491 exercícios categorizados)
                </p>
                <Button 
                  onClick={handleImportExercises} 
                  disabled={importing || importingXlsx}
                  variant="outline"
                  className="w-full"
                >
                  {importing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando JSON...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Importar JSON</>
                  )}
                </Button>
              </div>

              {/* XLSX Import */}
              <div className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Planilha XLSX com scores multidimensionais (AX, LOM, TEC, MET, JOE, QUA)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportXlsx}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={importing || importingXlsx}
                  variant="default"
                  className="w-full"
                >
                  {importingXlsx ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando XLSX...</>
                  ) : (
                    <><FileSpreadsheet className="h-4 w-4 mr-2" />Importar Planilha XLSX</>
                  )}
                </Button>
              </div>
            </div>

            {xlsxDebug && (
              <div className="rounded-md border border-amber-500 p-4 space-y-2 text-sm bg-amber-500/10">
                <p className="font-semibold text-amber-600">📊 Debug da Planilha (frontend)</p>
                <pre className="text-xs max-h-60 overflow-auto bg-muted p-2 rounded">
                  {JSON.stringify(xlsxDebug, null, 2)}
                </pre>
              </div>
            )}

            {importResult && (
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <p><strong>Formato:</strong> {String(importResult.format || "json")}</p>
                <p><strong>Inseridos:</strong> {String(importResult.inserted)}</p>
                <p><strong>Atualizados:</strong> {String(importResult.updated)}</p>
                {importResult.skipped != null && Number(importResult.skipped) > 0 && (
                  <p><strong>Ignorados (MetCon):</strong> {String(importResult.skipped)}</p>
                )}
                {importResult.orphans_reclassified != null && (
                  <p><strong>Órfãos reclassificados:</strong> {String(importResult.orphans_reclassified)}</p>
                )}
                <p><strong>Total processado:</strong> {String(importResult.total_processed)}</p>
                {importResult.errors_total && Number(importResult.errors_total) > 0 && (
                  <div>
                    <p className="text-destructive font-medium">Erros: {String(importResult.errors_total)}</p>
                    <pre className="text-xs mt-1 max-h-40 overflow-auto bg-muted p-2 rounded">
                      {JSON.stringify(importResult.errors, null, 2)}
                    </pre>
                  </div>
                )}
                {importResult.orphans_total && Number(importResult.orphans_total) > 0 && (
                  <details>
                    <summary className="cursor-pointer text-muted-foreground">
                      Exercícios órfãos ({String(importResult.orphans_total)}) — não estão na fonte importada
                    </summary>
                    <pre className="text-xs mt-1 max-h-40 overflow-auto bg-muted p-2 rounded">
                      {JSON.stringify(importResult.orphans, null, 2)}
                    </pre>
                  </details>
                )}
                {importResult.debug_samples && (
                  <details open>
                    <summary className="cursor-pointer text-amber-600 font-medium">
                      🔍 Debug: primeiros exercícios recebidos
                    </summary>
                    <pre className="text-xs mt-1 max-h-60 overflow-auto bg-muted p-2 rounded">
                      {JSON.stringify(importResult.debug_samples, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exercise Distribution Diagnostic */}
        <ExerciseDistributionDiagnostic />

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : students && students.length > 0 ? (
          <div className="space-y-8">
            {students.map((student) => (
              <div key={student.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{student.name}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(ROUTES.studentDetail(student.id))}
                  >
                    Ver Detalhes
                  </Button>
                </div>
                <OuraApiDiagnosticsCard studentId={student.id} />
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-xl font-semibold text-muted-foreground">
                Nenhum aluno cadastrado
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDiagnosticsPage;
