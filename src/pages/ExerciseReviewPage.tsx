import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notify } from "@/lib/notify";
import { Save, Filter } from "lucide-react";
import {
  EXERCISE_CATEGORIES,
  MOVEMENT_PATTERNS,
  LATERALITY_OPTIONS,
  MOVEMENT_PLANES,
  CONTRACTION_TYPES,
  LEVEL_OPTIONS,
  STRENGTH_SUBCATEGORIES,
  POTENCIA_SUBCATEGORIES,
} from "@/constants/backToBasics";

type MissingField = "subcategory" | "movement_plane" | "level" | "laterality" | "contraction_type" | "emphasis";

const MISSING_FIELD_LABELS: Record<MissingField, string> = {
  subcategory: "Subcategoria",
  movement_plane: "Plano de Movimento",
  level: "Nível",
  laterality: "Lateralidade",
  contraction_type: "Tipo de Contração",
  emphasis: "Ênfase",
};

const CORE_SUBCATEGORIES: Record<string, string> = {
  anti_extensao: "Anti-extensão",
  anti_rotacao: "Anti-rotação",
  anti_flexao_lateral: "Anti-flexão lateral",
  ativacao_gluteo: "Ativação Glúteo",
  ativacao_ombro: "Ativação Ombro",
  estabilizacao: "Estabilização",
};

const LMF_SUBCATEGORIES: Record<string, string> = {
  adutores: "Adutores",
  gluteos: "Glúteos",
  quadriceps: "Quadríceps",
  isquiotibiais: "Isquiotibiais",
  panturrilha: "Panturrilha",
  coluna: "Coluna",
  ombro: "Ombro",
  pe: "Pé",
};

interface EditedExercise {
  id: string;
  [key: string]: string | null | undefined;
}

const ExerciseReviewPage = () => {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [missingFieldFilter, setMissingFieldFilter] = useState<MissingField | "all">("all");
  const [edits, setEdits] = useState<Record<string, EditedExercise>>({});

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercises-review"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises_library")
        .select("id, name, category, movement_pattern, subcategory, movement_plane, level, laterality, contraction_type, emphasis")
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
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
      notify.success("Alterações salvas com sucesso!");
    },
    onError: (err) => {
      notify.error("Erro ao salvar", { description: err.message });
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

      const hasMissing = (field: MissingField) => !ex[field];

      if (missingFieldFilter === "all") {
        return hasMissing("subcategory") || hasMissing("movement_plane") || hasMissing("level") || hasMissing("laterality") || hasMissing("contraction_type") || hasMissing("emphasis");
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
      const missing = ["subcategory", "movement_plane", "level", "laterality", "contraction_type", "emphasis"]
        .filter((f) => !ex[f as keyof typeof ex]).length;
      if (missing > 0) counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [exercises]);

  const getSubcategoryOptions = (category: string | null, movementPattern: string | null) => {
    if (category === "forca_hipertrofia" && movementPattern && STRENGTH_SUBCATEGORIES[movementPattern]) {
      return STRENGTH_SUBCATEGORIES[movementPattern];
    }
    if (category === "potencia_pliometria") return POTENCIA_SUBCATEGORIES;
    if (category === "core_ativacao") return CORE_SUBCATEGORIES;
    if (category === "lmf") return LMF_SUBCATEGORIES;
    return null;
  };

  const getValue = (exerciseId: string, field: string, originalValue: string | null) => {
    return edits[exerciseId]?.[field] !== undefined ? (edits[exerciseId][field] as string | null) : originalValue;
  };

  const editCount = Object.keys(edits).length;

  return (
    <PageLayout>
      <PageHeader
        title="Revisão de Exercícios"
        description={`${incompleteExercises.length} exercícios com campos incompletos`}
      />
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

          {editCount > 0 && (
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="ml-auto">
              <Save className="h-4 w-4 mr-2" />
              Salvar {editCount} alterações
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Lateralidade</TableHead>
                  <TableHead>Contração</TableHead>
                  <TableHead>Ênfase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incompleteExercises.map((ex) => {
                  const subcatOptions = getSubcategoryOptions(ex.category, ex.movement_pattern);
                  return (
                    <TableRow key={ex.id} className={edits[ex.id] ? "bg-accent/30" : ""}>
                      <TableCell className="font-medium text-sm">{ex.name}</TableCell>
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

                      {/* Contraction Type */}
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Todos os exercícios estão completos para os filtros selecionados! 🎉
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default ExerciseReviewPage;
