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
      ai_messages: {
        Row: {
          content: Json
          created_at: string
          id: number
          owner_id: string
          role: string
          session_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: number
          owner_id: string
          role: string
          session_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: number
          owner_id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          completion_tokens: number | null
          cost_usd: number | null
          created_at: string | null
          id: number
          mode: string
          owner_id: string
          prompt_tokens: number | null
        }
        Insert: {
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string | null
          id?: number
          mode: string
          owner_id: string
          prompt_tokens?: number | null
        }
        Update: {
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string | null
          id?: number
          mode?: string
          owner_id?: string
          prompt_tokens?: number | null
        }
        Relationships: []
      }
      ai_sessions: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          last_activity: string
          owner_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          last_activity?: string
          owner_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          last_activity?: string
          owner_id?: string
          title?: string | null
        }
        Relationships: []
      }
      command_audit: {
        Row: {
          command_type: string
          created_at: string | null
          id: string
          idempotency_key: string | null
          owner_id: string
          payload: Json
          result: Json | null
        }
        Insert: {
          command_type: string
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          owner_id: string
          payload: Json
          result?: Json | null
        }
        Update: {
          command_type?: string
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          owner_id?: string
          payload?: Json
          result?: Json | null
        }
        Relationships: []
      }
      conflicts: {
        Row: {
          buffer_min: number | null
          created_at: string | null
          date_iso: string
          event_id: string | null
          id: string
          object_id: string | null
          object_kind: string
          overlap_min: number
          owner_id: string
          prayer_end: string
          prayer_name: string
          prayer_start: string
          resolution: string | null
          severity: string | null
          status: string | null
          suggested_start_iso: string | null
          updated_at: string | null
        }
        Insert: {
          buffer_min?: number | null
          created_at?: string | null
          date_iso: string
          event_id?: string | null
          id?: string
          object_id?: string | null
          object_kind: string
          overlap_min: number
          owner_id: string
          prayer_end: string
          prayer_name: string
          prayer_start: string
          resolution?: string | null
          severity?: string | null
          status?: string | null
          suggested_start_iso?: string | null
          updated_at?: string | null
        }
        Update: {
          buffer_min?: number | null
          created_at?: string | null
          date_iso?: string
          event_id?: string | null
          id?: string
          object_id?: string | null
          object_kind?: string
          overlap_min?: number
          owner_id?: string
          prayer_end?: string
          prayer_name?: string
          prayer_start?: string
          resolution?: string | null
          severity?: string | null
          status?: string | null
          suggested_start_iso?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conflicts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          created_at: string | null
          id: string
          log_date: string
          mma_hours: number | null
          notes: string | null
          owner_id: string
          project_focus: string | null
          study_hours: number | null
          walk_min: number | null
          weight_kg: number | null
          work_hours: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          log_date: string
          mma_hours?: number | null
          notes?: string | null
          owner_id: string
          project_focus?: string | null
          study_hours?: number | null
          walk_min?: number | null
          weight_kg?: number | null
          work_hours?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          log_date?: string
          mma_hours?: number | null
          notes?: string | null
          owner_id?: string
          project_focus?: string | null
          study_hours?: number | null
          walk_min?: number | null
          weight_kg?: number | null
          work_hours?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          duration_min: number | null
          ends_at: string
          external_etag: string | null
          external_event_id: string | null
          id: string
          is_ai_created: boolean | null
          last_write_origin: string | null
          owner_id: string
          source_id: string | null
          starts_at: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          ends_at: string
          external_etag?: string | null
          external_event_id?: string | null
          id?: string
          is_ai_created?: boolean | null
          last_write_origin?: string | null
          owner_id: string
          source_id?: string | null
          starts_at: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          ends_at?: string
          external_etag?: string | null
          external_event_id?: string | null
          id?: string
          is_ai_created?: boolean | null
          last_write_origin?: string | null
          owner_id?: string
          source_id?: string | null
          starts_at?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      external_accounts: {
        Row: {
          access_token_enc: string
          created_at: string | null
          expires_at: string | null
          owner_id: string
          provider: string
          refresh_token_enc: string | null
          scopes: string[]
          updated_at: string | null
        }
        Insert: {
          access_token_enc: string
          created_at?: string | null
          expires_at?: string | null
          owner_id: string
          provider: string
          refresh_token_enc?: string | null
          scopes: string[]
          updated_at?: string | null
        }
        Update: {
          access_token_enc?: string
          created_at?: string | null
          expires_at?: string | null
          owner_id?: string
          provider?: string
          refresh_token_enc?: string | null
          scopes?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount_usd: number
          category: string | null
          created_at: string | null
          entry_date: string
          id: string
          note: string | null
          owner_id: string
          source: string | null
          type: string
        }
        Insert: {
          amount_usd: number
          category?: string | null
          created_at?: string | null
          entry_date: string
          id?: string
          note?: string | null
          owner_id: string
          source?: string | null
          type: string
        }
        Update: {
          amount_usd?: number
          category?: string | null
          created_at?: string | null
          entry_date?: string
          id?: string
          note?: string | null
          owner_id?: string
          source?: string | null
          type?: string
        }
        Relationships: []
      }
      location_samples: {
        Row: {
          accuracy_m: number | null
          id: string
          latitude: number
          longitude: number
          owner_id: string
          recorded_at: string | null
          sampled_at: string | null
          source: string | null
        }
        Insert: {
          accuracy_m?: number | null
          id?: string
          latitude: number
          longitude: number
          owner_id: string
          recorded_at?: string | null
          sampled_at?: string | null
          source?: string | null
        }
        Update: {
          accuracy_m?: number | null
          id?: string
          latitude?: number
          longitude?: number
          owner_id?: string
          recorded_at?: string | null
          sampled_at?: string | null
          source?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          label: string | null
          owner_id: string
          rrule: string | null
          time_local: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          label?: string | null
          owner_id: string
          rrule?: string | null
          time_local?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          label?: string | null
          owner_id?: string
          rrule?: string | null
          time_local?: string | null
        }
        Relationships: []
      }
      prayer_times: {
        Row: {
          asr: string | null
          created_at: string | null
          date_iso: string
          dhuhr: string | null
          fajr: string | null
          isha: string | null
          maghrib: string | null
          method: string | null
          owner_id: string
          source: string | null
          sunrise: string | null
        }
        Insert: {
          asr?: string | null
          created_at?: string | null
          date_iso?: string
          dhuhr?: string | null
          fajr?: string | null
          isha?: string | null
          maghrib?: string | null
          method?: string | null
          owner_id?: string
          source?: string | null
          sunrise?: string | null
        }
        Update: {
          asr?: string | null
          created_at?: string | null
          date_iso?: string
          dhuhr?: string | null
          fajr?: string | null
          isha?: string | null
          maghrib?: string | null
          method?: string | null
          owner_id?: string
          source?: string | null
          sunrise?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          currency: string | null
          full_name: string | null
          id: string
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          prayer_method: string | null
          telemetry_enabled: boolean | null
          timezone: string | null
          tz: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          prayer_method?: string | null
          telemetry_enabled?: boolean | null
          timezone?: string | null
          tz?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          prayer_method?: string | null
          telemetry_enabled?: boolean | null
          timezone?: string | null
          tz?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          deadline: string | null
          id: string
          name: string
          next_action: string | null
          notes: string | null
          owner_id: string
          priority: string | null
          status: string | null
          target: string | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          id?: string
          name: string
          next_action?: string | null
          notes?: string | null
          owner_id: string
          priority?: string | null
          status?: string | null
          target?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          id?: string
          name?: string
          next_action?: string | null
          notes?: string | null
          owner_id?: string
          priority?: string | null
          status?: string | null
          target?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string | null
          id: string
          item: string | null
          owner_id: string
          price_usd: number | null
          profit_usd: number | null
          qty: number | null
          sale_date: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item?: string | null
          owner_id: string
          price_usd?: number | null
          profit_usd?: number | null
          qty?: number | null
          sale_date: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item?: string | null
          owner_id?: string
          price_usd?: number | null
          profit_usd?: number | null
          qty?: number | null
          sale_date?: string
          type?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          due_date: string | null
          event_id: string | null
          id: string
          order_pos: number
          owner_id: string
          project_id: string
          status: string
          tags: string[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          order_pos?: number
          owner_id: string
          project_id: string
          status?: string
          tags?: string[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          order_pos?: number
          owner_id?: string
          project_id?: string
          status?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
