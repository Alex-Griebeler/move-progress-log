import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Json } from "@/integrations/supabase/types";

export type LateralityType = 'right' | 'left' | 'ambidextrous';

export interface PainHistory {
  location: string;
  intensity: number;
  duration: string;
  frequency: string;
  aggravating_factors?: string[];
  relieving_factors?: string[];
}

export interface Surgery {
  procedure: string;
  date: string;
  notes?: string;
}

export interface RedFlags {
  unexplained_weight_loss?: boolean;
  night_pain?: boolean;
  fever?: boolean;
  bladder_bowel_dysfunction?: boolean;
  progressive_weakness?: boolean;
  recent_trauma?: boolean;
  other?: string;
}

export interface Sport {
  name: string;
  frequency_per_week: number;
  years_practicing: number;
  competitive_level?: string;
}

export interface AnamnesisResponse {
  id: string;
  assessment_id: string;
  birth_date: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  laterality: LateralityType | null;
  occupation: string | null;
  work_type: string | null;
  pain_history: PainHistory[];
  surgeries: Surgery[];
  red_flags: RedFlags;
  has_red_flags: boolean;
  sedentary_hours_per_day: number | null;
  sleep_quality: number | null;
  sleep_hours: number | null;
  activity_frequency: number | null;
  activity_types: string[];
  activity_duration_minutes: number | null;
  sports: Sport[];
  objectives: string | null;
  time_horizon: string | null;
  lgpd_consent: boolean;
  lgpd_consent_date: string | null;
  created_at: string;
  updated_at: string;
}

const mapAnamnesisFromDb = (data: any): AnamnesisResponse => ({
  ...data,
  pain_history: (data.pain_history as PainHistory[]) || [],
  surgeries: (data.surgeries as Surgery[]) || [],
  red_flags: (data.red_flags as RedFlags) || {},
  activity_types: (data.activity_types as string[]) || [],
  sports: (data.sports as Sport[]) || [],
});

export const useAnamnesis = (assessmentId: string | null) => {
  return useQuery({
    queryKey: ["anamnesis", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      if (!assessmentId) return null;

      const { data, error } = await supabase
        .from("anamnesis_responses")
        .select("*")
        .eq("assessment_id", assessmentId)
        .maybeSingle();

      if (error) throw error;
      
      return data ? mapAnamnesisFromDb(data) : null;
    },
  });
};

export const useCreateAnamnesis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assessment_id: string;
      birth_date?: string;
      weight_kg?: number;
      height_cm?: number;
      laterality?: LateralityType;
      occupation?: string;
      work_type?: string;
      pain_history?: PainHistory[];
      surgeries?: Surgery[];
      red_flags?: RedFlags;
      sedentary_hours_per_day?: number;
      sleep_quality?: number;
      sleep_hours?: number;
      activity_frequency?: number;
      activity_types?: string[];
      activity_duration_minutes?: number;
      sports?: Sport[];
      objectives?: string;
      time_horizon?: string;
      lgpd_consent?: boolean;
    }) => {
      const hasRedFlags = data.red_flags ? Object.values(data.red_flags).some(v => v === true) : false;

      const { data: anamnesis, error } = await supabase
        .from("anamnesis_responses")
        .insert({
          assessment_id: data.assessment_id,
          birth_date: data.birth_date || null,
          weight_kg: data.weight_kg || null,
          height_cm: data.height_cm || null,
          laterality: data.laterality || null,
          occupation: data.occupation || null,
          work_type: data.work_type || null,
          pain_history: (data.pain_history || []) as unknown as Json,
          surgeries: (data.surgeries || []) as unknown as Json,
          red_flags: (data.red_flags || {}) as unknown as Json,
          has_red_flags: hasRedFlags,
          sedentary_hours_per_day: data.sedentary_hours_per_day || null,
          sleep_quality: data.sleep_quality || null,
          sleep_hours: data.sleep_hours || null,
          activity_frequency: data.activity_frequency || null,
          activity_types: (data.activity_types || []) as unknown as Json,
          activity_duration_minutes: data.activity_duration_minutes || null,
          sports: (data.sports || []) as unknown as Json,
          objectives: data.objectives || null,
          time_horizon: data.time_horizon || null,
          lgpd_consent: data.lgpd_consent || false,
          lgpd_consent_date: data.lgpd_consent ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapAnamnesisFromDb(anamnesis);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis", variables.assessment_id] });
      notify.success("Anamnese salva com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao salvar anamnese", {
        description: error.message
      });
    },
  });
};

export const useUpdateAnamnesis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AnamnesisResponse> & { id: string }) => {
      const { id, ...updateData } = data;
      
      // Recalculate has_red_flags if red_flags is being updated
      const payload: Record<string, any> = { ...updateData };
      
      if (updateData.red_flags) {
        payload.has_red_flags = Object.values(updateData.red_flags).some(v => v === true);
        payload.red_flags = updateData.red_flags as unknown as Json;
      }

      // Update lgpd_consent_date if consent is being given
      if (updateData.lgpd_consent === true && !data.lgpd_consent_date) {
        payload.lgpd_consent_date = new Date().toISOString();
      }

      // Convert arrays to Json
      if (updateData.pain_history) {
        payload.pain_history = updateData.pain_history as unknown as Json;
      }
      if (updateData.surgeries) {
        payload.surgeries = updateData.surgeries as unknown as Json;
      }
      if (updateData.activity_types) {
        payload.activity_types = updateData.activity_types as unknown as Json;
      }
      if (updateData.sports) {
        payload.sports = updateData.sports as unknown as Json;
      }

      const { data: anamnesis, error } = await supabase
        .from("anamnesis_responses")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return mapAnamnesisFromDb(anamnesis);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis", data.assessment_id] });
      notify.success("Anamnese atualizada com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao atualizar anamnese", {
        description: error.message
      });
    },
  });
};

export const useUpsertAnamnesis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      assessment_id: string;
      birth_date?: string;
      weight_kg?: number;
      height_cm?: number;
      laterality?: LateralityType;
      occupation?: string;
      work_type?: string;
      pain_history?: PainHistory[];
      surgeries?: Surgery[];
      red_flags?: RedFlags;
      sedentary_hours_per_day?: number;
      sleep_quality?: number;
      sleep_hours?: number;
      activity_frequency?: number;
      activity_types?: string[];
      activity_duration_minutes?: number;
      sports?: Sport[];
      objectives?: string;
      time_horizon?: string;
      lgpd_consent?: boolean;
    }) => {
      // Check if anamnesis already exists
      const { data: existing } = await supabase
        .from("anamnesis_responses")
        .select("id")
        .eq("assessment_id", data.assessment_id)
        .maybeSingle();

      const hasRedFlags = data.red_flags ? Object.values(data.red_flags).some(v => v === true) : false;

      const payload = {
        assessment_id: data.assessment_id,
        birth_date: data.birth_date || null,
        weight_kg: data.weight_kg || null,
        height_cm: data.height_cm || null,
        laterality: data.laterality || null,
        occupation: data.occupation || null,
        work_type: data.work_type || null,
        pain_history: (data.pain_history || []) as unknown as Json,
        surgeries: (data.surgeries || []) as unknown as Json,
        red_flags: (data.red_flags || {}) as unknown as Json,
        has_red_flags: hasRedFlags,
        sedentary_hours_per_day: data.sedentary_hours_per_day || null,
        sleep_quality: data.sleep_quality || null,
        sleep_hours: data.sleep_hours || null,
        activity_frequency: data.activity_frequency || null,
        activity_types: (data.activity_types || []) as unknown as Json,
        activity_duration_minutes: data.activity_duration_minutes || null,
        sports: (data.sports || []) as unknown as Json,
        objectives: data.objectives || null,
        time_horizon: data.time_horizon || null,
        lgpd_consent: data.lgpd_consent || false,
        lgpd_consent_date: data.lgpd_consent ? new Date().toISOString() : null,
      };

      if (existing) {
        const { data: anamnesis, error } = await supabase
          .from("anamnesis_responses")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return mapAnamnesisFromDb(anamnesis);
      } else {
        const { data: anamnesis, error } = await supabase
          .from("anamnesis_responses")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return mapAnamnesisFromDb(anamnesis);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis", variables.assessment_id] });
      notify.success("Anamnese salva com sucesso");
    },
    onError: (error: Error) => {
      notify.error("Erro ao salvar anamnese", {
        description: error.message
      });
    },
  });
};
