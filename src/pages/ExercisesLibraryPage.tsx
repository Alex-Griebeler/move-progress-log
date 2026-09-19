import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Filter, X, Database, Search, AlertTriangle, Video, Zap, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AddExerciseDialog } from "@/components/AddExerciseDialog";
import { ExerciseName } from "@/components/ExerciseName";
import { EditExerciseLibraryDialog } from "@/components/EditExerciseLibraryDialog";
import {
  useExercisesLibrary,
  useDeleteExercise,
  ExerciseLibrary,
  MOVEMENT_PATTERNS,
  POWER_MOVEMENT_PATTERNS,
  getMovementPatternLabel,
  isLegacyMovementPattern,
  LATERALITY_OPTIONS,
  MOVEMENT_PLANES,
  CONTRACTION_TYPES,
  LEVEL_OPTIONS,
  EXERCISE_CATEGORIES,
  RISK_LEVELS,
  EXERCISE_DIMENSIONS,
  BOYLE_SCORE_SCALE,
  STRENGTH_SUBCATEGORIES,
  STABILITY_POSITION_OPTIONS,
  SURFACE_MODIFIER_OPTIONS,
  ExerciseFilters,
} from "@/hooks/useExercisesLibrary";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { NAV_LABELS } from "@/constants/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSEOHead, SEO_PRESETS } from "@/hooks/useSEOHead";
import { useOpenGraph, FABRIK_OG_DEFAULTS } from "@/hooks/useOpenGraph";
import { getWebPageSchema, getBreadcrumbSchema, getItemListSchema } from "@/utils/structuredData";

// Rótulos em sentence case para os escores do card.
const DIMENSION_LABELS: Record<keyof typeof EXERCISE_DIMENSIONS, string> = {
  axial_load: "Carga axial",
  lumbar_demand: "Exigência lombar",
  technical_complexity: "Complexidade técnica",
  metabolic_potential: "Potencial metabólico",
  knee_dominance: "Dominância de joelho",
  hip_dominance: "Dominância de quadril",
};
const DIMENSION_KEYS = Object.keys(DIMENSION_LABELS) as Array<keyof typeof EXERCISE_DIMENSIONS>;

export default function ExercisesLibraryPage() {
  usePageTitle(NAV_LABELS.exercises);
  useSEOHead(SEO_PRESETS.private);
  useOpenGraph({
    ...FABRIK_OG_DEFAULTS,
    title: `${NAV_LABELS.exercises} · Fabrik Performance`,
    description: 'Biblioteca de exercícios da Fabrik Performance.',
    type: 'website',
    url: true,
  });
  
  const [filters, setFilters] = useState<ExerciseFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [editingExercise, setEditingExercise] = useState<ExerciseLibrary | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);

  const { data: exercises, isLoading, isError, refetch } = useExercisesLibrary({
    ...filters,
    search: searchTerm.trim() || undefined,
  });
  const deleteExercise = useDeleteExercise();

  const handleDelete = async () => {
    if (deletingExerciseId) {
      await deleteExercise.mutateAsync(deletingExerciseId);
      setDeletingExerciseId(null);
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

  const hasActiveFilters =
    Object.values(filters).some((v) => v !== undefined && v !== null && String(v).trim() !== "") ||
    searchTerm.trim().length > 0;

  const filteredExercises = exercises;

  return (
    <PageLayout
      structuredData={[
        { data: getWebPageSchema(NAV_LABELS.exercises, "Biblioteca completa de exercícios com classificações por padrões de movimento, lateralidade, planos e tipos de contração"), id: "webpage-schema" },
        { data: getBreadcrumbSchema([{ label: "Home", href: "/" }, { label: NAV_LABELS.exercises, href: "/exercicios" }]), id: "breadcrumb-schema" },
        ...(exercises && exercises.length > 0 ? [{ data: getItemListSchema(exercises.map(ex => ({ name: ex.name })), "Biblioteca de Exercícios"), id: "exercises-list-schema" }] : []),
      ]}
    >
      <PageHeader
        title={NAV_LABELS.exercises}
        description={NAV_LABELS.subtitleExercises}
        breadcrumbs={[{ label: NAV_LABELS.exercises }]}
        actions={
          <div className="flex gap-xs">
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Adicionar exercício
            </Button>
            <AddExerciseDialog externalOpen={addDialogOpen} onExternalOpenChange={setAddDialogOpen} />
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-xs">
              <Filter className="h-5 w-5" />
              <CardTitle>{NAV_LABELS.sectionFilters}</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" aria-hidden="true" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-md">
          {/* Busca + filtros primários */}
          <div className="flex gap-md items-end flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercícios por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="space-y-xs min-w-[180px]">
              <label className="text-sm font-medium">Categoria</label>
              <Select
                value={filters.category || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ 
                    ...prev, 
                    category: value === "all" ? undefined : value,
                    // Limpar filtros dependentes quando categoria muda.
                    // Força e potência têm padrão de movimento (contrato forma×qualidade).
                    movement_pattern:
                      value === "forca_hipertrofia" || value === "potencia_pliometria"
                        ? prev.movement_pattern
                        : undefined,
                    subcategory: undefined,
                  }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(EXERCISE_CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-xs min-w-[160px]">
              <label className="text-sm font-medium">Nível de Risco</label>
              <Select
                value={filters.risk_level || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, risk_level: value === "all" ? undefined : value }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(RISK_LEVELS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Filtros avançados — colapsáveis */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              Mais filtros
              {[filters.movement_pattern, filters.subcategory, filters.laterality, filters.movement_plane, filters.contraction_type, filters.stability_position, filters.surface_modifier].filter(Boolean).length > 0 && (
                <span className="text-xs ml-1">
                  ({[filters.movement_pattern, filters.subcategory, filters.laterality, filters.movement_plane, filters.contraction_type, filters.stability_position, filters.surface_modifier].filter(Boolean).length} ativos)
                </span>
              )}
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-md pt-md mt-md border-t border-border/50">
              {/* Padrão de Movimento — Força e Potência (contrato forma×qualidade) */}
              {(filters.category === "forca_hipertrofia" ||
                filters.category === "potencia_pliometria") && (
                <div className="space-y-xs">
                  <label className="text-sm font-medium">Padrão de Movimento</label>
                  <Select
                    value={filters.movement_pattern || "all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ 
                        ...prev, 
                        movement_pattern: value === "all" ? undefined : value,
                        subcategory: undefined, // reset subcategory when pattern changes
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(
                        filters.category === "potencia_pliometria"
                          ? POWER_MOVEMENT_PATTERNS
                          : MOVEMENT_PATTERNS,
                      ).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Subcategoria — aparece para padrões com subdivisão ou Potência/Pliometria */}
              {(() => {
                let subcatOptions: Record<string, string> | null = null;
                if (filters.category === "forca_hipertrofia" && filters.movement_pattern && STRENGTH_SUBCATEGORIES[filters.movement_pattern]) {
                  subcatOptions = STRENGTH_SUBCATEGORIES[filters.movement_pattern];
                }
                // Potência não usa subcategoria (Opção A): forma=movement_pattern,
                // plano=movement_plane, lado=laterality — sem select de subcategoria.
                if (!subcatOptions) return null;
                return (
                  <div className="space-y-xs">
                    <label className="text-sm font-medium">Subcategoria</label>
                    <Select
                      value={filters.subcategory || "all"}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, subcategory: value === "all" ? undefined : value }))
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {Object.entries(subcatOptions).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}
              <div className="space-y-xs">
                <label className="text-sm font-medium">Lateralidade</label>
                <Select
                  value={filters.laterality || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, laterality: value === "all" ? undefined : value }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(LATERALITY_OPTIONS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-medium">Plano de Movimento</label>
                <Select
                  value={filters.movement_plane || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, movement_plane: value === "all" ? undefined : value }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(MOVEMENT_PLANES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-medium">Tipo de Contração</label>
                <Select
                  value={filters.contraction_type || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, contraction_type: value === "all" ? undefined : value }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(CONTRACTION_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-medium">Base / Posição</label>
                <Select
                  value={filters.stability_position || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, stability_position: value === "all" ? undefined : value }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(STABILITY_POSITION_OPTIONS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-xs">
                <label className="text-sm font-medium">Superfície</label>
                <Select
                  value={filters.surface_modifier || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, surface_modifier: value === "all" ? undefined : value }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(SURFACE_MODIFIER_OPTIONS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </details>
        </CardContent>
      </Card>

      {/* Exercise List */}
      {isError ? (
        // Falha de carregamento nunca vira "biblioteca vazia".
        <ErrorState
          title="Não foi possível carregar a biblioteca"
          description="Verifique a conexão e tente de novo. Nenhum exercício foi alterado."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3" role="status" aria-busy="true">
          <span className="sr-only">Carregando exercícios</span>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} aria-hidden="true">
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filteredExercises || filteredExercises.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="Nenhum exercício encontrado"
            description="Ajuste ou limpe os filtros para ver toda a biblioteca."
            primaryAction={{
              label: "Limpar filtros",
              onClick: clearFilters
            }}
            secondaryAction={{
              label: "Adicionar exercício",
              onClick: () => setAddDialogOpen(true),
            }}
          />
        ) : (
          <EmptyState
            icon={<Database className="h-6 w-6" />}
            title="Nenhum exercício cadastrado"
            description="Adicione o primeiro exercício para usá-lo nas prescrições."
            primaryAction={{
              label: "Adicionar exercício",
              onClick: () => setAddDialogOpen(true)
            }}
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {filteredExercises.map((exercise) => (
            <Card key={exercise.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg"><ExerciseName name={exercise.name} /></CardTitle>
                      {exercise.video_url && (
                        <span title="Possui vídeo"><Video className="h-4 w-4 text-primary" /></span>
                      )}
                      {exercise.risk_level === 'high' && (
                        <span title="Alto risco"><AlertTriangle className="h-4 w-4 text-destructive" /></span>
                      )}
                    </div>
                    {/* Apenas Categoria + Nível visíveis */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {exercise.category && (
                        <Badge variant="outline">
                          {EXERCISE_CATEGORIES[exercise.category as keyof typeof EXERCISE_CATEGORIES] || exercise.category}
                        </Badge>
                      )}
                      {exercise.level && (
                        <Badge variant="secondary">
                          {LEVEL_OPTIONS[exercise.level as keyof typeof LEVEL_OPTIONS]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                
                {/* Detalhes técnicos — visíveis sob demanda */}
                <details className="group">
                  <summary className="cursor-pointer min-h-10 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" aria-hidden="true" />
                    Detalhes técnicos
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {exercise.movement_pattern && (
                        <Badge variant="outline" className="text-xs">
                          {getMovementPatternLabel(exercise.movement_pattern)}
                          {isLegacyMovementPattern(exercise.movement_pattern) && (
                            <span className="ml-1 text-2xs text-muted-foreground">(legado)</span>
                          )}
                        </Badge>
                      )}
                      {exercise.risk_level && (
                        <Badge 
                          variant="outline"
                          className={`text-xs ${
                            exercise.risk_level === 'high' 
                              ? 'border-destructive text-destructive' 
                              : exercise.risk_level === 'medium' 
                                ? 'border-accent text-accent-foreground' 
                                : 'border-primary/50 text-primary'
                          }`}
                        >
                          {RISK_LEVELS[exercise.risk_level as keyof typeof RISK_LEVELS]?.label || exercise.risk_level}
                        </Badge>
                      )}
                      {exercise.laterality && (
                        <Badge variant="outline" className="text-xs">
                          {LATERALITY_OPTIONS[exercise.laterality as keyof typeof LATERALITY_OPTIONS] || exercise.laterality}
                        </Badge>
                      )}
                      {exercise.stability_position && (
                        <Badge variant="outline" className="text-xs">
                          {STABILITY_POSITION_OPTIONS[exercise.stability_position as keyof typeof STABILITY_POSITION_OPTIONS] || exercise.stability_position}
                        </Badge>
                      )}
                      {exercise.movement_plane && (
                        <Badge variant="outline" className="text-xs">
                          {MOVEMENT_PLANES[exercise.movement_plane as keyof typeof MOVEMENT_PLANES] || exercise.movement_plane}
                        </Badge>
                      )}
                      {exercise.contraction_type && (
                        <Badge variant="outline" className="text-xs">
                          {CONTRACTION_TYPES[exercise.contraction_type as keyof typeof CONTRACTION_TYPES] || exercise.contraction_type}
                        </Badge>
                      )}
                      {exercise.plyometric_phase && (
                        <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                          <Zap className="h-3 w-3 mr-1" />
                          Fase {exercise.plyometric_phase}
                        </Badge>
                      )}
                    </div>
                    {/* Scores */}
                    {/* Escores por extenso (antes: F3 AX2 LOM1… sem legenda). */}
                    {exercise.boyle_score != null && (
                      <dl className="grid grid-cols-[1fr_auto] gap-x-sm gap-y-0.5 text-caption">
                        <dt className="text-muted-foreground">Nível Fabrik</dt>
                        <dd className="tabular-nums text-right">{exercise.boyle_score}</dd>
                        {DIMENSION_KEYS.map((dim) =>
                          exercise[dim] != null ? (
                            <Fragment key={dim}>
                              <dt className="text-muted-foreground">{DIMENSION_LABELS[dim]}</dt>
                              <dd className="tabular-nums text-right">{exercise[dim]}</dd>
                            </Fragment>
                          ) : null,
                        )}
                      </dl>
                    )}
                    {exercise.description && (
                      <p className="text-xs text-muted-foreground">{exercise.description}</p>
                    )}
                    {exercise.equipment_required && exercise.equipment_required.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Equipamentos:</strong> {exercise.equipment_required.join(', ')}
                      </p>
                    )}
                  </div>
                </details>

                <div className="flex gap-xs items-center">
                  <Button
                    variant="outline"
                    onClick={() => setEditingExercise(exercise)}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingExerciseId(exercise.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    aria-label={`Excluir ${exercise.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingExercise && (
        <EditExerciseLibraryDialog
          exercise={editingExercise}
          open={!!editingExercise}
          onOpenChange={(open) => !open && setEditingExercise(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingExerciseId} onOpenChange={() => setDeletingExerciseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exercício</AlertDialogTitle>
            <AlertDialogDescription>
              O exercício sai da biblioteca. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
