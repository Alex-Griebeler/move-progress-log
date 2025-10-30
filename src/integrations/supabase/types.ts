export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      adaptation_rules: {
        Row: {
          action_type: string
          condition: string
          created_at: string | null
          description: string | null
          id: string
          metric_name: string
          severity: string
          threshold_value: number
        }
        Insert: {
          action_type: string
          condition: string
          created_at?: string | null
          description?: string | null
          id?: string
          metric_name: string
          severity: string
          threshold_value: number
        }
        Update: {
          action_type?: string
          condition?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metric_name?: string
          severity?: string
          threshold_value?: number
        }
        Relationships: []
      }
      exercise_adaptations: {
        Row: {
          adaptation_type: string
          created_at: string
          exercise_library_id: string
          id: string
          interval_seconds: number | null
          observations: string | null
          prescription_exercise_id: string
          pse: string | null
          reps: string | null
          sets: string | null
        }
        Insert: {
          adaptation_type: string
          created_at?: string
          exercise_library_id: string
          id?: string
          interval_seconds?: number | null
          observations?: string | null
          prescription_exercise_id: string
          pse?: string | null
          reps?: string | null
          sets?: string | null
        }
        Update: {
          adaptation_type?: string
          created_at?: string
          exercise_library_id?: string
          id?: string
          interval_seconds?: number | null
          observations?: string | null
          prescription_exercise_id?: string
          pse?: string | null
          reps?: string | null
          sets?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_adaptations_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercises_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_adaptations_prescription_exercise_id_fkey"
            columns: ["prescription_exercise_id"]
            isOneToOne: false
            referencedRelation: "prescription_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          is_best_set: boolean | null
          load_breakdown: string | null
          load_description: string | null
          load_kg: number | null
          observations: string | null
          reps: number | null
          session_id: string
          sets: number | null
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          is_best_set?: boolean | null
          load_breakdown?: string | null
          load_description?: string | null
          load_kg?: number | null
          observations?: string | null
          reps?: number | null
          session_id: string
          sets?: number | null
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          is_best_set?: boolean | null
          load_breakdown?: string | null
          load_description?: string | null
          load_kg?: number | null
          observations?: string | null
          reps?: number | null
          session_id?: string
          sets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises_library: {
        Row: {
          contraction_type: string | null
          created_at: string
          description: string | null
          id: string
          laterality: string | null
          level: string | null
          movement_pattern: string
          movement_plane: string | null
          name: string
          updated_at: string
        }
        Insert: {
          contraction_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          laterality?: string | null
          level?: string | null
          movement_pattern: string
          movement_plane?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          contraction_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          laterality?: string | null
          level?: string | null
          movement_pattern?: string
          movement_plane?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      oura_connections: {
        Row: {
          access_token: string
          connected_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          refresh_token: string
          student_id: string
          token_expires_at: string
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token: string
          student_id: string
          token_expires_at: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string
          student_id?: string
          token_expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oura_connections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      oura_metrics: {
        Row: {
          active_calories: number | null
          activity_balance: number | null
          activity_score: number | null
          average_breath: number | null
          average_sleep_hrv: number | null
          awake_time: number | null
          breathing_disturbance_index: number | null
          created_at: string | null
          date: string
          day_summary: string | null
          deep_sleep_duration: number | null
          high_activity_time: number | null
          hrv_balance: number | null
          id: string
          light_sleep_duration: number | null
          low_activity_time: number | null
          lowest_heart_rate: number | null
          medium_activity_time: number | null
          met_minutes: number | null
          readiness_score: number | null
          recovery_high_time: number | null
          rem_sleep_duration: number | null
          resilience_level: string | null
          resting_heart_rate: number | null
          sedentary_time: number | null
          sleep_efficiency: number | null
          sleep_latency: number | null
          sleep_score: number | null
          spo2_average: number | null
          steps: number | null
          stress_high_time: number | null
          student_id: string
          temperature_deviation: number | null
          total_calories: number | null
          total_sleep_duration: number | null
          training_frequency: number | null
          training_volume: number | null
          vo2_max: number | null
        }
        Insert: {
          active_calories?: number | null
          activity_balance?: number | null
          activity_score?: number | null
          average_breath?: number | null
          average_sleep_hrv?: number | null
          awake_time?: number | null
          breathing_disturbance_index?: number | null
          created_at?: string | null
          date: string
          day_summary?: string | null
          deep_sleep_duration?: number | null
          high_activity_time?: number | null
          hrv_balance?: number | null
          id?: string
          light_sleep_duration?: number | null
          low_activity_time?: number | null
          lowest_heart_rate?: number | null
          medium_activity_time?: number | null
          met_minutes?: number | null
          readiness_score?: number | null
          recovery_high_time?: number | null
          rem_sleep_duration?: number | null
          resilience_level?: string | null
          resting_heart_rate?: number | null
          sedentary_time?: number | null
          sleep_efficiency?: number | null
          sleep_latency?: number | null
          sleep_score?: number | null
          spo2_average?: number | null
          steps?: number | null
          stress_high_time?: number | null
          student_id: string
          temperature_deviation?: number | null
          total_calories?: number | null
          total_sleep_duration?: number | null
          training_frequency?: number | null
          training_volume?: number | null
          vo2_max?: number | null
        }
        Update: {
          active_calories?: number | null
          activity_balance?: number | null
          activity_score?: number | null
          average_breath?: number | null
          average_sleep_hrv?: number | null
          awake_time?: number | null
          breathing_disturbance_index?: number | null
          created_at?: string | null
          date?: string
          day_summary?: string | null
          deep_sleep_duration?: number | null
          high_activity_time?: number | null
          hrv_balance?: number | null
          id?: string
          light_sleep_duration?: number | null
          low_activity_time?: number | null
          lowest_heart_rate?: number | null
          medium_activity_time?: number | null
          met_minutes?: number | null
          readiness_score?: number | null
          recovery_high_time?: number | null
          rem_sleep_duration?: number | null
          resilience_level?: string | null
          resting_heart_rate?: number | null
          sedentary_time?: number | null
          sleep_efficiency?: number | null
          sleep_latency?: number | null
          sleep_score?: number | null
          spo2_average?: number | null
          steps?: number | null
          stress_high_time?: number | null
          student_id?: string
          temperature_deviation?: number | null
          total_calories?: number | null
          total_sleep_duration?: number | null
          training_frequency?: number | null
          training_volume?: number | null
          vo2_max?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oura_metrics_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      oura_workouts: {
        Row: {
          activity: string
          average_heart_rate: number | null
          calories: number | null
          created_at: string | null
          distance: number | null
          end_datetime: string
          id: string
          intensity: string | null
          max_heart_rate: number | null
          oura_workout_id: string
          source: string | null
          start_datetime: string
          student_id: string
        }
        Insert: {
          activity: string
          average_heart_rate?: number | null
          calories?: number | null
          created_at?: string | null
          distance?: number | null
          end_datetime: string
          id?: string
          intensity?: string | null
          max_heart_rate?: number | null
          oura_workout_id: string
          source?: string | null
          start_datetime: string
          student_id: string
        }
        Update: {
          activity?: string
          average_heart_rate?: number | null
          calories?: number | null
          created_at?: string | null
          distance?: number | null
          end_datetime?: string
          id?: string
          intensity?: string | null
          max_heart_rate?: number | null
          oura_workout_id?: string
          source?: string | null
          start_datetime?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oura_workouts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_assignments: {
        Row: {
          created_at: string
          custom_adaptations: Json | null
          end_date: string | null
          id: string
          prescription_id: string
          start_date: string
          student_id: string
        }
        Insert: {
          created_at?: string
          custom_adaptations?: Json | null
          end_date?: string | null
          id?: string
          prescription_id: string
          start_date: string
          student_id: string
        }
        Update: {
          created_at?: string
          custom_adaptations?: Json | null
          end_date?: string | null
          id?: string
          prescription_id?: string
          start_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_assignments_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "workout_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_exercises: {
        Row: {
          created_at: string
          exercise_library_id: string
          group_with_previous: boolean
          id: string
          interval_seconds: number | null
          observations: string | null
          order_index: number
          prescription_id: string
          pse: string | null
          reps: string
          sets: string
          training_method: string | null
        }
        Insert: {
          created_at?: string
          exercise_library_id: string
          group_with_previous?: boolean
          id?: string
          interval_seconds?: number | null
          observations?: string | null
          order_index: number
          prescription_id: string
          pse?: string | null
          reps: string
          sets: string
          training_method?: string | null
        }
        Update: {
          created_at?: string
          exercise_library_id?: string
          group_with_previous?: boolean
          id?: string
          interval_seconds?: number | null
          observations?: string | null
          order_index?: number
          prescription_id?: string
          pse?: string | null
          reps?: string
          sets?: string
          training_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_exercises_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercises_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_exercises_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "workout_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_recommendations: {
        Row: {
          applied: boolean | null
          created_at: string | null
          id: string
          priority: string
          protocol_id: string
          reason: string
          recommended_date: string
          student_id: string
          trainer_notes: string | null
        }
        Insert: {
          applied?: boolean | null
          created_at?: string | null
          id?: string
          priority: string
          protocol_id: string
          reason: string
          recommended_date?: string
          student_id: string
          trainer_notes?: string | null
        }
        Update: {
          applied?: boolean | null
          created_at?: string | null
          id?: string
          priority?: string
          protocol_id?: string
          reason?: string
          recommended_date?: string
          student_id?: string
          trainer_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_recommendations_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "recovery_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_recommendations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_protocols: {
        Row: {
          benefits: Json | null
          category: string
          contraindications: string | null
          created_at: string | null
          duration_minutes: number
          id: string
          instructions: string
          name: string
          scientific_references: string | null
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          benefits?: Json | null
          category: string
          contraindications?: string | null
          created_at?: string | null
          duration_minutes: number
          id?: string
          instructions: string
          name: string
          scientific_references?: string | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          benefits?: Json | null
          category?: string
          contraindications?: string | null
          created_at?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string
          name?: string
          scientific_references?: string | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_invites: {
        Row: {
          created_at: string | null
          created_student_id: string | null
          email: string | null
          expires_at: string
          id: string
          invite_token: string
          is_used: boolean | null
          trainer_id: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_student_id?: string | null
          email?: string | null
          expires_at: string
          id?: string
          invite_token: string
          is_used?: boolean | null
          trainer_id: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_student_id?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          is_used?: boolean | null
          trainer_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_invites_created_student_id_fkey"
            columns: ["created_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_invites_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_observations: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          exercise_id: string | null
          id: string
          is_resolved: boolean | null
          observation_text: string
          resolved_at: string | null
          session_id: string | null
          severity: string | null
          student_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          exercise_id?: string | null
          id?: string
          is_resolved?: boolean | null
          observation_text: string
          resolved_at?: string | null
          session_id?: string | null
          severity?: string | null
          student_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          exercise_id?: string | null
          id?: string
          is_resolved?: boolean | null
          observation_text?: string
          resolved_at?: string | null
          session_id?: string | null
          severity?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_observations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_observations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_observations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_observations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          fitness_level: string | null
          height_cm: number | null
          id: string
          injury_history: string | null
          limitations: string | null
          max_heart_rate: number | null
          name: string
          objectives: string | null
          preferences: string | null
          trainer_id: string
          updated_at: string
          weekly_sessions_proposed: number | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          fitness_level?: string | null
          height_cm?: number | null
          id?: string
          injury_history?: string | null
          limitations?: string | null
          max_heart_rate?: number | null
          name: string
          objectives?: string | null
          preferences?: string | null
          trainer_id: string
          updated_at?: string
          weekly_sessions_proposed?: number | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          fitness_level?: string | null
          height_cm?: number | null
          id?: string
          injury_history?: string | null
          limitations?: string | null
          max_heart_rate?: number | null
          name?: string
          objectives?: string | null
          preferences?: string | null
          trainer_id?: string
          updated_at?: string
          weekly_sessions_proposed?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      trainer_profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_prescriptions: {
        Row: {
          created_at: string
          id: string
          name: string
          objective: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          objective?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          objective?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          prescription_id: string | null
          student_id: string
          time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          prescription_id?: string | null
          student_id: string
          time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          prescription_id?: string | null
          student_id?: string
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "workout_prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
