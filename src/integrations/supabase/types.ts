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
      agent_messages: {
        Row: {
          content: Json
          created_at: string
          id: string
          owner_id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          owner_id: string
          role: string
          thread_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          owner_id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_threads: {
        Row: {
          created_at: string
          id: string
          kind: string
          owner_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          owner_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_action_queue: {
        Row: {
          action_type: string
          created_at: string | null
          error: string | null
          finished_at: string | null
          id: string
          owner_id: string
          payload: Json
          run_at: string | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          owner_id: string
          payload: Json
          run_at?: string | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          owner_id?: string
          payload?: Json
          run_at?: string | null
          session_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_sessions_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_actions: {
        Row: {
          created_at: string
          id: string
          input: Json | null
          output: Json | null
          session_id: string
          tool: string
        }
        Insert: {
          created_at?: string
          id?: string
          input?: Json | null
          output?: Json | null
          session_id: string
          tool: string
        }
        Update: {
          created_at?: string
          id?: string
          input?: Json | null
          output?: Json | null
          session_id?: string
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_consent: {
        Row: {
          expires_at: string | null
          granted: boolean
          granted_at: string | null
          metadata: Json | null
          owner_id: string
          scope: string
        }
        Insert: {
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          metadata?: Json | null
          owner_id: string
          scope: string
        }
        Update: {
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          metadata?: Json | null
          owner_id?: string
          scope?: string
        }
        Relationships: []
      }
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
            foreignKeyName: "ai_messages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages_v2: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          role: string
          session_id: string
          token_count: number | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          role: string
          session_id: string
          token_count?: number | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_v2_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_sessions_v2"
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
        Relationships: [
          {
            foreignKeyName: "ai_runs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_sessions: {
        Row: {
          consent_read_calendar: boolean | null
          consent_write_calendar: boolean | null
          consent_write_tasks: boolean | null
          created_at: string
          id: string
          is_archived: boolean
          last_activity: string
          owner_id: string
          title: string | null
        }
        Insert: {
          consent_read_calendar?: boolean | null
          consent_write_calendar?: boolean | null
          consent_write_tasks?: boolean | null
          created_at?: string
          id?: string
          is_archived?: boolean
          last_activity?: string
          owner_id: string
          title?: string | null
        }
        Update: {
          consent_read_calendar?: boolean | null
          consent_write_calendar?: boolean | null
          consent_write_tasks?: boolean | null
          created_at?: string
          id?: string
          is_archived?: boolean
          last_activity?: string
          owner_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_sessions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_sessions_v2: {
        Row: {
          created_at: string | null
          id: string
          last_active_at: string | null
          owner_id: string
          persona: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_active_at?: string | null
          owner_id: string
          persona?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_active_at?: string | null
          owner_id?: string
          persona?: string | null
          title?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          id: number
          kind: string
          meta: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          kind: string
          meta?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          kind?: string
          meta?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      appointment_bookings: {
        Row: {
          created_at: string | null
          end_at: string
          event_id: string | null
          guest_email: string
          guest_name: string
          id: string
          notes: string | null
          page_id: string
          start_at: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          end_at: string
          event_id?: string | null
          guest_email: string
          guest_name: string
          id?: string
          notes?: string | null
          page_id: string
          start_at: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          end_at?: string
          event_id?: string | null
          guest_email?: string
          guest_name?: string
          id?: string
          notes?: string | null
          page_id?: string
          start_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "vw_events_conflicts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "vw_events_with_conflicts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_bookings_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "appointment_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_pages: {
        Row: {
          active: boolean | null
          availability_window: Json | null
          buffer_minutes: Json | null
          created_at: string | null
          description: string | null
          durations: number[] | null
          id: string
          max_per_day: number | null
          slug: string
          timezone: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          availability_window?: Json | null
          buffer_minutes?: Json | null
          created_at?: string | null
          description?: string | null
          durations?: number[] | null
          id?: string
          max_per_day?: number | null
          slug: string
          timezone?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          availability_window?: Json | null
          buffer_minutes?: Json | null
          created_at?: string | null
          description?: string | null
          durations?: number[] | null
          id?: string
          max_per_day?: number | null
          slug?: string
          timezone?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      autopilot_actions: {
        Row: {
          action: string
          applied_at: string
          confidence: number | null
          conflict_id: number
          id: number
          owner_id: string
          patch_after: Json | null
          patch_before: Json | null
          suggested_action: string | null
          undo_token: string | null
        }
        Insert: {
          action: string
          applied_at?: string
          confidence?: number | null
          conflict_id: number
          id?: number
          owner_id: string
          patch_after?: Json | null
          patch_before?: Json | null
          suggested_action?: string | null
          undo_token?: string | null
        }
        Update: {
          action?: string
          applied_at?: string
          confidence?: number | null
          conflict_id?: number
          id?: number
          owner_id?: string
          patch_after?: Json | null
          patch_before?: Json | null
          suggested_action?: string | null
          undo_token?: string | null
        }
        Relationships: []
      }
      autopilot_learning: {
        Row: {
          applied_at: string | null
          conflict_id: string | null
          conflict_type: string
          context: Json | null
          created_at: string | null
          day_of_week: number | null
          id: string
          owner_id: string
          suggested_action: string
          time_of_day: string | null
          user_decision: string
        }
        Insert: {
          applied_at?: string | null
          conflict_id?: string | null
          conflict_type: string
          context?: Json | null
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          owner_id: string
          suggested_action: string
          time_of_day?: string | null
          user_decision: string
        }
        Update: {
          applied_at?: string | null
          conflict_id?: string | null
          conflict_type?: string
          context?: Json | null
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          owner_id?: string
          suggested_action?: string
          time_of_day?: string | null
          user_decision?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_learning_conflict_id_fkey"
            columns: ["conflict_id"]
            isOneToOne: false
            referencedRelation: "conflicts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_learning_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      business_plans: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_pos: number | null
          owner_id: string
          slug: string
          target_monthly: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_pos?: number | null
          owner_id: string
          slug: string
          target_monthly?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_pos?: number | null
          owner_id?: string
          slug?: string
          target_monthly?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_mapping: {
        Row: {
          calendar_id: string
          id: number
          kind: string
          owner_id: string
          provider: string
        }
        Insert: {
          calendar_id: string
          id?: number
          kind: string
          owner_id: string
          provider?: string
        }
        Update: {
          calendar_id?: string
          id?: number
          kind?: string
          owner_id?: string
          provider?: string
        }
        Relationships: []
      }
      calendar_sync_state: {
        Row: {
          calendar_id: string
          full_sync_done: boolean | null
          id: number
          provider: string
          sync_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_id: string
          full_sync_done?: boolean | null
          id?: number
          provider: string
          sync_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_id?: string
          full_sync_done?: boolean | null
          id?: number
          provider?: string
          sync_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_watch_channels: {
        Row: {
          calendar_id: string
          channel_id: string
          created_at: string | null
          expires_at: string
          provider: string
          resource_id: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          channel_id: string
          created_at?: string | null
          expires_at: string
          provider: string
          resource_id: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          channel_id?: string
          created_at?: string | null
          expires_at?: string
          provider?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_watch_channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          name: string
          provider: string | null
          source: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          provider?: string | null
          source: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          provider?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
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
          applied_event_patch: Json | null
          buffer_min: number | null
          confidence: number | null
          conflict_date: string | null
          created_at: string | null
          date_iso: string
          decided_action: string | null
          decided_at: string | null
          decided_by: string | null
          event_id: string | null
          id: string
          last_checked_at: string | null
          learned_confidence: number | null
          learning_applied: boolean | null
          notification_id: number | null
          object_id: string | null
          object_kind: string
          overlap_min: number
          owner_id: string
          prayer_end: string
          prayer_name: string
          prayer_start: string
          prayer_time: string | null
          requires_consent: boolean | null
          resolution: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["conflict_severity"] | null
          slot_name: string | null
          snooze_until: string | null
          status: string | null
          suggested_action: string | null
          suggested_change: Json | null
          suggested_start_iso: string | null
          suggestion: Json | null
          undo_patch: Json | null
          updated_at: string | null
          user_feedback: string | null
        }
        Insert: {
          applied_event_patch?: Json | null
          buffer_min?: number | null
          confidence?: number | null
          conflict_date?: string | null
          created_at?: string | null
          date_iso: string
          decided_action?: string | null
          decided_at?: string | null
          decided_by?: string | null
          event_id?: string | null
          id?: string
          last_checked_at?: string | null
          learned_confidence?: number | null
          learning_applied?: boolean | null
          notification_id?: number | null
          object_id?: string | null
          object_kind: string
          overlap_min: number
          owner_id: string
          prayer_end: string
          prayer_name: string
          prayer_start: string
          prayer_time?: string | null
          requires_consent?: boolean | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["conflict_severity"] | null
          slot_name?: string | null
          snooze_until?: string | null
          status?: string | null
          suggested_action?: string | null
          suggested_change?: Json | null
          suggested_start_iso?: string | null
          suggestion?: Json | null
          undo_patch?: Json | null
          updated_at?: string | null
          user_feedback?: string | null
        }
        Update: {
          applied_event_patch?: Json | null
          buffer_min?: number | null
          confidence?: number | null
          conflict_date?: string | null
          created_at?: string | null
          date_iso?: string
          decided_action?: string | null
          decided_at?: string | null
          decided_by?: string | null
          event_id?: string | null
          id?: string
          last_checked_at?: string | null
          learned_confidence?: number | null
          learning_applied?: boolean | null
          notification_id?: number | null
          object_id?: string | null
          object_kind?: string
          overlap_min?: number
          owner_id?: string
          prayer_end?: string
          prayer_name?: string
          prayer_start?: string
          prayer_time?: string | null
          requires_consent?: boolean | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["conflict_severity"] | null
          slot_name?: string | null
          snooze_until?: string | null
          status?: string | null
          suggested_action?: string | null
          suggested_change?: Json | null
          suggested_start_iso?: string | null
          suggestion?: Json | null
          undo_patch?: Json | null
          updated_at?: string | null
          user_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conflicts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflicts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "vw_events_conflicts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflicts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "vw_events_with_conflicts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflicts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          created_at: string | null
          id: string
          income_usd: number | null
          log_date: string
          mma_hours: number | null
          notes: string | null
          owner_id: string
          project_focus: string | null
          scholarships_sold: number | null
          spend_usd: number | null
          study_hours: number | null
          villas_sold: number | null
          walk_min: number | null
          weight_kg: number | null
          work_hours: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          income_usd?: number | null
          log_date: string
          mma_hours?: number | null
          notes?: string | null
          owner_id: string
          project_focus?: string | null
          scholarships_sold?: number | null
          spend_usd?: number | null
          study_hours?: number | null
          villas_sold?: number | null
          walk_min?: number | null
          weight_kg?: number | null
          work_hours?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          income_usd?: number | null
          log_date?: string
          mma_hours?: number | null
          notes?: string | null
          owner_id?: string
          project_focus?: string | null
          scholarships_sold?: number | null
          spend_usd?: number | null
          study_hours?: number | null
          villas_sold?: number | null
          walk_min?: number | null
          weight_kg?: number | null
          work_hours?: number | null
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          email: string
          event_id: string
          name: string | null
          status: string | null
        }
        Insert: {
          email: string
          event_id: string
          name?: string | null
          status?: string | null
        }
        Update: {
          email?: string
          event_id?: string
          name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "vw_events_conflicts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "vw_events_with_conflicts"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          ai_confidence: number | null
          all_day: boolean | null
          buffer_after: number | null
          buffer_before: number | null
          calendar_id: string | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          duration_min: number | null
          ends_at: string
          etag: string | null
          exdates: string[] | null
          ext_id: string | null
          external_calendar_id: string | null
          external_etag: string | null
          external_event_id: string | null
          external_id: string | null
          external_source: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          is_ai_created: boolean | null
          is_all_day: boolean | null
          is_draft: boolean | null
          last_error: string | null
          last_google_sync_at: string | null
          last_push_at: string | null
          last_push_status: string | null
          last_write_origin: string | null
          location: string | null
          location_lat: number | null
          location_lon: number | null
          next_retry_at: string | null
          notes: string | null
          notify_channel: string[] | null
          owner_id: string
          pending_push: boolean
          retry_count: number
          rrule: string | null
          source: string | null
          source_id: string | null
          starts_at: string
          status: string | null
          sync_to_google: boolean | null
          tags: string[] | null
          title: string
          travel_minutes: number | null
          updated_at: string | null
          version: number
        }
        Insert: {
          ai_confidence?: number | null
          all_day?: boolean | null
          buffer_after?: number | null
          buffer_before?: number | null
          calendar_id?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_min?: number | null
          ends_at: string
          etag?: string | null
          exdates?: string[] | null
          ext_id?: string | null
          external_calendar_id?: string | null
          external_etag?: string | null
          external_event_id?: string | null
          external_id?: string | null
          external_source?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          is_ai_created?: boolean | null
          is_all_day?: boolean | null
          is_draft?: boolean | null
          last_error?: string | null
          last_google_sync_at?: string | null
          last_push_at?: string | null
          last_push_status?: string | null
          last_write_origin?: string | null
          location?: string | null
          location_lat?: number | null
          location_lon?: number | null
          next_retry_at?: string | null
          notes?: string | null
          notify_channel?: string[] | null
          owner_id: string
          pending_push?: boolean
          retry_count?: number
          rrule?: string | null
          source?: string | null
          source_id?: string | null
          starts_at: string
          status?: string | null
          sync_to_google?: boolean | null
          tags?: string[] | null
          title: string
          travel_minutes?: number | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          ai_confidence?: number | null
          all_day?: boolean | null
          buffer_after?: number | null
          buffer_before?: number | null
          calendar_id?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_min?: number | null
          ends_at?: string
          etag?: string | null
          exdates?: string[] | null
          ext_id?: string | null
          external_calendar_id?: string | null
          external_etag?: string | null
          external_event_id?: string | null
          external_id?: string | null
          external_source?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          is_ai_created?: boolean | null
          is_all_day?: boolean | null
          is_draft?: boolean | null
          last_error?: string | null
          last_google_sync_at?: string | null
          last_push_at?: string | null
          last_push_status?: string | null
          last_write_origin?: string | null
          location?: string | null
          location_lat?: number | null
          location_lon?: number | null
          next_retry_at?: string | null
          notes?: string | null
          notify_channel?: string[] | null
          owner_id?: string
          pending_push?: boolean
          retry_count?: number
          rrule?: string | null
          source?: string | null
          source_id?: string | null
          starts_at?: string
          status?: string | null
          sync_to_google?: boolean | null
          tags?: string[] | null
          title?: string
          travel_minutes?: number | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      external_accounts: {
        Row: {
          access_token: string | null
          access_token_enc: string
          account_email: string | null
          created_at: string | null
          expires_at: string | null
          ext_user_id: string | null
          last_sync_at: string | null
          next_sync_after: string | null
          owner_id: string
          primary_calendar_id: string | null
          provider: string
          provider_user_id: string | null
          refresh_token: string | null
          refresh_token_enc: string | null
          scope: string | null
          scopes: string[]
          status: string | null
          sync_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          access_token_enc: string
          account_email?: string | null
          created_at?: string | null
          expires_at?: string | null
          ext_user_id?: string | null
          last_sync_at?: string | null
          next_sync_after?: string | null
          owner_id: string
          primary_calendar_id?: string | null
          provider: string
          provider_user_id?: string | null
          refresh_token?: string | null
          refresh_token_enc?: string | null
          scope?: string | null
          scopes: string[]
          status?: string | null
          sync_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          access_token_enc?: string
          account_email?: string | null
          created_at?: string | null
          expires_at?: string | null
          ext_user_id?: string | null
          last_sync_at?: string | null
          next_sync_after?: string | null
          owner_id?: string
          primary_calendar_id?: string | null
          provider?: string
          provider_user_id?: string | null
          refresh_token?: string | null
          refresh_token_enc?: string | null
          scope?: string | null
          scopes?: string[]
          status?: string | null
          sync_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      external_calendars: {
        Row: {
          access_role: string | null
          calendar_id: string
          calendar_name: string
          color: string | null
          id: number
          owner_id: string
          primary_flag: boolean
          provider: string
          selected: boolean
          synced_at: string
        }
        Insert: {
          access_role?: string | null
          calendar_id: string
          calendar_name: string
          color?: string | null
          id?: number
          owner_id: string
          primary_flag?: boolean
          provider?: string
          selected?: boolean
          synced_at?: string
        }
        Update: {
          access_role?: string | null
          calendar_id?: string
          calendar_name?: string
          color?: string | null
          id?: number
          owner_id?: string
          primary_flag?: boolean
          provider?: string
          selected?: boolean
          synced_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          key: string
          pilot_user_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          key: string
          pilot_user_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          key?: string
          pilot_user_ids?: string[] | null
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
      financial_events: {
        Row: {
          amount: number
          confidence: number
          currency: string
          direction: number
          id: number
          inserted_at: string
          lat: number | null
          lng: number | null
          merchant: string | null
          place_name: string | null
          source_pkg: string | null
          user_id: string
          when_at: string
        }
        Insert: {
          amount: number
          confidence?: number
          currency?: string
          direction: number
          id?: number
          inserted_at?: string
          lat?: number | null
          lng?: number | null
          merchant?: string | null
          place_name?: string | null
          source_pkg?: string | null
          user_id: string
          when_at: string
        }
        Update: {
          amount?: number
          confidence?: number
          currency?: string
          direction?: number
          id?: number
          inserted_at?: string
          lat?: number | null
          lng?: number | null
          merchant?: string | null
          place_name?: string | null
          source_pkg?: string | null
          user_id?: string
          when_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      health_samples: {
        Row: {
          day: string
          hr_avg: number | null
          hr_max: number | null
          meters: number
          sleep_minutes: number | null
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          day: string
          hr_avg?: number | null
          hr_max?: number | null
          meters?: number
          sleep_minutes?: number | null
          steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          day?: string
          hr_avg?: number | null
          hr_max?: number | null
          meters?: number
          sleep_minutes?: number | null
          steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_samples_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "location_samples_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_patterns: {
        Row: {
          action_taken: string | null
          context: Json | null
          created_at: string | null
          day_of_week: number | null
          dismissed_at: string | null
          id: string
          notification_type: string
          opened_at: string | null
          owner_id: string
          sent_at: string
          time_of_day: string | null
        }
        Insert: {
          action_taken?: string | null
          context?: Json | null
          created_at?: string | null
          day_of_week?: number | null
          dismissed_at?: string | null
          id?: string
          notification_type: string
          opened_at?: string | null
          owner_id: string
          sent_at: string
          time_of_day?: string | null
        }
        Update: {
          action_taken?: string | null
          context?: Json | null
          created_at?: string | null
          day_of_week?: number | null
          dismissed_at?: string | null
          id?: string
          notification_type?: string
          opened_at?: string | null
          owner_id?: string
          sent_at?: string
          time_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_patterns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: string | null
          created_at: string | null
          enabled: boolean | null
          entity_id: string | null
          entity_type: string | null
          error: string | null
          id: string
          label: string | null
          mute_while_prayer: boolean | null
          owner_id: string
          payload: Json | null
          priority: number | null
          rrule: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          time_local: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          channel?: string | null
          created_at?: string | null
          enabled?: boolean | null
          entity_id?: string | null
          entity_type?: string | null
          error?: string | null
          id?: string
          label?: string | null
          mute_while_prayer?: boolean | null
          owner_id: string
          payload?: Json | null
          priority?: number | null
          rrule?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          time_local?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          channel?: string | null
          created_at?: string | null
          enabled?: boolean | null
          entity_id?: string | null
          entity_type?: string | null
          error?: string | null
          id?: string
          label?: string | null
          mute_while_prayer?: boolean | null
          owner_id?: string
          payload?: Json | null
          priority?: number | null
          rrule?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          time_local?: string | null
          title?: string | null
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          code_verifier: string
          created_at: string
          owner_id: string
          state: string
        }
        Insert: {
          code_verifier: string
          created_at?: string
          owner_id: string
          state: string
        }
        Update: {
          code_verifier?: string
          created_at?: string
          owner_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pilot_users: {
        Row: {
          cohort: string
          created_at: string
          notes: string | null
          user_id: string
        }
        Insert: {
          cohort?: string
          created_at?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          cohort?: string
          created_at?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
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
      privacy_audit: {
        Row: {
          action: string
          created_at: string
          id: number
          meta: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          meta?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          meta?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string | null
          allow_location: boolean | null
          auto_add_google_meet: boolean | null
          avatar_url: string | null
          calendar_writeback: boolean
          country_code: string | null
          created_at: string | null
          currency: string | null
          date_format: string | null
          default_calendar_id: string | null
          default_calendar_name: string | null
          default_calendar_provider: string | null
          default_event_duration: number | null
          default_notification_time: number | null
          default_task_list_id: string | null
          density_pref: string | null
          dnd_enabled: boolean | null
          dnd_end: string | null
          dnd_start: string | null
          enable_desktop_notifications: boolean | null
          enable_email_notifications: boolean | null
          enable_sound_notifications: boolean | null
          full_name: string | null
          id: string
          initial_balance_usd: number | null
          keyboard_shortcuts_enabled: boolean | null
          language: string | null
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          notification_sound: string | null
          prayer_buffers: Json | null
          prayer_method: string | null
          prayer_post_buffer_min: number | null
          prayer_pre_buffer_min: number | null
          reduce_brightness_past_events: boolean | null
          religion: string | null
          respect_prayer: boolean | null
          show_declined_events: boolean | null
          show_event_colors: boolean | null
          show_prayer_times_on_calendar: boolean | null
          show_week_numbers: boolean | null
          show_weekends: boolean | null
          telemetry_enabled: boolean | null
          theme_pref: string | null
          time_format: string | null
          timezone: string | null
          tz: string | null
          wa_opt_in: boolean | null
          wa_phone: string | null
          week_start_day: number | null
          working_days: Json | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          accent_color?: string | null
          allow_location?: boolean | null
          auto_add_google_meet?: boolean | null
          avatar_url?: string | null
          calendar_writeback?: boolean
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          default_calendar_id?: string | null
          default_calendar_name?: string | null
          default_calendar_provider?: string | null
          default_event_duration?: number | null
          default_notification_time?: number | null
          default_task_list_id?: string | null
          density_pref?: string | null
          dnd_enabled?: boolean | null
          dnd_end?: string | null
          dnd_start?: string | null
          enable_desktop_notifications?: boolean | null
          enable_email_notifications?: boolean | null
          enable_sound_notifications?: boolean | null
          full_name?: string | null
          id?: string
          initial_balance_usd?: number | null
          keyboard_shortcuts_enabled?: boolean | null
          language?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          notification_sound?: string | null
          prayer_buffers?: Json | null
          prayer_method?: string | null
          prayer_post_buffer_min?: number | null
          prayer_pre_buffer_min?: number | null
          reduce_brightness_past_events?: boolean | null
          religion?: string | null
          respect_prayer?: boolean | null
          show_declined_events?: boolean | null
          show_event_colors?: boolean | null
          show_prayer_times_on_calendar?: boolean | null
          show_week_numbers?: boolean | null
          show_weekends?: boolean | null
          telemetry_enabled?: boolean | null
          theme_pref?: string | null
          time_format?: string | null
          timezone?: string | null
          tz?: string | null
          wa_opt_in?: boolean | null
          wa_phone?: string | null
          week_start_day?: number | null
          working_days?: Json | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          accent_color?: string | null
          allow_location?: boolean | null
          auto_add_google_meet?: boolean | null
          avatar_url?: string | null
          calendar_writeback?: boolean
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          default_calendar_id?: string | null
          default_calendar_name?: string | null
          default_calendar_provider?: string | null
          default_event_duration?: number | null
          default_notification_time?: number | null
          default_task_list_id?: string | null
          density_pref?: string | null
          dnd_enabled?: boolean | null
          dnd_end?: string | null
          dnd_start?: string | null
          enable_desktop_notifications?: boolean | null
          enable_email_notifications?: boolean | null
          enable_sound_notifications?: boolean | null
          full_name?: string | null
          id?: string
          initial_balance_usd?: number | null
          keyboard_shortcuts_enabled?: boolean | null
          language?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          notification_sound?: string | null
          prayer_buffers?: Json | null
          prayer_method?: string | null
          prayer_post_buffer_min?: number | null
          prayer_pre_buffer_min?: number | null
          reduce_brightness_past_events?: boolean | null
          religion?: string | null
          respect_prayer?: boolean | null
          show_declined_events?: boolean | null
          show_event_colors?: boolean | null
          show_prayer_times_on_calendar?: boolean | null
          show_week_numbers?: boolean | null
          show_weekends?: boolean | null
          telemetry_enabled?: boolean | null
          theme_pref?: string | null
          time_format?: string | null
          timezone?: string | null
          tz?: string | null
          wa_opt_in?: boolean | null
          wa_phone?: string | null
          week_start_day?: number | null
          working_days?: Json | null
          working_hours_end?: string | null
          working_hours_start?: string | null
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
      push_log: {
        Row: {
          attempted_at: string
          error: string | null
          event_id: string
          id: number
          owner_id: string
          status: string
        }
        Insert: {
          attempted_at?: string
          error?: string | null
          event_id: string
          id?: number
          owner_id: string
          status: string
        }
        Update: {
          attempted_at?: string
          error?: string | null
          event_id?: string
          id?: number
          owner_id?: string
          status?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string | null
          id: string
          item: string | null
          owner_id: string
          plan_id: string | null
          plan_slug: string | null
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
          plan_id?: string | null
          plan_slug?: string | null
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
          plan_id?: string | null
          plan_slug?: string | null
          price_usd?: number | null
          profit_usd?: number | null
          qty?: number | null
          sale_date?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "business_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_performance"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      sync_audit: {
        Row: {
          action: string
          created_at: string
          id: number
          meta: Json | null
          provider: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          meta?: Json | null
          provider?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          meta?: Json | null
          provider?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          items_added: number | null
          items_skipped: number | null
          items_updated: number | null
          provider: string
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_added?: number | null
          items_skipped?: number | null
          items_updated?: number | null
          provider: string
          status: string
          sync_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_added?: number | null
          items_skipped?: number | null
          items_updated?: number | null
          provider?: string
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_lists: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          owner_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          owner_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          owner_id?: string
          title?: string
          updated_at?: string | null
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
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "vw_events_conflicts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "vw_events_with_conflicts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feature_flags: {
        Row: {
          flags: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          flags?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          flags?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_focus_state: {
        Row: {
          active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_focus_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_glances: {
        Row: {
          created_at: string | null
          layout: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          layout?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          layout?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_glances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_goals: {
        Row: {
          created_at: string | null
          goal_type: string
          id: string
          is_active: boolean | null
          owner_id: string
          period: string
          target_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          owner_id: string
          period?: string
          target_value: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          owner_id?: string
          period?: string
          target_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_privacy_prefs: {
        Row: {
          calendar_enabled: boolean
          health_enabled: boolean
          location_enabled: boolean
          notif_fin_enabled: boolean
          pause_all: boolean
          retention_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_enabled?: boolean
          health_enabled?: boolean
          location_enabled?: boolean
          notif_fin_enabled?: boolean
          pause_all?: boolean
          retention_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_enabled?: boolean
          health_enabled?: boolean
          location_enabled?: boolean
          notif_fin_enabled?: boolean
          pause_all?: boolean
          retention_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_privacy_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_tasks: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          list_id: string | null
          owner_id: string
          position: number | null
          priority: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          list_id?: string | null
          owner_id: string
          position?: number | null
          priority?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          list_id?: string | null
          owner_id?: string
          position?: number | null
          priority?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      voice_messages: {
        Row: {
          audio_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "voice_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          created_at: string | null
          fri: unknown
          mon: unknown
          sat: unknown
          sun: unknown
          thu: unknown
          tue: unknown
          tz: string
          updated_at: string | null
          user_id: string
          wed: unknown
        }
        Insert: {
          created_at?: string | null
          fri?: unknown
          mon?: unknown
          sat?: unknown
          sun?: unknown
          thu?: unknown
          tue?: unknown
          tz?: string
          updated_at?: string | null
          user_id: string
          wed?: unknown
        }
        Update: {
          created_at?: string | null
          fri?: unknown
          mon?: unknown
          sat?: unknown
          sun?: unknown
          thu?: unknown
          tue?: unknown
          tz?: string
          updated_at?: string | null
          user_id?: string
          wed?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      working_locations: {
        Row: {
          created_at: string | null
          today: string | null
          tomorrow: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          today?: string | null
          tomorrow?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          today?: string | null
          tomorrow?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      v_plan_performance: {
        Row: {
          category: string | null
          color: string | null
          description: string | null
          icon: string | null
          month_profit: number | null
          month_qty: number | null
          month_transactions: number | null
          name: string | null
          order_pos: number | null
          owner_id: string | null
          plan_id: string | null
          slug: string | null
          target_monthly: number | null
          today_profit: number | null
          week_profit: number | null
          year_profit: number | null
        }
        Relationships: []
      }
      vw_daily_metrics: {
        Row: {
          busy_minutes: number | null
          conflicts_count: number | null
          day: string | null
          expenses_count: number | null
          hr_avg: number | null
          hr_max: number | null
          incomes_count: number | null
          meters_total: number | null
          net_cashflow: number | null
          sleep_minutes: number | null
          steps_total: number | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_events_conflicts: {
        Row: {
          conflict_open_count: number | null
          conflict_prayers: string[] | null
          created_at: string | null
          description: string | null
          ends_at: string | null
          id: string | null
          owner_id: string | null
          source_id: string | null
          starts_at: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          conflict_open_count?: never
          conflict_prayers?: never
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string | null
          owner_id?: string | null
          source_id?: string | null
          starts_at?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          conflict_open_count?: never
          conflict_prayers?: never
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string | null
          owner_id?: string | null
          source_id?: string | null
          starts_at?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vw_events_with_conflicts: {
        Row: {
          color: string | null
          conflict_level: number | null
          created_at: string | null
          description: string | null
          duration_min: number | null
          ends_at: string | null
          external_calendar_id: string | null
          external_etag: string | null
          external_event_id: string | null
          external_id: string | null
          external_source: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string | null
          is_ai_created: boolean | null
          last_error: string | null
          last_google_sync_at: string | null
          last_push_at: string | null
          last_push_status: string | null
          last_write_origin: string | null
          location_lat: number | null
          location_lon: number | null
          next_retry_at: string | null
          notes: string | null
          owner_id: string | null
          pending_push: boolean | null
          retry_count: number | null
          source_id: string | null
          starts_at: string | null
          sync_to_google: boolean | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          color?: string | null
          conflict_level?: never
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          ends_at?: string | null
          external_calendar_id?: string | null
          external_etag?: string | null
          external_event_id?: string | null
          external_id?: string | null
          external_source?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string | null
          is_ai_created?: boolean | null
          last_error?: string | null
          last_google_sync_at?: string | null
          last_push_at?: string | null
          last_push_status?: string | null
          last_write_origin?: string | null
          location_lat?: number | null
          location_lon?: number | null
          next_retry_at?: string | null
          notes?: string | null
          owner_id?: string | null
          pending_push?: boolean | null
          retry_count?: number | null
          source_id?: string | null
          starts_at?: string | null
          sync_to_google?: boolean | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          color?: string | null
          conflict_level?: never
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          ends_at?: string | null
          external_calendar_id?: string | null
          external_etag?: string | null
          external_event_id?: string | null
          external_id?: string | null
          external_source?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string | null
          is_ai_created?: boolean | null
          last_error?: string | null
          last_google_sync_at?: string | null
          last_push_at?: string | null
          last_push_status?: string | null
          last_write_origin?: string | null
          location_lat?: number | null
          location_lon?: number | null
          next_retry_at?: string | null
          notes?: string | null
          owner_id?: string | null
          pending_push?: boolean | null
          retry_count?: number | null
          source_id?: string | null
          starts_at?: string | null
          sync_to_google?: boolean | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vw_productivity_daily: {
        Row: {
          ai_events: number | null
          day_utc: string | null
          events_total: number | null
          owner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vw_today_activities: {
        Row: {
          day: string | null
          owner_id: string | null
          sleep_hours: number | null
          sports_hours: number | null
          study_hours: number | null
          walk_minutes: number | null
          work_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_daily_metrics"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      admin_actions_daily: {
        Args: never
        Returns: {
          applied: number
          day: string
          total_actions: number
          undone: number
        }[]
      }
      admin_conflict_kpis: {
        Args: never
        Returns: {
          applied_7d: number
          as_of_date: string
          auto_applied_now: number
          open_now: number
          resolved_now: number
          suggested_now: number
          undo_rate_7d: number
          undone_7d: number
          undone_now: number
        }[]
      }
      admin_top_reasons_30d: {
        Args: never
        Returns: {
          cnt: number
          reason: string
        }[]
      }
      calculate_learned_confidence: {
        Args: { p_action: string; p_context: Json; p_owner_id: string }
        Returns: number
      }
      exec_sql: { Args: { params?: Json; sql: string }; Returns: Json }
      expand_instances: {
        Args: { p_from: string; p_to: string }
        Returns: undefined
      }
      fn_refresh_conflicts_for_date: {
        Args: { p_date: string; p_owner: string }
        Returns: undefined
      }
      get_best_notification_time: {
        Args: { p_notification_type: string; p_owner_id: string }
        Returns: string
      }
      get_daily_metrics: {
        Args: { p_end: string; p_start: string; p_user_id: string }
        Returns: {
          busy_minutes: number
          conflicts_count: number
          day: string
          expenses_count: number
          hr_avg: number
          hr_max: number
          incomes_count: number
          meters_total: number
          net_cashflow: number
          sleep_minutes: number
          steps_total: number
          user_id: string
        }[]
      }
      get_engagement_metrics: {
        Args: { p_end: string; p_start: string; p_user_id: string }
        Returns: {
          ai_briefs: number
          ai_plans: number
          ai_resolves: number
          day: string
          events_count: number
          page_views: number
          tile_uses: number
          unique_features_used: number
          widget_taps: number
        }[]
      }
      get_privacy_prefs: {
        Args: { p_user_id: string }
        Returns: {
          calendar_enabled: boolean
          health_enabled: boolean
          location_enabled: boolean
          notif_fin_enabled: boolean
          pause_all: boolean
          retention_days: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_privacy_prefs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_flags: { Args: { p_user_id: string }; Returns: Json }
      has_role:
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      ingest_financial_event: {
        Args: {
          p_amount: number
          p_currency?: string
          p_direction: number
          p_lat?: number
          p_lng?: number
          p_merchant?: string
          p_place_name?: string
          p_source_pkg?: string
          p_user_id: string
          p_when_at: string
        }
        Returns: undefined
      }
      is_admin: { Args: { p_uid: string }; Returns: boolean }
      log_privacy_audit: {
        Args: { p_action: string; p_meta: Json; p_user_id: string }
        Returns: undefined
      }
      refresh_daily_metrics: {
        Args: { full_refresh?: boolean }
        Returns: undefined
      }
      refresh_engagement: { Args: never; Returns: undefined }
      set_user_flag: {
        Args: { p_key: string; p_user_id: string; p_value: boolean }
        Returns: undefined
      }
      update_privacy_prefs: {
        Args: { p_prefs: Json; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ai_action_status: "queued" | "running" | "done" | "failed"
      ai_role: "system" | "user" | "assistant" | "tool"
      app_role: "admin" | "moderator" | "user"
      conflict_severity: "low" | "medium" | "high"
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
      ai_action_status: ["queued", "running", "done", "failed"],
      ai_role: ["system", "user", "assistant", "tool"],
      app_role: ["admin", "moderator", "user"],
      conflict_severity: ["low", "medium", "high"],
    },
  },
} as const
