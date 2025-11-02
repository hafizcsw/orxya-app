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
        Relationships: []
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
          created_at: string | null
          date_iso: string
          decided_action: string | null
          decided_at: string | null
          decided_by: string | null
          event_id: string | null
          id: string
          last_checked_at: string | null
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
          snooze_until: string | null
          status: string | null
          suggested_action: string | null
          suggested_change: Json | null
          suggested_start_iso: string | null
          suggestion: Json | null
          undo_patch: Json | null
          updated_at: string | null
        }
        Insert: {
          applied_event_patch?: Json | null
          buffer_min?: number | null
          confidence?: number | null
          created_at?: string | null
          date_iso: string
          decided_action?: string | null
          decided_at?: string | null
          decided_by?: string | null
          event_id?: string | null
          id?: string
          last_checked_at?: string | null
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
          snooze_until?: string | null
          status?: string | null
          suggested_action?: string | null
          suggested_change?: Json | null
          suggested_start_iso?: string | null
          suggestion?: Json | null
          undo_patch?: Json | null
          updated_at?: string | null
        }
        Update: {
          applied_event_patch?: Json | null
          buffer_min?: number | null
          confidence?: number | null
          created_at?: string | null
          date_iso?: string
          decided_action?: string | null
          decided_at?: string | null
          decided_by?: string | null
          event_id?: string | null
          id?: string
          last_checked_at?: string | null
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
          snooze_until?: string | null
          status?: string | null
          suggested_action?: string | null
          suggested_change?: Json | null
          suggested_start_iso?: string | null
          suggestion?: Json | null
          undo_patch?: Json | null
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
          all_day: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          duration_min: number | null
          ends_at: string
          etag: string | null
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
          owner_id: string
          pending_push: boolean
          retry_count: number
          source: string | null
          source_id: string | null
          starts_at: string
          status: string | null
          sync_to_google: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          version: number
        }
        Insert: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          ends_at: string
          etag?: string | null
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
          owner_id: string
          pending_push?: boolean
          retry_count?: number
          source?: string | null
          source_id?: string | null
          starts_at: string
          status?: string | null
          sync_to_google?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          ends_at?: string
          etag?: string | null
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
          owner_id?: string
          pending_push?: boolean
          retry_count?: number
          source?: string | null
          source_id?: string | null
          starts_at?: string
          status?: string | null
          sync_to_google?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: []
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
        Relationships: []
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
          accent_color: string | null
          calendar_writeback: boolean
          created_at: string | null
          currency: string | null
          default_calendar_id: string | null
          default_calendar_name: string | null
          default_calendar_provider: string | null
          density_pref: string | null
          dnd_enabled: boolean | null
          dnd_end: string | null
          dnd_start: string | null
          full_name: string | null
          id: string
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          prayer_buffers: Json | null
          prayer_method: string | null
          prayer_post_buffer_min: number | null
          prayer_pre_buffer_min: number | null
          religion: string | null
          respect_prayer: boolean | null
          telemetry_enabled: boolean | null
          theme_pref: string | null
          timezone: string | null
          tz: string | null
          wa_opt_in: boolean | null
          wa_phone: string | null
        }
        Insert: {
          accent_color?: string | null
          calendar_writeback?: boolean
          created_at?: string | null
          currency?: string | null
          default_calendar_id?: string | null
          default_calendar_name?: string | null
          default_calendar_provider?: string | null
          density_pref?: string | null
          dnd_enabled?: boolean | null
          dnd_end?: string | null
          dnd_start?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          prayer_buffers?: Json | null
          prayer_method?: string | null
          prayer_post_buffer_min?: number | null
          prayer_pre_buffer_min?: number | null
          religion?: string | null
          respect_prayer?: boolean | null
          telemetry_enabled?: boolean | null
          theme_pref?: string | null
          timezone?: string | null
          tz?: string | null
          wa_opt_in?: boolean | null
          wa_phone?: string | null
        }
        Update: {
          accent_color?: string | null
          calendar_writeback?: boolean
          created_at?: string | null
          currency?: string | null
          default_calendar_id?: string | null
          default_calendar_name?: string | null
          default_calendar_provider?: string | null
          density_pref?: string | null
          dnd_enabled?: boolean | null
          dnd_end?: string | null
          dnd_start?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          prayer_buffers?: Json | null
          prayer_method?: string | null
          prayer_post_buffer_min?: number | null
          prayer_pre_buffer_min?: number | null
          religion?: string | null
          respect_prayer?: boolean | null
          telemetry_enabled?: boolean | null
          theme_pref?: string | null
          timezone?: string | null
          tz?: string | null
          wa_opt_in?: boolean | null
          wa_phone?: string | null
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
      v_admin_actions_daily: {
        Row: {
          applied: number | null
          day: string | null
          total_actions: number | null
          undone: number | null
        }
        Relationships: []
      }
      v_admin_conflict_kpis: {
        Row: {
          applied_7d: number | null
          as_of_date: string | null
          auto_applied_now: number | null
          open_now: number | null
          resolved_now: number | null
          suggested_now: number | null
          undo_rate_7d: number | null
          undone_7d: number | null
          undone_now: number | null
        }
        Relationships: []
      }
      v_admin_top_reasons_30d: {
        Row: {
          cnt: number | null
          reason: string | null
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
        Relationships: []
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
        Relationships: []
      }
      vw_productivity_daily: {
        Row: {
          ai_events: number | null
          day_utc: string | null
          events_total: number | null
          owner_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_actions_daily: {
        Args: never
        Returns: {
          applied: number | null
          day: string | null
          total_actions: number | null
          undone: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_admin_actions_daily"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_conflict_kpis: {
        Args: never
        Returns: {
          applied_7d: number | null
          as_of_date: string | null
          auto_applied_now: number | null
          open_now: number | null
          resolved_now: number | null
          suggested_now: number | null
          undo_rate_7d: number | null
          undone_7d: number | null
          undone_now: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_admin_conflict_kpis"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_top_reasons_30d: {
        Args: never
        Returns: {
          cnt: number | null
          reason: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_admin_top_reasons_30d"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { p_uid: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
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
      app_role: ["admin", "moderator", "user"],
      conflict_severity: ["low", "medium", "high"],
    },
  },
} as const
