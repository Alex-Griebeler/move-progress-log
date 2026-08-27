import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  HandgripReferenceRange,
  SitToStandReferenceRange,
  Vo2ReferenceRange,
} from "@/utils/classification";

/**
 * Faixas de referência clínica (PR-8b) — leitura das tabelas seedadas no PR-8a.
 *
 * `classification.ts` é lookup-based e puro: precisa das linhas em memória pra
 * classificar. Estes hooks são a ponte. As tabelas são praticamente imutáveis
 * (mudam só quando o coach reseeda), então o cache é longo e não refaz fetch
 * por foco/mount — o custo de rede acontece uma vez por sessão.
 *
 * Erro NÃO é vazio: quem consome deve distinguir "sem faixa pra esta idade"
 * (lista vazia após o filtro) de "não consegui carregar a régua" (isError).
 */

const HOUR = 60 * 60 * 1000;

const REFERENCE_QUERY_OPTIONS = {
  staleTime: 12 * HOUR,
  gcTime: 24 * HOUR,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export const useVo2ReferenceRanges = () =>
  useQuery({
    queryKey: ["reference-ranges", "vo2"],
    ...REFERENCE_QUERY_OPTIONS,
    queryFn: async (): Promise<Vo2ReferenceRange[]> => {
      const { data, error } = await supabase
        .from("vo2_reference_ranges")
        .select("sex, age_min, age_max, classification, vo2_min, vo2_max")
        .order("age_min", { ascending: true })
        .order("vo2_min", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Vo2ReferenceRange[];
    },
  });

export const useHandgripReferenceRanges = () =>
  useQuery({
    queryKey: ["reference-ranges", "handgrip"],
    ...REFERENCE_QUERY_OPTIONS,
    queryFn: async (): Promise<HandgripReferenceRange[]> => {
      const { data, error } = await supabase
        .from("handgrip_reference_ranges")
        .select("sex, age_min, age_max, classification, kg_min, kg_max")
        .order("age_min", { ascending: true })
        .order("kg_min", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HandgripReferenceRange[];
    },
  });

export const useSitToStandReferenceRanges = () =>
  useQuery({
    queryKey: ["reference-ranges", "sit-to-stand"],
    ...REFERENCE_QUERY_OPTIONS,
    queryFn: async (): Promise<SitToStandReferenceRange[]> => {
      const { data, error } = await supabase
        .from("sit_to_stand_reference_ranges")
        .select("age_min, age_max, classification, score_min, score_max")
        .order("age_min", { ascending: true })
        .order("score_min", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SitToStandReferenceRange[];
    },
  });
