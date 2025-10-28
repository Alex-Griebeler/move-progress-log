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
          load_breakdown: string | null
          load_description: string | null
          load_kg: number | null
          observations: string | null
          reps: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          load_breakdown?: string | null
          load_description?: string | null
          load_kg?: number | null
          observations?: string | null
          reps?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          load_breakdown?: string | null
          load_description?: string | null
          load_kg?: number | null
          observations?: string | null
          reps?: number | null
          session_id?: string
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
          created_at: string
          description: string | null
          id: string
          laterality: string | null
          movement_pattern: string
          movement_plane: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          laterality?: string | null
          movement_pattern: string
          movement_plane?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          laterality?: string | null
          movement_pattern?: string
          movement_plane?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      students: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          fitness_level: string | null
          id: string
          injury_history: string | null
          limitations: string | null
          max_heart_rate: number | null
          name: string
          objectives: string | null
          preferences: string | null
          updated_at: string
          weekly_sessions_proposed: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          fitness_level?: string | null
          id?: string
          injury_history?: string | null
          limitations?: string | null
          max_heart_rate?: number | null
          name: string
          objectives?: string | null
          preferences?: string | null
          updated_at?: string
          weekly_sessions_proposed?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          fitness_level?: string | null
          id?: string
          injury_history?: string | null
          limitations?: string | null
          max_heart_rate?: number | null
          name?: string
          objectives?: string | null
          preferences?: string | null
          updated_at?: string
          weekly_sessions_proposed?: number | null
        }
        Relationships: []
      }
      workout_prescriptions: {
        Row: {
          created_at: string
          id: string
          name: string
          objective: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          objective?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          objective?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          student_id: string
          time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          student_id: string
          time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          student_id?: string
          time?: string
          updated_at?: string
        }
        Relationships: [
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
