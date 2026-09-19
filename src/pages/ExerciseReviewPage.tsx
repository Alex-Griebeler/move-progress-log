import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notify } from "@/lib/notify";
import { AlertTriangle, Download, FileSearch, Save, Filter, Search } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InlineExerciseNameEditor } from "@/components/InlineExerciseNameEditor";
import { ExerciseDimensionReview } from "@/components/ExerciseDimensionReview";
import { buildErrorDescription } from "@/utils/errorParsing";
import { ErrorState } from "@/components/ErrorState";
import { DiscardDraftDialog } from "@/components/assessments/DiscardDraftDialog";
import {
  EXERCISE_CATEGORIES,
  MOVEMENT_PATTERNS,
  LATERALITY_OPTIONS,
  MOVEMENT_PLANES,
  CONTRACTION_TYPES,
  LEVEL_OPTIONS,
  STRENGTH_SUBCATEGORIES,
  LMF_SUBCATEGORIES,
  CORE_ATIVACAO_SUBCATEGORIES,
  LEGACY_CORE_SUBCATEGORIES,
  STABILITY_POSITION_OPTIONS,
  SURFACE_MODIFIER_OPTIONS,
} from "@/constants/backToBasics";

type MissingField = "subcategory" | "movement_plane" | "level" | "laterality" | "contraction_type" | "emphasis" | "stability_position" | "surface_modifier";

const MISSING_FIELD_LABELS: Record<MissingField, string> = {
  subcategory: "Subcategoria",
  movement_plane: "Plano de Movimento",
  level: "Nível",
  laterality: "Lateralidade",
  contraction_type: "Tipo de Contração",
  emphasis: "Ênfase",
  stability_position: "Posição/Base",
  surface_modifier: "Modificador Superfície",
};

// CORE e LMF consolidados em @/constants/backToBasics (fonte canônica única).
// O dropdown de core_ativacao usa a lista canônica + as chaves legadas
// (ativacao_gluteo/ativacao_ombro/estabilizacao) como "(legado)", pra que
// dados existentes que usem o vocabulário antigo continuem visíveis/editáveis.
// Sem migration / sem backfill de banco nesta fase.
const CORE_SUBCATEGORY_OPTIONS: Record<string, string> = {
  ...CORE_ATIVACAO_SUBCATEGORIES,
  ...LEGACY_CORE_SUBCATEGORIES,
};

const LEGACY_REVIEW_PAGE_SIZE = 25;

/** Destino especial: o usuário pediu Voltar/Avançar no navegador. */
export const LEAVE_GUARD_HISTORY = "__history__";

/**
 * Guarda de saída da revisão em lote (UX-29). O app usa <BrowserRouter>
 * (sem data router), então `useBlocker` não existe. Três portas de saída:
 * - clique em link interno (captura) → diálogo com o destino;
 * - Voltar/Avançar do navegador → uma entrada SENTINELA (mesma URL) é
 *   empilhada enquanto houver edições; o Voltar consome a sentinela, a página
 *   continua montada e o diálogo abre com LEAVE_GUARD_HISTORY;
 * - fechar/recarregar a aba → `beforeunload`.
 * `rearm()` recoloca a sentinela quando o usuário decide continuar editando;
 * `leaveViaHistory()` desliga a guarda e só então volta no histórico.
 */
export const useLeavePageGuard = (active: boolean, onBlockedNavigation: (href: string) => void) => {
  const sentinelOnTopRef = useRef(false);
  const bypassRef = useRef(false);

  const pushSentinel = useCallback(() => {
    if (sentinelOnTopRef.current) return;
    window.history.pushState({ ...(window.history.state ?? {}), fabrikLeaveGuard: true }, "", window.location.href);
    sentinelOnTopRef.current = true;
  }, []);

  useEffect(() => {
    if (!active) return;
    bypassRef.current = false;
    pushSentinel();

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      if (bypassRef.current) return;
      if (!sentinelOnTopRef.current) return;
      if ((window.history.state as { fabrikLeaveGuard?: boolean } | null)?.fabrikLeaveGuard) return;
      // A sentinela foi consumida pelo Voltar: a página segue montada.
      sentinelOnTopRef.current = false;
      onBlockedNavigation(LEAVE_GUARD_HISTORY);
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      onBlockedNavigation(`${url.pathname}${url.search}${url.hash}`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleClickCapture, true);
    };
  }, [active, onBlockedNavigation, pushSentinel]);

  /** Usuário escolheu continuar editando depois de um Voltar bloqueado. */
  const rearm = useCallback(() => {
    // O AlertDialog também dispara onOpenChange(false) depois do "Sair": se a
    // saída já começou (bypass), não recoloca a sentinela.
    if (active && !bypassRef.current) pushSentinel();
  }, [active, pushSentinel]);

  /** Usuário confirmou sair depois de um Voltar: desliga a guarda e volta. */
  const leaveViaHistory = useCallback(() => {
    bypassRef.current = true;
    sentinelOnTopRef.current = false;
    window.history.back();
  }, []);

  return { rearm, leaveViaHistory };
};

interface EditedExercise {
  id: string;
  [key: string]: string | null | undefined;
}

interface LegacyExerciseGroup {
  normalizedName: string;
  displayName: string;
  count: number;
  variants: string[];
  loadSamples: string[];
  observationSamples: string[];
}

const ExerciseReviewPage = () => {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [missingFieldFilter, setMissingFieldFilter] = useState<MissingField | "all">("all");
  const [legacySearch, setLegacySearch] = useState("");
  const [legacyPriorityOnly, setLegacyPriorityOnly] = useState(false);
  const [legacyPage, setLegacyPage] = useState(1);
  const [edits, setEdits] = useState<Record<string, EditedExercise>>({});
  const [dimensionEditCount, setDimensionEditCount] = useState(0);
  const [activeTab, setActiveTab] = useState("dimensions");
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: exercises, isLoading, error: queryError, refetch: refetchExercises } = useQuery({
    queryKey: ["exercises-review"],
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch in batches to avoid the 1000 row limit
      type ExerciseRow = { id: string; name: string; category: string | null; movement_pattern: string | null; subcategory: string | null; movement_plane: string | null; level: string | null; laterality: string | null; contraction_type: string | null; emphasis: string | null; stability_position: string | null; surface_modifier: string | null };
      let allData: ExerciseRow[] = [];
      let from = 0;
      const batchSize = 500;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("exercises_library")
          .select("id, name, category, movement_pattern, subcategory, movement_plane, level, laterality, contraction_type, emphasis, stability_position, surface_modifier")
          .order("category")
          .order("name")
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (data) {
          allData = [...allData, ...data];
          hasMore = data.length === batchSize;
          from += batchSize;
        } else {
          hasMore = false;
        }
      }
      return allData;
    },
  });

  const { data: legacyReviewRows, isLoading: legacyLoading, error: legacyError } = useQuery({
    queryKey: ["legacy-unlinked-session-exercise-review"],
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_unlinked_session_exercise_review");
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (changes: EditedExercise[]) => {
      for (const change of changes) {
        const { id, ...fields } = change;
        // Remove undefined values
        const cleanFields = Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== undefined)
        );
        if (Object.keys(cleanFields).length === 0) continue;
        const { error } = await supabase
          .from("exercises_library")
          .update(cleanFields as never)
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises-review"] });
      queryClient.invalidateQueries({ queryKey: ["exercises-library"] });
      setEdits({});
      notify.success("Alterações salvas");
    },
    onError: (err) => {
      notify.error("Erro ao salvar", { description: buildErrorDescription(err, "Tente novamente.") });
    },
  });

  const handleFieldChange = useCallback((exerciseId: string, field: string, value: string | null) => {
    setEdits((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        id: exerciseId,
        [field]: value,
      },
    }));
  }, []);

  const handleSave = () => {
    const changes = Object.values(edits);
    if (changes.length === 0) return;
    saveMutation.mutate(changes);
  };

  const incompleteExercises = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter((ex) => {
      // Skip mobilidade and respiracao
      if (ex.category === "mobilidade" || ex.category === "respiracao") return false;

      const categoryMatch = categoryFilter === "all" || ex.category === categoryFilter;
      if (!categoryMatch) return false;

      // Potência não usa subcategoria (Opção A: forma=movement_pattern,
      // plano=movement_plane, lado=laterality) — não conta como campo faltante.
      const hasMissing = (field: MissingField) =>
        field === "subcategory" && ex.category === "potencia_pliometria"
          ? false
          : !ex[field];

      if (missingFieldFilter === "all") {
        return hasMissing("subcategory") || hasMissing("movement_plane") || hasMissing("level") || hasMissing("laterality") || hasMissing("contraction_type") || hasMissing("emphasis") || hasMissing("stability_position") || hasMissing("surface_modifier");
      }
      return hasMissing(missingFieldFilter);
    });
  }, [exercises, categoryFilter, missingFieldFilter]);

  // Count missing fields per category
  const missingCounts = useMemo(() => {
    if (!exercises) return {};
    const counts: Record<string, number> = {};
    for (const ex of exercises) {
      if (ex.category === "mobilidade" || ex.category === "respiracao") continue;
      const cat = ex.category || "sem_categoria";
      // Potência não usa subcategoria (Opção A) — não conta como faltante.
      const fields = ["movement_plane", "level", "laterality", "contraction_type", "emphasis", "stability_position", "surface_modifier"];
      if (ex.category !== "potencia_pliometria") fields.unshift("subcategory");
      const missing = fields
        .filter((f) => !ex[f as keyof typeof ex]).length;
      if (missing > 0) counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [exercises]);

  const legacyGroups = useMemo<LegacyExerciseGroup[]>(() => {
    if (!legacyReviewRows) return [];

    return legacyReviewRows.map((row) => ({
      normalizedName: row.normalized_name,
      displayName: row.display_name,
      count: row.total_rows,
      variants: row.variants || [],
      loadSamples: row.load_samples || [],
      observationSamples: row.observation_samples || [],
    }));
  }, [legacyReviewRows]);

  const legacyTotalRows = legacyGroups.reduce((sum, group) => sum + group.count, 0);

  const getSubcategoryOptions = (category: string | null, movementPattern: string | null) => {
    if (category === "forca_hipertrofia" && movementPattern && STRENGTH_SUBCATEGORIES[movementPattern]) {
      return STRENGTH_SUBCATEGORIES[movementPattern];
    }
    if (category === "potencia_pliometria") return null; // potência não usa subcategoria (Opção A)
    if (category === "core_ativacao") return CORE_SUBCATEGORY_OPTIONS;
    if (category === "lmf") return LMF_SUBCATEGORIES;
    return null;
  };

  const getValue = (exerciseId: string, field: string, originalValue: string | null) => {
    return edits[exerciseId]?.[field] !== undefined ? (edits[exerciseId][field] as string | null) : originalValue;
  };

  const legacyFilteredGroups = useMemo(() => {
    const query = legacySearch.trim().toLowerCase();

    return legacyGroups.filter((group) => {
      if (legacyPriorityOnly && group.count < 10) return false;
      if (!query) return true;

      const searchable = [
        group.displayName,
        group.normalizedName,
        ...group.variants,
        ...group.loadSamples,
        ...group.observationSamples,
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [legacyGroups, legacyPriorityOnly, legacySearch]);

  const legacyTotalPages = Math.max(1, Math.ceil(legacyFilteredGroups.length / LEGACY_REVIEW_PAGE_SIZE));
  const safeLegacyPage = Math.min(legacyPage, legacyTotalPages);
  const legacyPageGroups = legacyFilteredGroups.slice(
    (safeLegacyPage - 1) * LEGACY_REVIEW_PAGE_SIZE,
    safeLegacyPage * LEGACY_REVIEW_PAGE_SIZE
  );

  const handleLegacySearchChange = (value: string) => {
    setLegacySearch(value);
    setLegacyPage(1);
  };

  const handleLegacyPriorityToggle = () => {
    setLegacyPriorityOnly((current) => !current);
    setLegacyPage(1);
  };

  const downloadLegacyReviewCsv = useCallback(() => {
    if (legacyFilteredGroups.length === 0) return;

    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      [
        "nome_legado",
        "nome_normalizado",
        "linhas",
        "variantes",
        "amostras_carga",
        "amostras_observacoes",
      ],
      ...legacyFilteredGroups.map((group) => [
        group.displayName,
        group.normalizedName,
        String(group.count),
        group.variants.join(" | "),
        group.loadSamples.join(" | "),
        group.observationSamples.join(" | "),
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    link.href = url;
    link.download = `fila-revisao-exercicios-legados-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [legacyFilteredGroups]);

  const editCount = Object.keys(edits).length;
  const pendingCount = editCount + dimensionEditCount;
  const leaveGuard = useLeavePageGuard(pendingCount > 0, setPendingHref);

  // Trocar de aba desmonta a revisão de dimensões (edições ficam no
  // componente); as edições de "Campos incompletos" ficam na página.
  const handleTabChange = (next: string) => {
    if (activeTab === "dimensions" && next !== "dimensions" && dimensionEditCount > 0) {
      setPendingTab(next);
      return;
    }
    setActiveTab(next);
  };

  const pluralAlteracoes = (n: number) => (n === 1 ? "1 alteração" : `${n} alterações`);

  return (
    <PageLayout>
      <PageHeader
        title="Revisão de exercícios"
        description="Gestão de campos e dimensões da biblioteca"
      />
      <DiscardDraftDialog
        open={pendingHref !== null}
        onOpenChange={(open) => {
          if (!open) {
            // Continuar editando após um Voltar: recoloca a sentinela.
            if (pendingHref === LEAVE_GUARD_HISTORY) leaveGuard.rearm();
            setPendingHref(null);
          }
        }}
        title={`Sair com ${pluralAlteracoes(pendingCount)} não salva${pendingCount === 1 ? "" : "s"}?`}
        description="As edições desta revisão serão perdidas."
        confirmLabel="Sair sem salvar"
        onConfirm={() => {
          const href = pendingHref;
          setPendingHref(null);
          setEdits({});
          setDimensionEditCount(0);
          if (href === LEAVE_GUARD_HISTORY) leaveGuard.leaveViaHistory();
          else if (href) navigate(href);
        }}
      />
      <DiscardDraftDialog
        open={pendingTab !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTab(null);
        }}
        title={`Descartar ${pluralAlteracoes(dimensionEditCount)} de dimensões?`}
        description="Trocar de aba descarta as dimensões editadas e não salvas."
        onConfirm={() => {
          const next = pendingTab;
          setPendingTab(null);
          setDimensionEditCount(0);
          if (next) setActiveTab(next);
        }}
      />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dimensions">Dimensões (v14.5)</TabsTrigger>
          <TabsTrigger value="legacy">Legados sem vínculo ({legacyTotalRows})</TabsTrigger>
          <TabsTrigger value="fields">Campos incompletos ({incompleteExercises.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="dimensions">
          <ExerciseDimensionReview onEditCountChange={setDimensionEditCount} />
        </TabsContent>
        <TabsContent value="legacy">
          <div className="space-y-4">
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-foreground">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
                  <div>
                    <h2 className="font-semibold">Fila de curadoria manual</h2>
                    <p className="mt-1 text-sm leading-relaxed">
                      Essas linhas são históricas e ainda não têm vínculo com a biblioteca canônica.
                      Use esta fila para decidir se cada nome deve ser mapeado para um canônico existente,
                      virar um novo exercício ou permanecer sem match. Não há ação automática nesta tela.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadLegacyReviewCsv}
                  disabled={legacyFilteredGroups.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Linhas históricas sem FK</p>
                <p className="mt-1 text-2xl font-semibold">{legacyTotalRows}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Nomes normalizados</p>
                <p className="mt-1 text-2xl font-semibold">{legacyGroups.length}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Regra operacional</p>
                <p className="mt-2 text-sm font-medium">Revisão humana antes de qualquer UPDATE</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={legacySearch}
                  onChange={(event) => handleLegacySearchChange(event.target.value)}
                  placeholder="Buscar nome, variante, carga ou observação"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={legacyPriorityOnly ? "default" : "outline"}
                  onClick={handleLegacyPriorityToggle}
                >
                  Prioridade 10+ linhas
                </Button>
                <span className="text-sm text-muted-foreground">
                  {legacyFilteredGroups.length} de {legacyGroups.length} grupos
                </span>
              </div>
            </div>

            {legacyError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Erro ao carregar legados: {buildErrorDescription(legacyError, "Tente novamente.")}
              </div>
            ) : legacyLoading ? (
              <div className="rounded-lg border p-8 text-center text-muted-foreground">
                Carregando legados sem vínculo…
              </div>
            ) : legacyGroups.length === 0 ? (
              <div className="rounded-lg border p-8 text-center text-muted-foreground">
                <FileSearch className="mx-auto mb-3 h-8 w-8" />
                Nenhum exercício histórico sem vínculo foi encontrado.
              </div>
            ) : legacyFilteredGroups.length === 0 ? (
              <div className="rounded-lg border p-8 text-center text-muted-foreground">
                <FileSearch className="mx-auto mb-3 h-8 w-8" />
                Nenhum grupo corresponde aos filtros atuais.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[240px]">Nome legado</TableHead>
                      <TableHead className="w-[90px]">Linhas</TableHead>
                      <TableHead>Variantes</TableHead>
                      <TableHead>Evidência de carga</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="w-[130px]">Prioridade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {legacyPageGroups.map((group) => (
                      <TableRow key={group.normalizedName}>
                        <TableCell>
                          <div className="font-medium">{group.displayName}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{group.normalizedName}</div>
                        </TableCell>
                        <TableCell className="font-semibold">{group.count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {group.variants.slice(0, 4).map((variant) => (
                            <div key={variant}>
                              {variant}
                            </div>
                          ))}
                          {group.variants.length > 4 && (
                            <div>+{group.variants.length - 4} variantes</div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                          {group.loadSamples.length > 0 ? group.loadSamples.join(" | ") : "—"}
                        </TableCell>
                        <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                          {group.observationSamples.length > 0 ? group.observationSamples.join(" | ") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={group.count >= 10 ? "destructive" : "outline"}>
                            {group.count >= 10 ? "Prioridade" : "Revisar"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex flex-col gap-3 border-t bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {safeLegacyPage} de {legacyTotalPages} · exibindo {legacyPageGroups.length} grupos
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLegacyPage((page) => Math.max(1, page - 1))}
                      disabled={safeLegacyPage <= 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLegacyPage((page) => Math.min(legacyTotalPages, page + 1))}
                      disabled={safeLegacyPage >= legacyTotalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="fields">
      <div className="space-y-4">
        {/* Counters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(missingCounts).map(([cat, count]) => (
            <Badge key={cat} variant="outline" className="text-sm">
              {EXERCISE_CATEGORIES[cat as keyof typeof EXERCISE_CATEGORIES] || cat}: {count}
            </Badge>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {Object.entries(EXERCISE_CATEGORIES)
                .filter(([k]) => k !== "mobilidade" && k !== "respiracao" && k !== "condicionamento_metabolico")
                .map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={missingFieldFilter} onValueChange={(v) => setMissingFieldFilter(v as MissingField | "all")}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Campo faltante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os campos</SelectItem>
              {Object.entries(MISSING_FIELD_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>

        {/* Table */}
        {queryError ? (
          <ErrorState
            title="Não foi possível carregar os exercícios"
            description="Verifique a conexão e tente de novo."
            onRetry={() => refetchExercises()}
          />
        ) : isLoading ? (
          <p className="text-muted-foreground" role="status">Carregando…</p>
        ) : (
          <div className="border rounded-lg">
            <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Nível</TableHead>
                   <TableHead>Lateralidade</TableHead>
                   <TableHead>Posição/Base</TableHead>
                   <TableHead>Modificador</TableHead>
                   <TableHead>Contração</TableHead>
                   <TableHead>Ênfase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incompleteExercises.map((ex) => {
                  const subcatOptions = getSubcategoryOptions(ex.category, ex.movement_pattern);
                  return (
                    <TableRow key={ex.id} className={edits[ex.id] ? "bg-accent/30" : ""}>
                      <TableCell className="font-medium text-sm">
                        <InlineExerciseNameEditor
                          exerciseId={ex.id}
                          currentName={getValue(ex.id, "name", ex.name) || ex.name}
                          onNameChange={(id, newName) => handleFieldChange(id, "name", newName)}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {EXERCISE_CATEGORIES[ex.category as keyof typeof EXERCISE_CATEGORIES] || ex.category || "—"}
                      </TableCell>

                      {/* Subcategory */}
                      <TableCell>
                        {!ex.subcategory ? (
                          subcatOptions ? (
                            <Select
                              value={getValue(ex.id, "subcategory", ex.subcategory) || ""}
                              onValueChange={(v) => handleFieldChange(ex.id, "subcategory", v)}
                            >
                              <SelectTrigger className="h-8 text-xs w-[140px]">
                                <SelectValue placeholder="Selecionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(subcatOptions).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v as string}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-xs">{ex.subcategory}</span>
                        )}
                      </TableCell>

                      {/* Movement Plane */}
                      <TableCell>
                        {!ex.movement_plane ? (
                          <Select
                            value={getValue(ex.id, "movement_plane", ex.movement_plane) || ""}
                            onValueChange={(v) => handleFieldChange(ex.id, "movement_plane", v)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[120px]">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(MOVEMENT_PLANES).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs">{ex.movement_plane}</span>
                        )}
                      </TableCell>

                      {/* Level */}
                      <TableCell>
                        {!ex.level ? (
                          <Select
                            value={getValue(ex.id, "level", ex.level) || ""}
                            onValueChange={(v) => handleFieldChange(ex.id, "level", v)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[140px]">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(LEVEL_OPTIONS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs">{ex.level}</span>
                        )}
                      </TableCell>

                      {/* Laterality */}
                      <TableCell>
                        {!ex.laterality ? (
                          <Select
                            value={getValue(ex.id, "laterality", ex.laterality) || ""}
                            onValueChange={(v) => handleFieldChange(ex.id, "laterality", v)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[130px]">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(LATERALITY_OPTIONS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs">{ex.laterality}</span>
                        )}
                      </TableCell>

                      {/* Stability Position */}
                      <TableCell>
                        {!ex.stability_position ? (
                          <Select
                            value={getValue(ex.id, "stability_position", ex.stability_position) || ""}
                            onValueChange={(v) => handleFieldChange(ex.id, "stability_position", v)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[160px]">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STABILITY_POSITION_OPTIONS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs">{STABILITY_POSITION_OPTIONS[ex.stability_position as keyof typeof STABILITY_POSITION_OPTIONS] || ex.stability_position}</span>
                        )}
                      </TableCell>
                      {/* Surface Modifier */}
                      <TableCell>
                        {!ex.surface_modifier || ex.surface_modifier === 'nenhum' ? (
                          <Select
                            value={getValue(ex.id, "surface_modifier", ex.surface_modifier) || ""}
                            onValueChange={(v) => handleFieldChange(ex.id, "surface_modifier", v)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[150px]">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SURFACE_MODIFIER_OPTIONS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs">{SURFACE_MODIFIER_OPTIONS[ex.surface_modifier as keyof typeof SURFACE_MODIFIER_OPTIONS] || ex.surface_modifier}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!ex.contraction_type ? (
                          <Select
                            value={getValue(ex.id, "contraction_type", ex.contraction_type) || ""}
                            onValueChange={(v) => handleFieldChange(ex.id, "contraction_type", v)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[130px]">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CONTRACTION_TYPES).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs">{ex.contraction_type}</span>
                        )}
                      </TableCell>

                      {/* Emphasis */}
                      <TableCell>
                        {!ex.emphasis ? (
                          <input
                            className="h-8 text-xs w-[120px] border rounded px-2 bg-background"
                            placeholder="Ênfase"
                            defaultValue=""
                            onBlur={(e) => {
                              if (e.target.value) handleFieldChange(ex.id, "emphasis", e.target.value);
                            }}
                          />
                        ) : (
                          <span className="text-xs">{ex.emphasis}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {incompleteExercises.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum exercício com campo faltante nos filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </TooltipProvider>
          </div>
        )}

        {/* Barra fixa de salvar (UX-29): o trabalho pendente fica visível
            mesmo com a tabela rolada. */}
        {editCount > 0 && (
          <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">
            <span className="text-sm text-muted-foreground" role="status">
              {pluralAlteracoes(editCount)} não salva{editCount === 1 ? "" : "s"}
            </span>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" aria-hidden />
              Salvar {pluralAlteracoes(editCount)}
            </Button>
          </div>
        )}
      </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default ExerciseReviewPage;
