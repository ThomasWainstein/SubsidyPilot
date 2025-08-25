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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          agency_type: string | null
          code: string | null
          contact_info: Json | null
          country_code: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          agency_type?: string | null
          code?: string | null
          contact_info?: Json | null
          country_code?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          agency_type?: string | null
          code?: string | null
          contact_info?: Json | null
          country_code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      ai_content_errors: {
        Row: {
          created_at: string | null
          id: string
          message: string
          page_id: string | null
          run_id: string
          snippet: string | null
          source_url: string | null
          stage: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          page_id?: string | null
          run_id: string
          snippet?: string | null
          source_url?: string | null
          stage: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          page_id?: string | null
          run_id?: string
          snippet?: string | null
          source_url?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_content_errors_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_content_runs: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          model: string | null
          notes: string | null
          pages_eligible: number | null
          pages_processed: number | null
          pages_seen: number | null
          reason: string | null
          run_id: string
          started_at: string | null
          status: string | null
          subs_created: number | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          pages_eligible?: number | null
          pages_processed?: number | null
          pages_seen?: number | null
          reason?: string | null
          run_id: string
          started_at?: string | null
          status?: string | null
          subs_created?: number | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          pages_eligible?: number | null
          pages_processed?: number | null
          pages_seen?: number | null
          reason?: string | null
          run_id?: string
          started_at?: string | null
          status?: string | null
          subs_created?: number | null
        }
        Relationships: []
      }
      ai_raw_extractions: {
        Row: {
          content_preview: string | null
          created_at: string
          id: string
          model: string | null
          page_id: string
          parsed_count: number | null
          prompt: string | null
          raw_output: string
          run_id: string
        }
        Insert: {
          content_preview?: string | null
          created_at?: string
          id?: string
          model?: string | null
          page_id: string
          parsed_count?: number | null
          prompt?: string | null
          raw_output: string
          run_id: string
        }
        Update: {
          content_preview?: string | null
          created_at?: string
          id?: string
          model?: string | null
          page_id?: string
          parsed_count?: number | null
          prompt?: string | null
          raw_output?: string
          run_id?: string
        }
        Relationships: []
      }
      api_health: {
        Row: {
          api_source: string
          check_timestamp: string | null
          error_message: string | null
          id: string
          is_available: boolean
          rate_limit_remaining: number | null
          rate_limit_reset: string | null
          response_time_ms: number | null
          status_code: number | null
          total_records_available: number | null
        }
        Insert: {
          api_source: string
          check_timestamp?: string | null
          error_message?: string | null
          id?: string
          is_available: boolean
          rate_limit_remaining?: number | null
          rate_limit_reset?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          total_records_available?: number | null
        }
        Update: {
          api_source?: string
          check_timestamp?: string | null
          error_message?: string | null
          id?: string
          is_available?: boolean
          rate_limit_remaining?: number | null
          rate_limit_reset?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          total_records_available?: number | null
        }
        Relationships: []
      }
      api_sync_logs: {
        Row: {
          api_source: string
          completed_at: string | null
          errors: Json | null
          id: string
          records_added: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string | null
          sync_type: string | null
        }
        Insert: {
          api_source: string
          completed_at?: string | null
          errors?: Json | null
          id?: string
          records_added?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
        }
        Update: {
          api_source?: string
          completed_at?: string | null
          errors?: Json | null
          id?: string
          records_added?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
        }
        Relationships: []
      }
      api_usage_tracking: {
        Row: {
          cost_used: number | null
          created_at: string | null
          date: string
          failure_count: number | null
          id: string
          requests_used: number | null
          service: string
          success_count: number | null
          total_processing_time_ms: number | null
          updated_at: string | null
        }
        Insert: {
          cost_used?: number | null
          created_at?: string | null
          date: string
          failure_count?: number | null
          id?: string
          requests_used?: number | null
          service: string
          success_count?: number | null
          total_processing_time_ms?: number | null
          updated_at?: string | null
        }
        Update: {
          cost_used?: number | null
          created_at?: string | null
          date?: string
          failure_count?: number | null
          id?: string
          requests_used?: number | null
          service?: string
          success_count?: number | null
          total_processing_time_ms?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      applicant_profiles: {
        Row: {
          applicant_type: Database["public"]["Enums"]["applicant_type"]
          completion_percentage: number | null
          created_at: string | null
          gdpr_consent_date: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          legacy_farm_id: string | null
          missing_fields: Json | null
          profile_data: Json
          profile_name: string
          sector_ids: string[] | null
          target_currencies: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applicant_type: Database["public"]["Enums"]["applicant_type"]
          completion_percentage?: number | null
          created_at?: string | null
          gdpr_consent_date?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          legacy_farm_id?: string | null
          missing_fields?: Json | null
          profile_data?: Json
          profile_name: string
          sector_ids?: string[] | null
          target_currencies?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applicant_type?: Database["public"]["Enums"]["applicant_type"]
          completion_percentage?: number | null
          created_at?: string | null
          gdpr_consent_date?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          legacy_farm_id?: string | null
          missing_fields?: Json | null
          profile_data?: Json
          profile_name?: string
          sector_ids?: string[] | null
          target_currencies?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      applicant_types: {
        Row: {
          created_at: string | null
          display_name: Json
          id: string
          required_documents: string[] | null
          schema_config: Json
          type_name: string
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          display_name?: Json
          id?: string
          required_documents?: string[] | null
          schema_config?: Json
          type_name: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          display_name?: Json
          id?: string
          required_documents?: string[] | null
          schema_config?: Json
          type_name?: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      application_form_instances: {
        Row: {
          auto_population_config: Json | null
          created_at: string | null
          form_schema_id: string | null
          generated_config: Json
          generation_metrics: Json | null
          id: string
          status: string
          subsidy_id: string
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          auto_population_config?: Json | null
          created_at?: string | null
          form_schema_id?: string | null
          generated_config?: Json
          generation_metrics?: Json | null
          id?: string
          status?: string
          subsidy_id: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          auto_population_config?: Json | null
          created_at?: string | null
          form_schema_id?: string | null
          generated_config?: Json
          generation_metrics?: Json | null
          id?: string
          status?: string
          subsidy_id?: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "application_form_instances_form_schema_id_fkey"
            columns: ["form_schema_id"]
            isOneToOne: false
            referencedRelation: "subsidy_form_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      application_forms: {
        Row: {
          application_steps: Json | null
          confidence_score: number | null
          contact_info: string | null
          created_at: string | null
          deadlines: string | null
          document_type: string | null
          document_url: string
          extracted_at: string | null
          form_description: string | null
          form_fields: Json | null
          form_title: string | null
          id: string
          pipeline_id: string | null
          required_documents: Json | null
          subsidy_id: string | null
          updated_at: string | null
        }
        Insert: {
          application_steps?: Json | null
          confidence_score?: number | null
          contact_info?: string | null
          created_at?: string | null
          deadlines?: string | null
          document_type?: string | null
          document_url: string
          extracted_at?: string | null
          form_description?: string | null
          form_fields?: Json | null
          form_title?: string | null
          id?: string
          pipeline_id?: string | null
          required_documents?: Json | null
          subsidy_id?: string | null
          updated_at?: string | null
        }
        Update: {
          application_steps?: Json | null
          confidence_score?: number | null
          contact_info?: string | null
          created_at?: string | null
          deadlines?: string | null
          document_type?: string | null
          document_url?: string
          extracted_at?: string | null
          form_description?: string | null
          form_fields?: Json | null
          form_title?: string | null
          id?: string
          pipeline_id?: string | null
          required_documents?: Json | null
          subsidy_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_forms_subsidy_id_fkey"
            columns: ["subsidy_id"]
            isOneToOne: false
            referencedRelation: "subsidies_structured"
            referencedColumns: ["id"]
          },
        ]
      }
      application_sessions: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          current_step: number | null
          farm_id: string | null
          form_instance_id: string | null
          id: string
          last_activity_at: string | null
          session_data: Json
          started_at: string | null
          status: string
          subsidy_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          current_step?: number | null
          farm_id?: string | null
          form_instance_id?: string | null
          id?: string
          last_activity_at?: string | null
          session_data?: Json
          started_at?: string | null
          status?: string
          subsidy_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          current_step?: number | null
          farm_id?: string | null
          form_instance_id?: string | null
          id?: string
          last_activity_at?: string | null
          session_data?: Json
          started_at?: string | null
          status?: string
          subsidy_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_sessions_form_instance_id_fkey"
            columns: ["form_instance_id"]
            isOneToOne: false
            referencedRelation: "application_form_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string | null
          farm_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          submitted_at: string | null
          subsidy_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string | null
          subsidy_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string | null
          subsidy_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_subsidy_id_fkey"
            columns: ["subsidy_id"]
            isOneToOne: false
            referencedRelation: "subsidies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_applications_farm_id"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_applications_subsidy_id"
            columns: ["subsidy_id"]
            isOneToOne: false
            referencedRelation: "subsidies"
            referencedColumns: ["id"]
          },
        ]
      }
      change_detection_state: {
        Row: {
          api_source: string
          auto_sync_enabled: boolean | null
          change_summary: string | null
          changes_detected: boolean | null
          created_at: string | null
          detection_method: string | null
          id: string
          last_check: string | null
          last_known_state: Json | null
          updated_at: string | null
        }
        Insert: {
          api_source: string
          auto_sync_enabled?: boolean | null
          change_summary?: string | null
          changes_detected?: boolean | null
          created_at?: string | null
          detection_method?: string | null
          id?: string
          last_check?: string | null
          last_known_state?: Json | null
          updated_at?: string | null
        }
        Update: {
          api_source?: string
          auto_sync_enabled?: boolean | null
          change_summary?: string | null
          changes_detected?: boolean | null
          created_at?: string | null
          detection_method?: string | null
          id?: string
          last_check?: string | null
          last_known_state?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      change_history: {
        Row: {
          api_source: string
          change_details: Json | null
          change_type: string | null
          changes_detected: boolean
          check_timestamp: string | null
          current_state: Json | null
          id: string
          previous_state: Json | null
          sync_log_id: string | null
          sync_triggered: boolean | null
        }
        Insert: {
          api_source: string
          change_details?: Json | null
          change_type?: string | null
          changes_detected: boolean
          check_timestamp?: string | null
          current_state?: Json | null
          id?: string
          previous_state?: Json | null
          sync_log_id?: string | null
          sync_triggered?: boolean | null
        }
        Update: {
          api_source?: string
          change_details?: Json | null
          change_type?: string | null
          changes_detected?: boolean
          check_timestamp?: string | null
          current_state?: Json | null
          id?: string
          previous_state?: Json | null
          sync_log_id?: string | null
          sync_triggered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "change_history_sync_log_id_fkey"
            columns: ["sync_log_id"]
            isOneToOne: false
            referencedRelation: "api_sync_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credits: {
        Row: {
          created_at: string | null
          credit_type: Database["public"]["Enums"]["credit_type"]
          credits_purchased: number
          credits_remaining: number | null
          credits_used: number | null
          expiry_date: string | null
          id: string
          purchase_date: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credit_type: Database["public"]["Enums"]["credit_type"]
          credits_purchased: number
          credits_remaining?: number | null
          credits_used?: number | null
          expiry_date?: string | null
          id?: string
          purchase_date?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credit_type?: Database["public"]["Enums"]["credit_type"]
          credits_purchased?: number
          credits_remaining?: number | null
          credits_used?: number | null
          expiry_date?: string | null
          id?: string
          purchase_date?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          category: string
          client_profile_id: string | null
          created_at: string
          document_type: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          metadata: Json | null
          mime_type: string
          processed_at: string | null
          processing_status: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          category?: string
          client_profile_id?: string | null
          created_at?: string
          document_type: string
          file_name: string
          file_size: number
          file_url: string
          id?: string
          metadata?: Json | null
          mime_type: string
          processed_at?: string | null
          processing_status?: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          category?: string
          client_profile_id?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          metadata?: Json | null
          mime_type?: string
          processed_at?: string | null
          processing_status?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          applicant_type_id: string
          created_at: string | null
          id: string
          legacy_farm_id: string | null
          profile_data: Json
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applicant_type_id: string
          created_at?: string | null
          id?: string
          legacy_farm_id?: string | null
          profile_data?: Json
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applicant_type_id?: string
          created_at?: string | null
          id?: string
          legacy_farm_id?: string | null
          profile_data?: Json
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_applicant_type_id_fkey"
            columns: ["applicant_type_id"]
            isOneToOne: false
            referencedRelation: "applicant_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_legacy_farm_id_fkey"
            columns: ["legacy_farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      client_usage_tracking: {
        Row: {
          ai_assistance_minutes: number | null
          api_calls_made: number | null
          applications_created: number | null
          created_at: string | null
          documents_generated: number | null
          id: string
          last_activity: string | null
          storage_used_mb: number | null
          updated_at: string | null
          usage_period: string
          user_id: string
        }
        Insert: {
          ai_assistance_minutes?: number | null
          api_calls_made?: number | null
          applications_created?: number | null
          created_at?: string | null
          documents_generated?: number | null
          id?: string
          last_activity?: string | null
          storage_used_mb?: number | null
          updated_at?: string | null
          usage_period: string
          user_id: string
        }
        Update: {
          ai_assistance_minutes?: number | null
          api_calls_made?: number | null
          applications_created?: number | null
          created_at?: string | null
          documents_generated?: number | null
          id?: string
          last_activity?: string | null
          storage_used_mb?: number | null
          updated_at?: string | null
          usage_period?: string
          user_id?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          block_id: string
          block_type: string
          bundle_id: string
          created_at: string
          heading_level: number | null
          heading_text: string | null
          html_content: string | null
          id: string
          list_items: string[] | null
          list_ordered: boolean | null
          markdown_content: string | null
          plain_text: string | null
          source_ref_filename: string | null
          source_ref_kind: string
          source_ref_page_number: number | null
          source_ref_selector: string | null
          source_ref_url: string | null
          table_caption: string | null
          table_columns: string[] | null
          table_rows: Json | null
          verbatim: boolean
        }
        Insert: {
          block_id: string
          block_type: string
          bundle_id: string
          created_at?: string
          heading_level?: number | null
          heading_text?: string | null
          html_content?: string | null
          id?: string
          list_items?: string[] | null
          list_ordered?: boolean | null
          markdown_content?: string | null
          plain_text?: string | null
          source_ref_filename?: string | null
          source_ref_kind: string
          source_ref_page_number?: number | null
          source_ref_selector?: string | null
          source_ref_url?: string | null
          table_caption?: string | null
          table_columns?: string[] | null
          table_rows?: Json | null
          verbatim?: boolean
        }
        Update: {
          block_id?: string
          block_type?: string
          bundle_id?: string
          created_at?: string
          heading_level?: number | null
          heading_text?: string | null
          html_content?: string | null
          id?: string
          list_items?: string[] | null
          list_ordered?: boolean | null
          markdown_content?: string | null
          plain_text?: string | null
          source_ref_filename?: string | null
          source_ref_kind?: string
          source_ref_page_number?: number | null
          source_ref_selector?: string | null
          source_ref_url?: string | null
          table_caption?: string | null
          table_columns?: string[] | null
          table_rows?: Json | null
          verbatim?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "scrape_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_change_log: {
        Row: {
          change_type: string
          changed_fields: Json
          created_at: string
          detected_by: string | null
          detection_confidence: number | null
          id: string
          resource_id: string
          version_id: string
        }
        Insert: {
          change_type: string
          changed_fields?: Json
          created_at?: string
          detected_by?: string | null
          detection_confidence?: number | null
          id?: string
          resource_id: string
          version_id: string
        }
        Update: {
          change_type?: string
          changed_fields?: Json
          created_at?: string
          detected_by?: string | null
          detection_confidence?: number | null
          id?: string
          resource_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_change_log_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          change_confidence: number | null
          change_summary: Json
          content_hash: string
          created_at: string
          id: string
          previous_version_id: string | null
          resource_id: string
          resource_type: string
          source_url: string | null
          version_number: number
        }
        Insert: {
          change_confidence?: number | null
          change_summary?: Json
          content_hash: string
          created_at?: string
          id?: string
          previous_version_id?: string | null
          resource_id: string
          resource_type: string
          source_url?: string | null
          version_number?: number
        }
        Update: {
          change_confidence?: number | null
          change_summary?: Json
          content_hash?: string
          created_at?: string
          id?: string
          previous_version_id?: string | null
          resource_id?: string
          resource_type?: string
          source_url?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_events: {
        Row: {
          checksum: string | null
          created_at: string | null
          documents_found: number | null
          error_message: string | null
          id: string
          pages_found: number | null
          response_time_ms: number | null
          run_id: string | null
          status: string
          url: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          documents_found?: number | null
          error_message?: string | null
          id?: string
          pages_found?: number | null
          response_time_ms?: number | null
          run_id?: string | null
          status: string
          url: string
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          documents_found?: number | null
          error_message?: string | null
          id?: string
          pages_found?: number | null
          response_time_ms?: number | null
          run_id?: string | null
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          active: boolean | null
          bonus_credits: number | null
          created_at: string | null
          credit_type: Database["public"]["Enums"]["credit_type"]
          credits: number
          features: Json | null
          id: string
          package_name: string
          price_cents: number
          updated_at: string | null
          validity_days: number
        }
        Insert: {
          active?: boolean | null
          bonus_credits?: number | null
          created_at?: string | null
          credit_type: Database["public"]["Enums"]["credit_type"]
          credits: number
          features?: Json | null
          id?: string
          package_name: string
          price_cents: number
          updated_at?: string | null
          validity_days?: number
        }
        Update: {
          active?: boolean | null
          bonus_credits?: number | null
          created_at?: string | null
          credit_type?: Database["public"]["Enums"]["credit_type"]
          credits?: number
          features?: Json | null
          id?: string
          package_name?: string
          price_cents?: number
          updated_at?: string | null
          validity_days?: number
        }
        Relationships: []
      }
      document_classification_logs: {
        Row: {
          agrees: boolean
          created_at: string
          document_id: string
          document_text_preview: string | null
          id: string
          model_used: string
          predicted_category: string
          prediction_confidence: number
          user_selected_category: string
        }
        Insert: {
          agrees: boolean
          created_at?: string
          document_id: string
          document_text_preview?: string | null
          id?: string
          model_used: string
          predicted_category: string
          prediction_confidence: number
          user_selected_category: string
        }
        Update: {
          agrees?: boolean
          created_at?: string
          document_id?: string
          document_text_preview?: string | null
          id?: string
          model_used?: string
          predicted_category?: string
          prediction_confidence?: number
          user_selected_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_classification_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "farm_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extraction_reviews: {
        Row: {
          corrected_data: Json
          created_at: string
          extraction_id: string
          id: string
          original_data: Json
          review_status: string
          reviewer_id: string
          reviewer_notes: string | null
          updated_at: string
        }
        Insert: {
          corrected_data: Json
          created_at?: string
          extraction_id: string
          id?: string
          original_data: Json
          review_status?: string
          reviewer_id: string
          reviewer_notes?: string | null
          updated_at?: string
        }
        Update: {
          corrected_data?: Json
          created_at?: string
          extraction_id?: string
          id?: string
          original_data?: Json
          review_status?: string
          reviewer_id?: string
          reviewer_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extraction_reviews_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extraction_status: {
        Row: {
          coverage_percentage: number | null
          created_at: string
          document_type: string
          document_url: string
          extracted_schema: Json | null
          extraction_errors: Json | null
          extraction_status: string
          field_count: number | null
          id: string
          subsidy_id: string
          updated_at: string
        }
        Insert: {
          coverage_percentage?: number | null
          created_at?: string
          document_type: string
          document_url: string
          extracted_schema?: Json | null
          extraction_errors?: Json | null
          extraction_status?: string
          field_count?: number | null
          id?: string
          subsidy_id: string
          updated_at?: string
        }
        Update: {
          coverage_percentage?: number | null
          created_at?: string
          document_type?: string
          document_url?: string
          extracted_schema?: Json | null
          extraction_errors?: Json | null
          extraction_status?: string
          field_count?: number | null
          id?: string
          subsidy_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_extractions: {
        Row: {
          chunk_count: number | null
          confidence_score: number | null
          created_at: string
          current_retry: number | null
          debug_info: Json | null
          detected_language: string | null
          document_id: string
          document_markdown: string | null
          error_message: string | null
          error_type: string | null
          extracted_data: Json
          extraction_type: string
          failure_code: string | null
          failure_detail: string | null
          id: string
          idempotency_key: string | null
          last_event_at: string | null
          latency_ms: number | null
          max_retries: number | null
          model_used: string | null
          model_version: string | null
          next_retry_at: string | null
          ocr_used: boolean | null
          pages_processed: number | null
          processing_time_ms: number | null
          progress_metadata: Json | null
          retry_count: number | null
          run_id: string | null
          session_id: string | null
          source_table: string | null
          source_template_version: string | null
          status: string
          status_v2:
            | Database["public"]["Enums"]["extraction_status_enum"]
            | null
          table_count: number | null
          table_data: Json | null
          table_parser: string | null
          table_quality: number | null
          tables_extracted: Json | null
          text_chunks: Json | null
          translated: boolean | null
          translation_confidence: number | null
          triggered_by: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          chunk_count?: number | null
          confidence_score?: number | null
          created_at?: string
          current_retry?: number | null
          debug_info?: Json | null
          detected_language?: string | null
          document_id: string
          document_markdown?: string | null
          error_message?: string | null
          error_type?: string | null
          extracted_data: Json
          extraction_type?: string
          failure_code?: string | null
          failure_detail?: string | null
          id?: string
          idempotency_key?: string | null
          last_event_at?: string | null
          latency_ms?: number | null
          max_retries?: number | null
          model_used?: string | null
          model_version?: string | null
          next_retry_at?: string | null
          ocr_used?: boolean | null
          pages_processed?: number | null
          processing_time_ms?: number | null
          progress_metadata?: Json | null
          retry_count?: number | null
          run_id?: string | null
          session_id?: string | null
          source_table?: string | null
          source_template_version?: string | null
          status?: string
          status_v2?:
            | Database["public"]["Enums"]["extraction_status_enum"]
            | null
          table_count?: number | null
          table_data?: Json | null
          table_parser?: string | null
          table_quality?: number | null
          tables_extracted?: Json | null
          text_chunks?: Json | null
          translated?: boolean | null
          translation_confidence?: number | null
          triggered_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          chunk_count?: number | null
          confidence_score?: number | null
          created_at?: string
          current_retry?: number | null
          debug_info?: Json | null
          detected_language?: string | null
          document_id?: string
          document_markdown?: string | null
          error_message?: string | null
          error_type?: string | null
          extracted_data?: Json
          extraction_type?: string
          failure_code?: string | null
          failure_detail?: string | null
          id?: string
          idempotency_key?: string | null
          last_event_at?: string | null
          latency_ms?: number | null
          max_retries?: number | null
          model_used?: string | null
          model_version?: string | null
          next_retry_at?: string | null
          ocr_used?: boolean | null
          pages_processed?: number | null
          processing_time_ms?: number | null
          progress_metadata?: Json | null
          retry_count?: number | null
          run_id?: string | null
          session_id?: string | null
          source_table?: string | null
          source_template_version?: string | null
          status?: string
          status_v2?:
            | Database["public"]["Enums"]["extraction_status_enum"]
            | null
          table_count?: number | null
          table_data?: Json | null
          table_parser?: string | null
          table_quality?: number | null
          tables_extracted?: Json | null
          text_chunks?: Json | null
          translated?: boolean | null
          translation_confidence?: number | null
          triggered_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing_jobs: {
        Row: {
          client_type: string
          completed_at: string | null
          config: Json
          created_at: string
          document_id: string
          document_type: string | null
          error_message: string | null
          file_name: string
          file_url: string
          id: string
          max_retries: number
          metadata: Json
          priority: string
          processing_time_ms: number | null
          retry_attempt: number
          scheduled_for: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_type: string
          completed_at?: string | null
          config?: Json
          created_at?: string
          document_id: string
          document_type?: string | null
          error_message?: string | null
          file_name: string
          file_url: string
          id?: string
          max_retries?: number
          metadata?: Json
          priority?: string
          processing_time_ms?: number | null
          retry_attempt?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_type?: string
          completed_at?: string | null
          config?: Json
          created_at?: string
          document_id?: string
          document_type?: string | null
          error_message?: string | null
          file_name?: string
          file_url?: string
          id?: string
          max_retries?: number
          metadata?: Json
          priority?: string
          processing_time_ms?: number | null
          retry_attempt?: number
          scheduled_for?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      document_processing_logs: {
        Row: {
          ai_model: string | null
          applicant_profile_id: string | null
          confidence_score: number | null
          created_at: string | null
          credits_used: number | null
          document_id: string
          error_details: Json | null
          id: string
          input_data: Json | null
          output_data: Json | null
          processing_status: string
          processing_time_ms: number | null
          processing_type: string
          retry_attempt: number | null
        }
        Insert: {
          ai_model?: string | null
          applicant_profile_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          credits_used?: number | null
          document_id: string
          error_details?: Json | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          processing_status: string
          processing_time_ms?: number | null
          processing_type: string
          retry_attempt?: number | null
        }
        Update: {
          ai_model?: string | null
          applicant_profile_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          credits_used?: number | null
          document_id?: string
          error_details?: Json | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          processing_status?: string
          processing_time_ms?: number | null
          processing_type?: string
          retry_attempt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_logs_applicant_profile_id_fkey"
            columns: ["applicant_profile_id"]
            isOneToOne: false
            referencedRelation: "applicant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_subsidy_mappings: {
        Row: {
          confidence_score: number | null
          created_at: string
          document_id: string
          extraction_method: string | null
          id: string
          mapping_type: string
          subsidy_id: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          document_id: string
          extraction_method?: string | null
          id?: string
          mapping_type: string
          subsidy_id: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          document_id?: string
          extraction_method?: string | null
          id?: string
          mapping_type?: string
          subsidy_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      error_log: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          id: string
          metadata: Json | null
          raw_log_id: string | null
          resolution_notes: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          stack_trace: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          metadata?: Json | null
          raw_log_id?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          stack_trace?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          raw_log_id?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          stack_trace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_log_raw_log_id_fkey"
            columns: ["raw_log_id"]
            isOneToOne: false
            referencedRelation: "raw_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_batches: {
        Row: {
          batch_status: string | null
          completed_at: string | null
          completed_count: number | null
          created_at: string | null
          failed_count: number | null
          id: string
          label: string | null
          owner_id: string | null
          total_count: number | null
        }
        Insert: {
          batch_status?: string | null
          completed_at?: string | null
          completed_count?: number | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          label?: string | null
          owner_id?: string | null
          total_count?: number | null
        }
        Update: {
          batch_status?: string | null
          completed_at?: string | null
          completed_count?: number | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          label?: string | null
          owner_id?: string | null
          total_count?: number | null
        }
        Relationships: []
      }
      extraction_metrics: {
        Row: {
          client_type: string | null
          cost: number | null
          created_at: string | null
          document_id: string | null
          duration_ms: number | null
          end_time: string | null
          error_message: string | null
          error_type: string | null
          id: string
          metadata: Json | null
          operation_type: string
          start_time: string | null
          success: boolean | null
          timestamp: string | null
        }
        Insert: {
          client_type?: string | null
          cost?: number | null
          created_at?: string | null
          document_id?: string | null
          duration_ms?: number | null
          end_time?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          metadata?: Json | null
          operation_type: string
          start_time?: string | null
          success?: boolean | null
          timestamp?: string | null
        }
        Update: {
          client_type?: string | null
          cost?: number | null
          created_at?: string | null
          document_id?: string | null
          duration_ms?: number | null
          end_time?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: string
          start_time?: string | null
          success?: boolean | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extraction_metrics_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "farm_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_qa_results: {
        Row: {
          admin_notes: string | null
          admin_required: boolean
          admin_status: string | null
          completeness_score: number | null
          created_at: string
          documents_loss: string[] | null
          errors: string[] | null
          id: string
          missing_fields: string[] | null
          qa_pass: boolean
          qa_timestamp: string
          review_data: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          source_url: string
          structural_integrity_score: number | null
          structure_loss: string[] | null
          updated_at: string
          user_id: string | null
          warnings: string[] | null
        }
        Insert: {
          admin_notes?: string | null
          admin_required?: boolean
          admin_status?: string | null
          completeness_score?: number | null
          created_at?: string
          documents_loss?: string[] | null
          errors?: string[] | null
          id?: string
          missing_fields?: string[] | null
          qa_pass?: boolean
          qa_timestamp?: string
          review_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          source_url: string
          structural_integrity_score?: number | null
          structure_loss?: string[] | null
          updated_at?: string
          user_id?: string | null
          warnings?: string[] | null
        }
        Update: {
          admin_notes?: string | null
          admin_required?: boolean
          admin_status?: string | null
          completeness_score?: number | null
          created_at?: string
          documents_loss?: string[] | null
          errors?: string[] | null
          id?: string
          missing_fields?: string[] | null
          qa_pass?: boolean
          qa_timestamp?: string
          review_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          source_url?: string
          structural_integrity_score?: number | null
          structure_loss?: string[] | null
          updated_at?: string
          user_id?: string | null
          warnings?: string[] | null
        }
        Relationships: []
      }
      extraction_queue: {
        Row: {
          attempts: number | null
          batch_id: string | null
          batch_label: string | null
          completed_at: string | null
          document_type: string | null
          document_url: string
          error_message: string | null
          id: string
          max_attempts: number | null
          metadata: Json | null
          priority: number | null
          run_id: string | null
          scheduled_for: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          batch_id?: string | null
          batch_label?: string | null
          completed_at?: string | null
          document_type?: string | null
          document_url: string
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          priority?: number | null
          run_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          batch_id?: string | null
          batch_label?: string | null
          completed_at?: string | null
          document_type?: string | null
          document_url?: string
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          priority?: number | null
          run_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extraction_queue_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          category_agreement: boolean | null
          classification_model: string | null
          classification_timestamp: string | null
          error_details: Json | null
          farm_id: string
          file_hash: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          language_detected: string | null
          mime_type: string | null
          page_count: number | null
          predicted_category: string | null
          prediction_confidence: number | null
          processing_status: string | null
          scan_results: Json | null
          uploaded_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["document_category"]
          category_agreement?: boolean | null
          classification_model?: string | null
          classification_timestamp?: string | null
          error_details?: Json | null
          farm_id: string
          file_hash?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          language_detected?: string | null
          mime_type?: string | null
          page_count?: number | null
          predicted_category?: string | null
          prediction_confidence?: number | null
          processing_status?: string | null
          scan_results?: Json | null
          uploaded_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          category_agreement?: boolean | null
          classification_model?: string | null
          classification_timestamp?: string | null
          error_details?: Json | null
          farm_id?: string
          file_hash?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          language_detected?: string | null
          mime_type?: string | null
          page_count?: number | null
          predicted_category?: string | null
          prediction_confidence?: number | null
          processing_status?: string | null
          scan_results?: Json | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_documents_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_farm_documents_farm_id"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          address: string
          apia_region: string[] | null
          certifications: string[] | null
          cnp_or_cui: string | null
          country: string | null
          created_at: string | null
          department: string | null
          environmental_permit: boolean | null
          gdpr_consent: boolean
          id: string
          irrigation_method: string | null
          land_use_types: string[] | null
          legal_status: string | null
          livestock: Json | null
          livestock_present: boolean | null
          locality: string | null
          matching_tags: string[] | null
          name: string
          notify_consent: boolean | null
          own_or_lease: boolean | null
          phone: string | null
          preferred_language: string | null
          revenue: string | null
          software_used: string[] | null
          staff_count: number | null
          subsidy_interest: string[] | null
          tech_docs: boolean | null
          total_hectares: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          apia_region?: string[] | null
          certifications?: string[] | null
          cnp_or_cui?: string | null
          country?: string | null
          created_at?: string | null
          department?: string | null
          environmental_permit?: boolean | null
          gdpr_consent?: boolean
          id?: string
          irrigation_method?: string | null
          land_use_types?: string[] | null
          legal_status?: string | null
          livestock?: Json | null
          livestock_present?: boolean | null
          locality?: string | null
          matching_tags?: string[] | null
          name: string
          notify_consent?: boolean | null
          own_or_lease?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          revenue?: string | null
          software_used?: string[] | null
          staff_count?: number | null
          subsidy_interest?: string[] | null
          tech_docs?: boolean | null
          total_hectares?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          apia_region?: string[] | null
          certifications?: string[] | null
          cnp_or_cui?: string | null
          country?: string | null
          created_at?: string | null
          department?: string | null
          environmental_permit?: boolean | null
          gdpr_consent?: boolean
          id?: string
          irrigation_method?: string | null
          land_use_types?: string[] | null
          legal_status?: string | null
          livestock?: Json | null
          livestock_present?: boolean | null
          locality?: string | null
          matching_tags?: string[] | null
          name?: string
          notify_consent?: boolean | null
          own_or_lease?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          revenue?: string | null
          software_used?: string[] | null
          staff_count?: number | null
          subsidy_interest?: string[] | null
          tech_docs?: boolean | null
          total_hectares?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_farms_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_access_control: {
        Row: {
          access_level: string
          created_at: string | null
          daily_limit: number | null
          feature_name: string
          id: string
          last_reset_daily: string | null
          last_reset_monthly: string | null
          monthly_limit: number | null
          updated_at: string | null
          used_this_month: number | null
          used_today: number | null
          user_id: string
        }
        Insert: {
          access_level: string
          created_at?: string | null
          daily_limit?: number | null
          feature_name: string
          id?: string
          last_reset_daily?: string | null
          last_reset_monthly?: string | null
          monthly_limit?: number | null
          updated_at?: string | null
          used_this_month?: number | null
          used_today?: number | null
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string | null
          daily_limit?: number | null
          feature_name?: string
          id?: string
          last_reset_daily?: string | null
          last_reset_monthly?: string | null
          monthly_limit?: number | null
          updated_at?: string | null
          used_this_month?: number | null
          used_today?: number | null
          user_id?: string
        }
        Relationships: []
      }
      field_corrections: {
        Row: {
          corrected_by: string | null
          corrected_value: Json
          correction_notes: string | null
          created_at: string
          document_id: string
          field_name: string
          id: string
          original_value: Json | null
          updated_at: string
        }
        Insert: {
          corrected_by?: string | null
          corrected_value: Json
          correction_notes?: string | null
          created_at?: string
          document_id: string
          field_name: string
          id?: string
          original_value?: Json | null
          updated_at?: string
        }
        Update: {
          corrected_by?: string | null
          corrected_value?: Json
          correction_notes?: string | null
          created_at?: string
          document_id?: string
          field_name?: string
          id?: string
          original_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      harvest_issues: {
        Row: {
          content_length: number | null
          created_at: string | null
          id: string
          page_id: string | null
          reason: string
          run_id: string
          source_url: string | null
        }
        Insert: {
          content_length?: number | null
          created_at?: string | null
          id?: string
          page_id?: string | null
          reason: string
          run_id: string
          source_url?: string | null
        }
        Update: {
          content_length?: number | null
          created_at?: string | null
          id?: string
          page_id?: string | null
          reason?: string
          run_id?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_issues_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      harvested_documents: {
        Row: {
          created_at: string | null
          filename: string | null
          id: string
          mime: string | null
          page_id: string | null
          pages: number | null
          run_id: string | null
          sha256: string | null
          size_bytes: number | null
          source_url: string
          text_ocr: string | null
        }
        Insert: {
          created_at?: string | null
          filename?: string | null
          id?: string
          mime?: string | null
          page_id?: string | null
          pages?: number | null
          run_id?: string | null
          sha256?: string | null
          size_bytes?: number | null
          source_url: string
          text_ocr?: string | null
        }
        Update: {
          created_at?: string | null
          filename?: string | null
          id?: string
          mime?: string | null
          page_id?: string | null
          pages?: number | null
          run_id?: string | null
          sha256?: string | null
          size_bytes?: number | null
          source_url?: string
          text_ocr?: string | null
        }
        Relationships: []
      }
      ingestion_sources: {
        Row: {
          base_url: string | null
          code: string
          config: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_success_at: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_url?: string | null
          code: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_success_at?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_url?: string | null
          code?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_success_at?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_audit_log: {
        Row: {
          component_from: string
          component_to: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          operation_data: Json | null
          operation_type: string
          success: boolean
          timestamp: string | null
        }
        Insert: {
          component_from: string
          component_to: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          operation_data?: Json | null
          operation_type: string
          success: boolean
          timestamp?: string | null
        }
        Update: {
          component_from?: string
          component_to?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          operation_data?: Json | null
          operation_type?: string
          success?: boolean
          timestamp?: string | null
        }
        Relationships: []
      }
      manual_review_queue: {
        Row: {
          assigned_to: string | null
          client_type: string
          completed_at: string | null
          created_at: string | null
          document_id: string | null
          error_details: Json | null
          file_name: string
          file_url: string
          id: string
          priority: string | null
          queued_at: string | null
          reason: string | null
          resolution_data: Json | null
          reviewer_notes: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_type: string
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          error_details?: Json | null
          file_name: string
          file_url: string
          id?: string
          priority?: string | null
          queued_at?: string | null
          reason?: string | null
          resolution_data?: Json | null
          reviewer_notes?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_type?: string
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          error_details?: Json | null
          file_name?: string
          file_url?: string
          id?: string
          priority?: string | null
          queued_at?: string | null
          reason?: string | null
          resolution_data?: Json | null
          reviewer_notes?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      model_deployments: {
        Row: {
          config: Json
          created_at: string
          deployed_at: string
          environment: string
          id: string
          metrics: Json | null
          model_type: string
          status: string
          training_job_id: string | null
          updated_at: string
          version: string
        }
        Insert: {
          config?: Json
          created_at?: string
          deployed_at?: string
          environment?: string
          id?: string
          metrics?: Json | null
          model_type: string
          status?: string
          training_job_id?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          config?: Json
          created_at?: string
          deployed_at?: string
          environment?: string
          id?: string
          metrics?: Json | null
          model_type?: string
          status?: string
          training_job_id?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_deployments_training_job_id_fkey"
            columns: ["training_job_id"]
            isOneToOne: false
            referencedRelation: "model_training_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      model_training_jobs: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          dataset_size: number
          error_message: string | null
          farm_id: string | null
          id: string
          metrics: Json | null
          model_type: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          dataset_size?: number
          error_message?: string | null
          farm_id?: string | null
          id?: string
          metrics?: Json | null
          model_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          dataset_size?: number
          error_message?: string | null
          farm_id?: string | null
          id?: string
          metrics?: Json | null
          model_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_training_jobs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      parsing_profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          prompt: Json | null
          regex: Json | null
          source_slug: string
          table_hints: Json | null
          version: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          prompt?: Json | null
          regex?: Json | null
          source_slug: string
          table_hints?: Json | null
          version?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          prompt?: Json | null
          regex?: Json | null
          source_slug?: string
          table_hints?: Json | null
          version?: string
        }
        Relationships: []
      }
      pipeline_executions: {
        Row: {
          batch_size: number | null
          completed_at: string | null
          config: Json
          country: string | null
          created_at: string | null
          error_details: Json | null
          execution_type: string
          failure_count: number | null
          id: string
          metrics: Json | null
          processed_count: number | null
          session_id: string | null
          started_at: string | null
          status: string
          success_count: number | null
          triggered_by: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          batch_size?: number | null
          completed_at?: string | null
          config?: Json
          country?: string | null
          created_at?: string | null
          error_details?: Json | null
          execution_type: string
          failure_count?: number | null
          id?: string
          metrics?: Json | null
          processed_count?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          triggered_by?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          batch_size?: number | null
          completed_at?: string | null
          config?: Json
          country?: string | null
          created_at?: string | null
          error_details?: Json | null
          execution_type?: string
          failure_count?: number | null
          id?: string
          metrics?: Json | null
          processed_count?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          triggered_by?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          config: Json
          created_at: string | null
          ended_at: string | null
          error: Json | null
          error_details: Json | null
          id: string
          progress: number
          reason: string | null
          stage: string
          started_at: string | null
          stats: Json | null
          status: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          error_details?: Json | null
          id?: string
          progress?: number
          reason?: string | null
          stage?: string
          started_at?: string | null
          stats?: Json | null
          status?: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          error_details?: Json | null
          id?: string
          progress?: number
          reason?: string | null
          stage?: string
          started_at?: string | null
          stats?: Json | null
          status?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      policy_backup: {
        Row: {
          backup_time: string | null
          polcmd: unknown | null
          policy_name: unknown | null
          polpermissive: boolean | null
          roles: unknown[] | null
          table_name: unknown | null
          using_expr: string | null
          with_check_expr: string | null
        }
        Insert: {
          backup_time?: string | null
          polcmd?: unknown | null
          policy_name?: unknown | null
          polpermissive?: boolean | null
          roles?: unknown[] | null
          table_name?: unknown | null
          using_expr?: string | null
          with_check_expr?: string | null
        }
        Update: {
          backup_time?: string | null
          polcmd?: unknown | null
          policy_name?: unknown | null
          polpermissive?: boolean | null
          roles?: unknown[] | null
          table_name?: unknown | null
          using_expr?: string | null
          with_check_expr?: string | null
        }
        Relationships: []
      }
      polling_schedule: {
        Row: {
          api_source: string
          check_frequency: string
          enabled: boolean | null
          failure_count: number | null
          id: string
          last_check: string | null
          max_failures: number | null
          next_check: string
          priority: number | null
        }
        Insert: {
          api_source: string
          check_frequency: string
          enabled?: boolean | null
          failure_count?: number | null
          id?: string
          last_check?: string | null
          max_failures?: number | null
          next_check: string
          priority?: number | null
        }
        Update: {
          api_source?: string
          check_frequency?: string
          enabled?: boolean | null
          failure_count?: number | null
          id?: string
          last_check?: string | null
          max_failures?: number | null
          next_check?: string
          priority?: number | null
        }
        Relationships: []
      }
      profile_collaborators: {
        Row: {
          accepted_at: string | null
          access_level: string
          applicant_profile_id: string
          id: string
          invitation_status: string | null
          invited_at: string | null
          invited_by: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          access_level?: string
          applicant_profile_id: string
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          invited_by?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          access_level?: string
          applicant_profile_id?: string
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          invited_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_collaborators_applicant_profile_id_fkey"
            columns: ["applicant_profile_id"]
            isOneToOne: false
            referencedRelation: "applicant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_metrics: {
        Row: {
          benchmark_comparison: Json | null
          component: string
          confidence: number | null
          created_at: string | null
          details: Json | null
          execution_id: string | null
          id: string
          quality_type: string
          score: number | null
        }
        Insert: {
          benchmark_comparison?: Json | null
          component: string
          confidence?: number | null
          created_at?: string | null
          details?: Json | null
          execution_id?: string | null
          id?: string
          quality_type: string
          score?: number | null
        }
        Update: {
          benchmark_comparison?: Json | null
          component?: string
          confidence?: number | null
          created_at?: string | null
          details?: Json | null
          execution_id?: string | null
          id?: string
          quality_type?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_metrics_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "pipeline_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_logs: {
        Row: {
          combined_content_markdown: string | null
          created_at: string
          file_refs: string[] | null
          id: string
          payload: string
          processed: boolean | null
          processed_at: string | null
          raw_markdown: string | null
          text_markdown: string | null
          updated_at: string
        }
        Insert: {
          combined_content_markdown?: string | null
          created_at?: string
          file_refs?: string[] | null
          id?: string
          payload: string
          processed?: boolean | null
          processed_at?: string | null
          raw_markdown?: string | null
          text_markdown?: string | null
          updated_at?: string
        }
        Update: {
          combined_content_markdown?: string | null
          created_at?: string
          file_refs?: string[] | null
          id?: string
          payload?: string
          processed?: boolean | null
          processed_at?: string | null
          raw_markdown?: string | null
          text_markdown?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      raw_scraped_pages: {
        Row: {
          attachment_count: number | null
          attachment_paths: Json | null
          attachments_jsonb: Json | null
          combined_content_markdown: string | null
          created_at: string | null
          error_message: string | null
          id: string
          raw_html: string | null
          raw_markdown: string | null
          raw_text: string | null
          run_id: string | null
          scrape_date: string | null
          sections_jsonb: Json | null
          source_site: string | null
          source_url: string
          status: string | null
          text_markdown: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_count?: number | null
          attachment_paths?: Json | null
          attachments_jsonb?: Json | null
          combined_content_markdown?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          raw_html?: string | null
          raw_markdown?: string | null
          raw_text?: string | null
          run_id?: string | null
          scrape_date?: string | null
          sections_jsonb?: Json | null
          source_site?: string | null
          source_url: string
          status?: string | null
          text_markdown?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_count?: number | null
          attachment_paths?: Json | null
          attachments_jsonb?: Json | null
          combined_content_markdown?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          raw_html?: string | null
          raw_markdown?: string | null
          raw_text?: string | null
          run_id?: string | null
          scrape_date?: string | null
          sections_jsonb?: Json | null
          source_site?: string | null
          source_url?: string
          status?: string | null
          text_markdown?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_scraped_pages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      review_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          assignment_data: Json
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          priority: number
          resource_id: string
          resource_type: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_data?: Json
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: number
          resource_id: string
          resource_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_data?: Json
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: number
          resource_id?: string
          resource_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_decisions: {
        Row: {
          assignment_id: string
          changes_requested: Json | null
          confidence_level: number | null
          created_at: string
          decision: string
          decision_data: Json
          id: string
          review_notes: string | null
          reviewer_id: string
          time_spent_minutes: number | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          changes_requested?: Json | null
          confidence_level?: number | null
          created_at?: string
          decision: string
          decision_data?: Json
          id?: string
          review_notes?: string | null
          reviewer_id: string
          time_spent_minutes?: number | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          changes_requested?: Json | null
          confidence_level?: number | null
          created_at?: string
          decision?: string
          decision_data?: Json
          id?: string
          review_notes?: string | null
          reviewer_id?: string
          time_spent_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_decisions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "review_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_bundles: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          lang: string
          last_modified: string
          metadata: Json | null
          run_id: string | null
          source_filename: string | null
          source_kind: string
          source_page_number: number | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          lang: string
          last_modified: string
          metadata?: Json | null
          run_id?: string | null
          source_filename?: string | null
          source_kind: string
          source_page_number?: number | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          lang?: string
          last_modified?: string
          metadata?: Json | null
          run_id?: string | null
          source_filename?: string | null
          source_kind?: string
          source_page_number?: number | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scrape_runs: {
        Row: {
          completed_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          notes: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      scraped_documents: {
        Row: {
          bundle_id: string
          content_hash: string
          created_at: string
          doc_type: string
          extracted_text: string | null
          extraction_metadata: Json | null
          extraction_status: string | null
          id: string
          language: string | null
          mime_type: string | null
          name: string
          pages: number | null
          size_bytes: number | null
          tables_extracted: Json | null
          url: string
        }
        Insert: {
          bundle_id: string
          content_hash: string
          created_at?: string
          doc_type: string
          extracted_text?: string | null
          extraction_metadata?: Json | null
          extraction_status?: string | null
          id?: string
          language?: string | null
          mime_type?: string | null
          name: string
          pages?: number | null
          size_bytes?: number | null
          tables_extracted?: Json | null
          url: string
        }
        Update: {
          bundle_id?: string
          content_hash?: string
          created_at?: string
          doc_type?: string
          extracted_text?: string | null
          extraction_metadata?: Json | null
          extraction_status?: string | null
          id?: string
          language?: string | null
          mime_type?: string | null
          name?: string
          pages?: number | null
          size_bytes?: number | null
          tables_extracted?: Json | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraped_documents_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "scrape_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          message: string
          run_start: string | null
          session_id: string
          status: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          run_start?: string | null
          session_id: string
          status: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          run_start?: string | null
          session_id?: string
          status?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sectors: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          level: number
          nace_code: string
          parent_sector_id: string | null
          sector_name: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          nace_code: string
          parent_sector_id?: string | null
          sector_name?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          nace_code?: string
          parent_sector_id?: string | null
          sector_name?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sectors_parent_sector_id_fkey"
            columns: ["parent_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          risk_level: string | null
          target_user_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          risk_level?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          risk_level?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          risk_level: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          risk_level?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          risk_level?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_health_status: {
        Row: {
          created_at: string | null
          google_vision_status: string
          id: number
          last_checked: string | null
          openai_status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          google_vision_status?: string
          id?: number
          last_checked?: string | null
          openai_status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          google_vision_status?: string
          id?: number
          last_checked?: string | null
          openai_status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subsidies: {
        Row: {
          agency: string | null
          agency_id: string | null
          amount_max: number | null
          amount_min: number | null
          api_source: string | null
          application_docs: Json | null
          application_schema: Json | null
          application_url: string | null
          categories: string[] | null
          code: string
          created_at: string | null
          currency: string | null
          deadline: string | null
          description: Json
          documents: Json | null
          domain: string | null
          eligibility_criteria: Json | null
          external_id: string | null
          extraction_batch_id: string | null
          funding_type: string | null
          id: string
          import_job_id: string | null
          language: string[] | null
          last_synced_at: string | null
          legal_entities: string[] | null
          matching_tags: string[] | null
          raw_content: Json | null
          raw_data: Json | null
          record_status: string | null
          region: string[] | null
          scrape_date: string | null
          source: string | null
          source_url: string | null
          status: string | null
          tags: string[] | null
          title: Json
          updated_at: string | null
          version_hash: string | null
        }
        Insert: {
          agency?: string | null
          agency_id?: string | null
          amount_max?: number | null
          amount_min?: number | null
          api_source?: string | null
          application_docs?: Json | null
          application_schema?: Json | null
          application_url?: string | null
          categories?: string[] | null
          code: string
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description: Json
          documents?: Json | null
          domain?: string | null
          eligibility_criteria?: Json | null
          external_id?: string | null
          extraction_batch_id?: string | null
          funding_type?: string | null
          id?: string
          import_job_id?: string | null
          language?: string[] | null
          last_synced_at?: string | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          raw_content?: Json | null
          raw_data?: Json | null
          record_status?: string | null
          region?: string[] | null
          scrape_date?: string | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title: Json
          updated_at?: string | null
          version_hash?: string | null
        }
        Update: {
          agency?: string | null
          agency_id?: string | null
          amount_max?: number | null
          amount_min?: number | null
          api_source?: string | null
          application_docs?: Json | null
          application_schema?: Json | null
          application_url?: string | null
          categories?: string[] | null
          code?: string
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description?: Json
          documents?: Json | null
          domain?: string | null
          eligibility_criteria?: Json | null
          external_id?: string | null
          extraction_batch_id?: string | null
          funding_type?: string | null
          id?: string
          import_job_id?: string | null
          language?: string[] | null
          last_synced_at?: string | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          raw_content?: Json | null
          raw_data?: Json | null
          record_status?: string | null
          region?: string[] | null
          scrape_date?: string | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title?: Json
          updated_at?: string | null
          version_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subsidies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      subsidies_backup: {
        Row: {
          agency: string | null
          amount_max: number | null
          amount_min: number | null
          api_source: string | null
          application_docs: Json | null
          application_schema: Json | null
          application_url: string | null
          categories: string[] | null
          code: string | null
          created_at: string | null
          deadline: string | null
          description: Json | null
          documents: Json | null
          domain: string | null
          eligibility_criteria: Json | null
          external_id: string | null
          extraction_batch_id: string | null
          funding_type: string | null
          id: string | null
          import_job_id: string | null
          language: string[] | null
          legal_entities: string[] | null
          matching_tags: string[] | null
          raw_content: Json | null
          raw_data: Json | null
          record_status: string | null
          region: string[] | null
          scrape_date: string | null
          source_url: string | null
          status: string | null
          tags: string[] | null
          title: Json | null
          updated_at: string | null
        }
        Insert: {
          agency?: string | null
          amount_max?: number | null
          amount_min?: number | null
          api_source?: string | null
          application_docs?: Json | null
          application_schema?: Json | null
          application_url?: string | null
          categories?: string[] | null
          code?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: Json | null
          documents?: Json | null
          domain?: string | null
          eligibility_criteria?: Json | null
          external_id?: string | null
          extraction_batch_id?: string | null
          funding_type?: string | null
          id?: string | null
          import_job_id?: string | null
          language?: string[] | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          raw_content?: Json | null
          raw_data?: Json | null
          record_status?: string | null
          region?: string[] | null
          scrape_date?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title?: Json | null
          updated_at?: string | null
        }
        Update: {
          agency?: string | null
          amount_max?: number | null
          amount_min?: number | null
          api_source?: string | null
          application_docs?: Json | null
          application_schema?: Json | null
          application_url?: string | null
          categories?: string[] | null
          code?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: Json | null
          documents?: Json | null
          domain?: string | null
          eligibility_criteria?: Json | null
          external_id?: string | null
          extraction_batch_id?: string | null
          funding_type?: string | null
          id?: string | null
          import_job_id?: string | null
          language?: string[] | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          raw_content?: Json | null
          raw_data?: Json | null
          record_status?: string | null
          region?: string[] | null
          scrape_date?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subsidies_structured: {
        Row: {
          activity_sector_codes: string[] | null
          additional_support_mechanisms: string | null
          agency: string | null
          ai_model: string | null
          amount: number[] | null
          amounts: string | null
          application_language: string | null
          application_method: string | null
          application_method_markdown: string | null
          application_process: string | null
          application_requirements: Json | null
          application_window_end: string | null
          application_window_start: string | null
          archived: boolean | null
          audit: Json | null
          audit_notes: string | null
          beneficiary_reporting_requirements: string | null
          beneficiary_types: string[] | null
          budget_tranches: Json | null
          call_type: string | null
          categories: string[] | null
          checksum: string | null
          co_financing_rate: number | null
          co_financing_rates_by_category: Json | null
          cofinancing_sources: Json | null
          compliance_audit_mechanisms: string | null
          compliance_requirements: string | null
          conditional_eligibility: Json | null
          confidence_score: number | null
          conflict_of_interest_notes: string | null
          contact_information: Json | null
          content_checksum: string | null
          content_hash: string | null
          created_at: string
          cross_funding_links: Json | null
          deadline: string | null
          deadlines: string | null
          deadlines_jsonb: Json | null
          deadlines_markdown: string | null
          decision_publication_method: string | null
          description: string | null
          description_markdown: string | null
          document_analysis_performed: boolean | null
          document_count: number | null
          documents: Json | null
          documents_jsonb: Json | null
          documents_markdown: string | null
          duration_limits: string | null
          eligibility: string | null
          eligibility_markdown: string | null
          eligible_actions: string[] | null
          eligible_entities: string[] | null
          eligible_expenses_detailed: Json | null
          entity_size: string | null
          environmental_social_safeguards: string | null
          evaluation_committee: string | null
          evaluation_criteria: string | null
          evaluation_phases: Json | null
          evaluation_start_date: string | null
          expected_results: string | null
          extended_deadlines: Json | null
          extracted_documents: Json | null
          extraction_batch_id: string | null
          extraction_completeness_score: number | null
          extraction_method: string | null
          extraction_model: string | null
          extraction_timestamp: string | null
          extraction_version: string | null
          fingerprint: string | null
          forms_analysis_performed: boolean | null
          forms_detected: Json | null
          forms_recreated: Json | null
          funding_markdown: string | null
          funding_programme: string | null
          funding_rate_details: Json | null
          funding_source: string | null
          funding_tranches: Json | null
          funding_type: string | null
          geographic_eligibility: Json | null
          geographic_scope: Json | null
          id: string
          impact_indicators: Json | null
          import_job_id: string | null
          ineligible_actions: string[] | null
          ineligible_expenses: Json | null
          investment_types: string[] | null
          language: string | null
          last_seen_at: string | null
          legal_entity_type: string[] | null
          managing_agency: string | null
          matching_algorithm_score: number | null
          minimum_score: number | null
          missing_fields: string[] | null
          objectives: string[] | null
          objectives_detailed: string | null
          opening_date: string | null
          payment_modality: string | null
          payment_schedule: Json | null
          payment_terms: string | null
          policy_objective: string | null
          presentation: string | null
          previous_acceptance_rate: number | null
          previous_award_restrictions: string | null
          previous_recipients_list: string | null
          priority_groups: Json | null
          priority_themes: string[] | null
          process_steps: Json | null
          procurement_obligations: string | null
          program: string | null
          program_markdown: string | null
          project_duration: string | null
          publication_date: string | null
          questionnaire_steps: Json | null
          raw_log_id: string | null
          record_status: string | null
          reference_code: string | null
          region: string[] | null
          regulatory_references: Json | null
          rejection_conditions: string[] | null
          related_programmes: string[] | null
          reporting_requirements: string | null
          required_documents_detailed: Json | null
          requirements_extraction_status: string | null
          requirements_markdown: string | null
          run_id: string | null
          sanctions_for_non_compliance: string | null
          scoring_criteria: Json | null
          scrape_bundle_id: string | null
          scrape_date: string | null
          sector: string[] | null
          selection_criteria: Json | null
          signature_date: string | null
          source_slug: string | null
          source_url_verified: string | null
          special_conditions: string | null
          status_detailed: string | null
          submission_conditions: string | null
          submission_format: string | null
          submission_method_detailed: string | null
          support_resources: Json | null
          technical_support: string | null
          timeline_notes: string | null
          title: string | null
          total_budget: number | null
          translations: Json | null
          transparency_notes: string | null
          updated_at: string
          url: string | null
          verbatim_blocks: Json | null
          verbatim_extraction: boolean | null
          verbatim_jsonb: Json | null
          verbatim_preserved: boolean | null
        }
        Insert: {
          activity_sector_codes?: string[] | null
          additional_support_mechanisms?: string | null
          agency?: string | null
          ai_model?: string | null
          amount?: number[] | null
          amounts?: string | null
          application_language?: string | null
          application_method?: string | null
          application_method_markdown?: string | null
          application_process?: string | null
          application_requirements?: Json | null
          application_window_end?: string | null
          application_window_start?: string | null
          archived?: boolean | null
          audit?: Json | null
          audit_notes?: string | null
          beneficiary_reporting_requirements?: string | null
          beneficiary_types?: string[] | null
          budget_tranches?: Json | null
          call_type?: string | null
          categories?: string[] | null
          checksum?: string | null
          co_financing_rate?: number | null
          co_financing_rates_by_category?: Json | null
          cofinancing_sources?: Json | null
          compliance_audit_mechanisms?: string | null
          compliance_requirements?: string | null
          conditional_eligibility?: Json | null
          confidence_score?: number | null
          conflict_of_interest_notes?: string | null
          contact_information?: Json | null
          content_checksum?: string | null
          content_hash?: string | null
          created_at?: string
          cross_funding_links?: Json | null
          deadline?: string | null
          deadlines?: string | null
          deadlines_jsonb?: Json | null
          deadlines_markdown?: string | null
          decision_publication_method?: string | null
          description?: string | null
          description_markdown?: string | null
          document_analysis_performed?: boolean | null
          document_count?: number | null
          documents?: Json | null
          documents_jsonb?: Json | null
          documents_markdown?: string | null
          duration_limits?: string | null
          eligibility?: string | null
          eligibility_markdown?: string | null
          eligible_actions?: string[] | null
          eligible_entities?: string[] | null
          eligible_expenses_detailed?: Json | null
          entity_size?: string | null
          environmental_social_safeguards?: string | null
          evaluation_committee?: string | null
          evaluation_criteria?: string | null
          evaluation_phases?: Json | null
          evaluation_start_date?: string | null
          expected_results?: string | null
          extended_deadlines?: Json | null
          extracted_documents?: Json | null
          extraction_batch_id?: string | null
          extraction_completeness_score?: number | null
          extraction_method?: string | null
          extraction_model?: string | null
          extraction_timestamp?: string | null
          extraction_version?: string | null
          fingerprint?: string | null
          forms_analysis_performed?: boolean | null
          forms_detected?: Json | null
          forms_recreated?: Json | null
          funding_markdown?: string | null
          funding_programme?: string | null
          funding_rate_details?: Json | null
          funding_source?: string | null
          funding_tranches?: Json | null
          funding_type?: string | null
          geographic_eligibility?: Json | null
          geographic_scope?: Json | null
          id?: string
          impact_indicators?: Json | null
          import_job_id?: string | null
          ineligible_actions?: string[] | null
          ineligible_expenses?: Json | null
          investment_types?: string[] | null
          language?: string | null
          last_seen_at?: string | null
          legal_entity_type?: string[] | null
          managing_agency?: string | null
          matching_algorithm_score?: number | null
          minimum_score?: number | null
          missing_fields?: string[] | null
          objectives?: string[] | null
          objectives_detailed?: string | null
          opening_date?: string | null
          payment_modality?: string | null
          payment_schedule?: Json | null
          payment_terms?: string | null
          policy_objective?: string | null
          presentation?: string | null
          previous_acceptance_rate?: number | null
          previous_award_restrictions?: string | null
          previous_recipients_list?: string | null
          priority_groups?: Json | null
          priority_themes?: string[] | null
          process_steps?: Json | null
          procurement_obligations?: string | null
          program?: string | null
          program_markdown?: string | null
          project_duration?: string | null
          publication_date?: string | null
          questionnaire_steps?: Json | null
          raw_log_id?: string | null
          record_status?: string | null
          reference_code?: string | null
          region?: string[] | null
          regulatory_references?: Json | null
          rejection_conditions?: string[] | null
          related_programmes?: string[] | null
          reporting_requirements?: string | null
          required_documents_detailed?: Json | null
          requirements_extraction_status?: string | null
          requirements_markdown?: string | null
          run_id?: string | null
          sanctions_for_non_compliance?: string | null
          scoring_criteria?: Json | null
          scrape_bundle_id?: string | null
          scrape_date?: string | null
          sector?: string[] | null
          selection_criteria?: Json | null
          signature_date?: string | null
          source_slug?: string | null
          source_url_verified?: string | null
          special_conditions?: string | null
          status_detailed?: string | null
          submission_conditions?: string | null
          submission_format?: string | null
          submission_method_detailed?: string | null
          support_resources?: Json | null
          technical_support?: string | null
          timeline_notes?: string | null
          title?: string | null
          total_budget?: number | null
          translations?: Json | null
          transparency_notes?: string | null
          updated_at?: string
          url?: string | null
          verbatim_blocks?: Json | null
          verbatim_extraction?: boolean | null
          verbatim_jsonb?: Json | null
          verbatim_preserved?: boolean | null
        }
        Update: {
          activity_sector_codes?: string[] | null
          additional_support_mechanisms?: string | null
          agency?: string | null
          ai_model?: string | null
          amount?: number[] | null
          amounts?: string | null
          application_language?: string | null
          application_method?: string | null
          application_method_markdown?: string | null
          application_process?: string | null
          application_requirements?: Json | null
          application_window_end?: string | null
          application_window_start?: string | null
          archived?: boolean | null
          audit?: Json | null
          audit_notes?: string | null
          beneficiary_reporting_requirements?: string | null
          beneficiary_types?: string[] | null
          budget_tranches?: Json | null
          call_type?: string | null
          categories?: string[] | null
          checksum?: string | null
          co_financing_rate?: number | null
          co_financing_rates_by_category?: Json | null
          cofinancing_sources?: Json | null
          compliance_audit_mechanisms?: string | null
          compliance_requirements?: string | null
          conditional_eligibility?: Json | null
          confidence_score?: number | null
          conflict_of_interest_notes?: string | null
          contact_information?: Json | null
          content_checksum?: string | null
          content_hash?: string | null
          created_at?: string
          cross_funding_links?: Json | null
          deadline?: string | null
          deadlines?: string | null
          deadlines_jsonb?: Json | null
          deadlines_markdown?: string | null
          decision_publication_method?: string | null
          description?: string | null
          description_markdown?: string | null
          document_analysis_performed?: boolean | null
          document_count?: number | null
          documents?: Json | null
          documents_jsonb?: Json | null
          documents_markdown?: string | null
          duration_limits?: string | null
          eligibility?: string | null
          eligibility_markdown?: string | null
          eligible_actions?: string[] | null
          eligible_entities?: string[] | null
          eligible_expenses_detailed?: Json | null
          entity_size?: string | null
          environmental_social_safeguards?: string | null
          evaluation_committee?: string | null
          evaluation_criteria?: string | null
          evaluation_phases?: Json | null
          evaluation_start_date?: string | null
          expected_results?: string | null
          extended_deadlines?: Json | null
          extracted_documents?: Json | null
          extraction_batch_id?: string | null
          extraction_completeness_score?: number | null
          extraction_method?: string | null
          extraction_model?: string | null
          extraction_timestamp?: string | null
          extraction_version?: string | null
          fingerprint?: string | null
          forms_analysis_performed?: boolean | null
          forms_detected?: Json | null
          forms_recreated?: Json | null
          funding_markdown?: string | null
          funding_programme?: string | null
          funding_rate_details?: Json | null
          funding_source?: string | null
          funding_tranches?: Json | null
          funding_type?: string | null
          geographic_eligibility?: Json | null
          geographic_scope?: Json | null
          id?: string
          impact_indicators?: Json | null
          import_job_id?: string | null
          ineligible_actions?: string[] | null
          ineligible_expenses?: Json | null
          investment_types?: string[] | null
          language?: string | null
          last_seen_at?: string | null
          legal_entity_type?: string[] | null
          managing_agency?: string | null
          matching_algorithm_score?: number | null
          minimum_score?: number | null
          missing_fields?: string[] | null
          objectives?: string[] | null
          objectives_detailed?: string | null
          opening_date?: string | null
          payment_modality?: string | null
          payment_schedule?: Json | null
          payment_terms?: string | null
          policy_objective?: string | null
          presentation?: string | null
          previous_acceptance_rate?: number | null
          previous_award_restrictions?: string | null
          previous_recipients_list?: string | null
          priority_groups?: Json | null
          priority_themes?: string[] | null
          process_steps?: Json | null
          procurement_obligations?: string | null
          program?: string | null
          program_markdown?: string | null
          project_duration?: string | null
          publication_date?: string | null
          questionnaire_steps?: Json | null
          raw_log_id?: string | null
          record_status?: string | null
          reference_code?: string | null
          region?: string[] | null
          regulatory_references?: Json | null
          rejection_conditions?: string[] | null
          related_programmes?: string[] | null
          reporting_requirements?: string | null
          required_documents_detailed?: Json | null
          requirements_extraction_status?: string | null
          requirements_markdown?: string | null
          run_id?: string | null
          sanctions_for_non_compliance?: string | null
          scoring_criteria?: Json | null
          scrape_bundle_id?: string | null
          scrape_date?: string | null
          sector?: string[] | null
          selection_criteria?: Json | null
          signature_date?: string | null
          source_slug?: string | null
          source_url_verified?: string | null
          special_conditions?: string | null
          status_detailed?: string | null
          submission_conditions?: string | null
          submission_format?: string | null
          submission_method_detailed?: string | null
          support_resources?: Json | null
          technical_support?: string | null
          timeline_notes?: string | null
          title?: string | null
          total_budget?: number | null
          translations?: Json | null
          transparency_notes?: string | null
          updated_at?: string
          url?: string | null
          verbatim_blocks?: Json | null
          verbatim_extraction?: boolean | null
          verbatim_jsonb?: Json | null
          verbatim_preserved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "subsidies_structured_raw_log_id_fkey"
            columns: ["raw_log_id"]
            isOneToOne: false
            referencedRelation: "raw_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subsidies_structured_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scrape_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subsidies_structured_scrape_bundle_id_fkey"
            columns: ["scrape_bundle_id"]
            isOneToOne: false
            referencedRelation: "scrape_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      subsidies_structured_archive: {
        Row: {
          agency: string | null
          amount: number[] | null
          amounts: string | null
          application_method: string | null
          application_method_markdown: string | null
          application_process: string | null
          application_requirements: Json | null
          application_window_end: string | null
          application_window_start: string | null
          archived: boolean | null
          archived_at: string
          audit: Json | null
          audit_notes: string | null
          beneficiary_types: string[] | null
          checksum: string | null
          co_financing_rate: number | null
          co_financing_rates_by_category: Json | null
          compliance_requirements: string | null
          conditional_eligibility: Json | null
          content_checksum: string | null
          created_at: string
          deadline: string | null
          deadlines: string | null
          deadlines_jsonb: Json | null
          deadlines_markdown: string | null
          description: string | null
          description_markdown: string | null
          document_count: number | null
          documents: Json | null
          documents_jsonb: Json | null
          documents_markdown: string | null
          eligibility: string | null
          eligibility_markdown: string | null
          eligible_actions: string[] | null
          evaluation_criteria: string | null
          extracted_documents: Json | null
          extraction_batch_id: string | null
          fingerprint: string | null
          funding_markdown: string | null
          funding_source: string | null
          funding_tranches: Json | null
          funding_type: string | null
          geographic_scope: Json | null
          id: string
          import_job_id: string | null
          ineligible_actions: string[] | null
          investment_types: string[] | null
          language: string | null
          last_seen_at: string | null
          legal_entity_type: string[] | null
          matching_algorithm_score: number | null
          minimum_score: number | null
          missing_fields: string[] | null
          objectives: string[] | null
          payment_terms: string | null
          presentation: string | null
          previous_acceptance_rate: number | null
          priority_groups: Json | null
          program: string | null
          program_markdown: string | null
          project_duration: string | null
          questionnaire_steps: Json | null
          raw_log_id: string | null
          record_status: string | null
          region: string[] | null
          rejection_conditions: string[] | null
          reporting_requirements: string | null
          requirements_extraction_status: string | null
          requirements_markdown: string | null
          run_id: string | null
          scoring_criteria: Json | null
          scrape_date: string | null
          sector: string[] | null
          source_slug: string | null
          source_url_verified: string | null
          submission_conditions: string | null
          technical_support: string | null
          title: string | null
          updated_at: string
          url: string | null
          verbatim_extraction: boolean | null
          verbatim_jsonb: Json | null
        }
        Insert: {
          agency?: string | null
          amount?: number[] | null
          amounts?: string | null
          application_method?: string | null
          application_method_markdown?: string | null
          application_process?: string | null
          application_requirements?: Json | null
          application_window_end?: string | null
          application_window_start?: string | null
          archived?: boolean | null
          archived_at?: string
          audit?: Json | null
          audit_notes?: string | null
          beneficiary_types?: string[] | null
          checksum?: string | null
          co_financing_rate?: number | null
          co_financing_rates_by_category?: Json | null
          compliance_requirements?: string | null
          conditional_eligibility?: Json | null
          content_checksum?: string | null
          created_at?: string
          deadline?: string | null
          deadlines?: string | null
          deadlines_jsonb?: Json | null
          deadlines_markdown?: string | null
          description?: string | null
          description_markdown?: string | null
          document_count?: number | null
          documents?: Json | null
          documents_jsonb?: Json | null
          documents_markdown?: string | null
          eligibility?: string | null
          eligibility_markdown?: string | null
          eligible_actions?: string[] | null
          evaluation_criteria?: string | null
          extracted_documents?: Json | null
          extraction_batch_id?: string | null
          fingerprint?: string | null
          funding_markdown?: string | null
          funding_source?: string | null
          funding_tranches?: Json | null
          funding_type?: string | null
          geographic_scope?: Json | null
          id?: string
          import_job_id?: string | null
          ineligible_actions?: string[] | null
          investment_types?: string[] | null
          language?: string | null
          last_seen_at?: string | null
          legal_entity_type?: string[] | null
          matching_algorithm_score?: number | null
          minimum_score?: number | null
          missing_fields?: string[] | null
          objectives?: string[] | null
          payment_terms?: string | null
          presentation?: string | null
          previous_acceptance_rate?: number | null
          priority_groups?: Json | null
          program?: string | null
          program_markdown?: string | null
          project_duration?: string | null
          questionnaire_steps?: Json | null
          raw_log_id?: string | null
          record_status?: string | null
          region?: string[] | null
          rejection_conditions?: string[] | null
          reporting_requirements?: string | null
          requirements_extraction_status?: string | null
          requirements_markdown?: string | null
          run_id?: string | null
          scoring_criteria?: Json | null
          scrape_date?: string | null
          sector?: string[] | null
          source_slug?: string | null
          source_url_verified?: string | null
          submission_conditions?: string | null
          technical_support?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
          verbatim_extraction?: boolean | null
          verbatim_jsonb?: Json | null
        }
        Update: {
          agency?: string | null
          amount?: number[] | null
          amounts?: string | null
          application_method?: string | null
          application_method_markdown?: string | null
          application_process?: string | null
          application_requirements?: Json | null
          application_window_end?: string | null
          application_window_start?: string | null
          archived?: boolean | null
          archived_at?: string
          audit?: Json | null
          audit_notes?: string | null
          beneficiary_types?: string[] | null
          checksum?: string | null
          co_financing_rate?: number | null
          co_financing_rates_by_category?: Json | null
          compliance_requirements?: string | null
          conditional_eligibility?: Json | null
          content_checksum?: string | null
          created_at?: string
          deadline?: string | null
          deadlines?: string | null
          deadlines_jsonb?: Json | null
          deadlines_markdown?: string | null
          description?: string | null
          description_markdown?: string | null
          document_count?: number | null
          documents?: Json | null
          documents_jsonb?: Json | null
          documents_markdown?: string | null
          eligibility?: string | null
          eligibility_markdown?: string | null
          eligible_actions?: string[] | null
          evaluation_criteria?: string | null
          extracted_documents?: Json | null
          extraction_batch_id?: string | null
          fingerprint?: string | null
          funding_markdown?: string | null
          funding_source?: string | null
          funding_tranches?: Json | null
          funding_type?: string | null
          geographic_scope?: Json | null
          id?: string
          import_job_id?: string | null
          ineligible_actions?: string[] | null
          investment_types?: string[] | null
          language?: string | null
          last_seen_at?: string | null
          legal_entity_type?: string[] | null
          matching_algorithm_score?: number | null
          minimum_score?: number | null
          missing_fields?: string[] | null
          objectives?: string[] | null
          payment_terms?: string | null
          presentation?: string | null
          previous_acceptance_rate?: number | null
          priority_groups?: Json | null
          program?: string | null
          program_markdown?: string | null
          project_duration?: string | null
          questionnaire_steps?: Json | null
          raw_log_id?: string | null
          record_status?: string | null
          region?: string[] | null
          rejection_conditions?: string[] | null
          reporting_requirements?: string | null
          requirements_extraction_status?: string | null
          requirements_markdown?: string | null
          run_id?: string | null
          scoring_criteria?: Json | null
          scrape_date?: string | null
          sector?: string[] | null
          source_slug?: string | null
          source_url_verified?: string | null
          submission_conditions?: string | null
          technical_support?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
          verbatim_extraction?: boolean | null
          verbatim_jsonb?: Json | null
        }
        Relationships: []
      }
      subsidy_applications: {
        Row: {
          created_at: string
          farm_id: string | null
          form_data: Json
          form_id: string
          id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          farm_id?: string | null
          form_data?: Json
          form_id: string
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          farm_id?: string | null
          form_data?: Json
          form_id?: string
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subsidy_applications_farm"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_subsidy_applications_form"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "subsidy_form_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      subsidy_categories: {
        Row: {
          category: string
          created_at: string | null
          id: string
          sector: string | null
          subcategory: string | null
          subsidy_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          sector?: string | null
          subcategory?: string | null
          subsidy_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          sector?: string | null
          subcategory?: string | null
          subsidy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subsidy_categories_subsidy_id_fkey"
            columns: ["subsidy_id"]
            isOneToOne: false
            referencedRelation: "subsidies"
            referencedColumns: ["id"]
          },
        ]
      }
      subsidy_categories_backup: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          sector: string | null
          subcategory: string | null
          subsidy_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          sector?: string | null
          subcategory?: string | null
          subsidy_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          sector?: string | null
          subcategory?: string | null
          subsidy_id?: string | null
        }
        Relationships: []
      }
      subsidy_form_schema_errors: {
        Row: {
          created_at: string
          document_filename: string | null
          document_url: string
          extraction_attempt: number | null
          id: string
          parse_error: string | null
          raw_ai_output: string | null
          subsidy_id: string | null
        }
        Insert: {
          created_at?: string
          document_filename?: string | null
          document_url: string
          extraction_attempt?: number | null
          id?: string
          parse_error?: string | null
          raw_ai_output?: string | null
          subsidy_id?: string | null
        }
        Update: {
          created_at?: string
          document_filename?: string | null
          document_url?: string
          extraction_attempt?: number | null
          id?: string
          parse_error?: string | null
          raw_ai_output?: string | null
          subsidy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subsidy_form_schema_errors_subsidy_id_fkey"
            columns: ["subsidy_id"]
            isOneToOne: false
            referencedRelation: "subsidies"
            referencedColumns: ["id"]
          },
        ]
      }
      subsidy_form_schemas: {
        Row: {
          created_at: string
          id: string
          schema: Json
          subsidy_id: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          schema?: Json
          subsidy_id: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          schema?: Json
          subsidy_id?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subsidy_form_schemas_subsidy"
            columns: ["subsidy_id"]
            isOneToOne: false
            referencedRelation: "subsidies_structured"
            referencedColumns: ["id"]
          },
        ]
      }
      subsidy_locations: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string | null
          id: string
          postal_codes: string[] | null
          region: string | null
          subsidy_id: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: string
          postal_codes?: string[] | null
          region?: string | null
          subsidy_id?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: string
          postal_codes?: string[] | null
          region?: string | null
          subsidy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subsidy_locations_subsidy_id_fkey"
            columns: ["subsidy_id"]
            isOneToOne: true
            referencedRelation: "subsidies"
            referencedColumns: ["id"]
          },
        ]
      }
      subsidy_locations_backup: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string | null
          id: string | null
          postal_codes: string[] | null
          region: string | null
          subsidy_id: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          postal_codes?: string[] | null
          region?: string | null
          subsidy_id?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: string | null
          postal_codes?: string[] | null
          region?: string | null
          subsidy_id?: string | null
        }
        Relationships: []
      }
      subsidy_matches: {
        Row: {
          confidence: number
          created_at: string
          farm_id: string
          id: string
          match_criteria: Json | null
          status: string | null
          subsidy_id: string
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          farm_id: string
          id?: string
          match_criteria?: Json | null
          status?: string | null
          subsidy_id: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          farm_id?: string
          id?: string
          match_criteria?: Json | null
          status?: string | null
          subsidy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subsidy_matches_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subsidy_matches_subsidy_id_fkey"
            columns: ["subsidy_id"]
            isOneToOne: false
            referencedRelation: "subsidies_structured"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_items: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_type: string | null
          external_id: string
          id: string
          item_data: Json | null
          item_type: string | null
          processed_at: string | null
          retry_count: number | null
          run_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          external_id: string
          id?: string
          item_data?: Json | null
          item_type?: string | null
          processed_at?: string | null
          retry_count?: number | null
          run_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_type?: string | null
          external_id?: string
          id?: string
          item_data?: Json | null
          item_type?: string | null
          processed_at?: string | null
          retry_count?: number | null
          run_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_progress: {
        Row: {
          api_source: string
          completed_at: string | null
          current_status: string | null
          error_count: number | null
          eta_minutes: number | null
          id: string
          pages_completed: number | null
          started_at: string | null
          subsidies_added: number | null
          subsidies_processed: number | null
          sync_session_id: string
          total_pages: number | null
          updated_at: string | null
        }
        Insert: {
          api_source: string
          completed_at?: string | null
          current_status?: string | null
          error_count?: number | null
          eta_minutes?: number | null
          id?: string
          pages_completed?: number | null
          started_at?: string | null
          subsidies_added?: number | null
          subsidies_processed?: number | null
          sync_session_id: string
          total_pages?: number | null
          updated_at?: string | null
        }
        Update: {
          api_source?: string
          completed_at?: string | null
          current_status?: string | null
          error_count?: number | null
          eta_minutes?: number | null
          id?: string
          pages_completed?: number | null
          started_at?: string | null
          subsidies_added?: number | null
          subsidies_processed?: number | null
          sync_session_id?: string
          total_pages?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          config: Json | null
          created_at: string | null
          error_message: string | null
          failed: number | null
          finished_at: string | null
          id: string
          inserted: number | null
          run_type: string | null
          skipped: number | null
          source_code: string
          started_at: string | null
          status: string | null
          total: number | null
          updated: number | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          error_message?: string | null
          failed?: number | null
          finished_at?: string | null
          id?: string
          inserted?: number | null
          run_type?: string | null
          skipped?: number | null
          source_code: string
          started_at?: string | null
          status?: string | null
          total?: number | null
          updated?: number | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          error_message?: string | null
          failed?: number | null
          finished_at?: string | null
          id?: string
          inserted?: number | null
          run_type?: string | null
          skipped?: number | null
          source_code?: string
          started_at?: string | null
          status?: string | null
          total?: number | null
          updated?: number | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      system_health_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_name: string
          metric_type: string
          tags: Json | null
          timestamp: string | null
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_name: string
          metric_type: string
          tags?: Json | null
          timestamp?: string | null
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_name?: string
          metric_type?: string
          tags?: Json | null
          timestamp?: string | null
          unit?: string | null
          value?: number
        }
        Relationships: []
      }
      universal_applications: {
        Row: {
          applicant_profile_id: string
          application_data: Json | null
          application_reference: string | null
          awarded_amount: number | null
          created_at: string | null
          currency_code: string | null
          deadline_date: string | null
          decision_date: string | null
          history: Json | null
          id: string
          notes: string | null
          review_status: string | null
          sector_id: string | null
          status: string | null
          submitted_at: string | null
          subsidy_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applicant_profile_id: string
          application_data?: Json | null
          application_reference?: string | null
          awarded_amount?: number | null
          created_at?: string | null
          currency_code?: string | null
          deadline_date?: string | null
          decision_date?: string | null
          history?: Json | null
          id?: string
          notes?: string | null
          review_status?: string | null
          sector_id?: string | null
          status?: string | null
          submitted_at?: string | null
          subsidy_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applicant_profile_id?: string
          application_data?: Json | null
          application_reference?: string | null
          awarded_amount?: number | null
          created_at?: string | null
          currency_code?: string | null
          deadline_date?: string | null
          decision_date?: string | null
          history?: Json | null
          id?: string
          notes?: string | null
          review_status?: string | null
          sector_id?: string | null
          status?: string | null
          submitted_at?: string | null
          subsidy_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "universal_applications_applicant_profile_id_fkey"
            columns: ["applicant_profile_id"]
            isOneToOne: false
            referencedRelation: "applicant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universal_applications_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universal_applications_subsidy_id_fkey"
            columns: ["subsidy_id"]
            isOneToOne: false
            referencedRelation: "subsidies"
            referencedColumns: ["id"]
          },
        ]
      }
      universal_documents: {
        Row: {
          applicant_profile_id: string
          category: string | null
          created_at: string | null
          document_type: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          metadata: Json | null
          mime_type: string
          processed_at: string | null
          processing_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applicant_profile_id: string
          category?: string | null
          created_at?: string | null
          document_type: string
          file_name: string
          file_size: number
          file_url: string
          id?: string
          metadata?: Json | null
          mime_type: string
          processed_at?: string | null
          processing_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applicant_profile_id?: string
          category?: string | null
          created_at?: string | null
          document_type?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          metadata?: Json | null
          mime_type?: string
          processed_at?: string | null
          processing_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "universal_documents_applicant_profile_id_fkey"
            columns: ["applicant_profile_id"]
            isOneToOne: false
            referencedRelation: "applicant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string | null
          credits_used: number | null
          error_message: string | null
          event_metadata: Json | null
          feature_name: string
          id: string
          success: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          event_metadata?: Json | null
          feature_name: string
          id?: string
          success?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          event_metadata?: Json | null
          feature_name?: string
          id?: string
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_access_tiers: {
        Row: {
          access_tier: Database["public"]["Enums"]["access_tier"]
          auto_renew: boolean | null
          created_at: string | null
          id: string
          last_payment_date: string | null
          tier_end_date: string | null
          tier_start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_tier?: Database["public"]["Enums"]["access_tier"]
          auto_renew?: boolean | null
          created_at?: string | null
          id?: string
          last_payment_date?: string | null
          tier_end_date?: string | null
          tier_start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_tier?: Database["public"]["Enums"]["access_tier"]
          auto_renew?: boolean | null
          created_at?: string | null
          id?: string
          last_payment_date?: string | null
          tier_end_date?: string | null
          tier_start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          triggered_by: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          triggered_by?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          triggered_by?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_alerts: {
        Row: {
          alert_id: string
          created_at: string
          dismissed: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          dismissed?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          dismissed?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          action_url: string | null
          applicant_profile_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          priority: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          applicant_profile_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          applicant_profile_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_applicant_profile_id_fkey"
            columns: ["applicant_profile_id"]
            isOneToOne: false
            referencedRelation: "applicant_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          cui: string | null
          email: string
          full_name: string
          id: string
          registration_doc_url: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          cui?: string | null
          email: string
          full_name: string
          id: string
          registration_doc_url?: string | null
          updated_at?: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          cui?: string | null
          email?: string
          full_name?: string
          id?: string
          registration_doc_url?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      review_queue_stats: {
        Row: {
          active_reviewers: number | null
          avg_review_time_minutes: number | null
          completed_count: number | null
          date_created: string | null
          escalated_count: number | null
          high_priority_count: number | null
          in_progress_count: number | null
          overdue_count: number | null
          pending_count: number | null
          resource_type: string | null
          urgent_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      acquire_processing_lock: {
        Args: { log_id: string }
        Returns: boolean
      }
      app_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      app_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      app_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      app_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      archive_previous_data: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      assign_user_role: {
        Args: {
          _assigned_by?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      calculate_match_confidence: {
        Args: {
          farm_region: string
          farm_tags: string[]
          subsidy_regions: string[]
          subsidy_tags: string[]
        }
        Returns: number
      }
      check_production_readiness: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_stuck_syncs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      complete_data_purge: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      compute_content_hash: {
        Args: { content_data: Json }
        Returns: string
      }
      compute_scrape_hash: {
        Args: { content_data: Json }
        Returns: string
      }
      create_extraction_if_not_exists: {
        Args: {
          p_document_id: string
          p_idempotency_key: string
          p_user_id?: string
        }
        Returns: string
      }
      deduct_credits: {
        Args: {
          p_credit_type: Database["public"]["Enums"]["credit_type"]
          p_credits_to_deduct: number
          p_user_id: string
        }
        Returns: boolean
      }
      find_bundle_by_hash: {
        Args: { p_hash: string }
        Returns: string
      }
      fix_subsidies_source_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_count: number
          updated_count: number
        }[]
      }
      get_active_run_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          config: Json
          id: string
          progress: number
          runtime_seconds: number
          stage: string
          started_at: string
          status: string
        }[]
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_documents: number
          total_extractions: number
          total_farms: number
          total_users: number
        }[]
      }
      get_ai_errors_last_24h: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          message: string
          run_id: string
          source_url: string
          stage: string
        }[]
      }
      get_apis_due_for_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          api_source: string
          hours_overdue: number
          priority: number
        }[]
      }
      get_available_credits: {
        Args: {
          p_credit_type: Database["public"]["Enums"]["credit_type"]
          p_user_id: string
        }
        Returns: number
      }
      get_change_detection_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          api_currently_available: boolean
          api_source: string
          change_summary: string
          check_frequency: string
          failure_count: number
          hours_since_last_check: number
          last_check: string
          last_check_had_changes: boolean
          last_response_time: number
          next_check: string
          polling_enabled: boolean
          status: string
        }[]
      }
      get_data_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          count: number
          table_name: string
        }[]
      }
      get_extraction_summary: {
        Args: { p_user_id?: string }
        Returns: {
          confidence_avg: number
          document_id: string
          extraction_count: number
          latest_status: string
        }[]
      }
      get_farm_profiles: {
        Args: { p_user_id?: string }
        Returns: {
          address: string
          cnp_or_cui: string
          country: string
          department: string
          farm_id: string
          farm_name: string
          legal_status: string
          profile_created_at: string
          profile_id: string
          profile_updated_at: string
          total_hectares: number
          user_id: string
        }[]
      }
      get_phase_d_extractions: {
        Args: Record<PropertyKey, never>
        Returns: {
          ai_model: string
          confidence_score: number
          created_at: string
          document_id: string
          extraction_method: string
          extraction_outcome: string
          extraction_time_ms: number
          has_subsidy_data: boolean
          id: string
          post_processing_time_ms: number
          quality_tier: string
          status: string
          subsidy_fields_found: number
          successful_tables: number
          table_count: number
          table_quality: number
          tables_extracted: Json
          total_processing_time_ms: number
          total_tables: number
          total_tokens_used: number
          updated_at: string
          version: string
        }[]
      }
      get_pipeline_health_24h: {
        Args: Record<PropertyKey, never>
        Returns: {
          config: Json
          duration_seconds: number
          ended_at: string
          failed_pages: number
          id: string
          processed_pages: number
          progress: number
          stage: string
          started_at: string
          stats: Json
          status: string
          total_pages: number
        }[]
      }
      get_processing_job_status: {
        Args: { p_document_id: string }
        Returns: {
          created_at: string
          error_message: string
          estimated_completion: string
          job_id: string
          priority: string
          processing_time_ms: number
          progress_percentage: number
          status: string
          updated_at: string
        }[]
      }
      get_security_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_access_tier: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["access_tier"]
      }
      get_user_applicant_profiles: {
        Args: { p_user_id?: string }
        Returns: {
          applicant_type: Database["public"]["Enums"]["applicant_type"]
          completion_percentage: number
          created_at: string
          id: string
          is_active: boolean
          profile_name: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_retry_count: {
        Args: { p_backoff_seconds?: number; p_extraction_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_security_event: {
        Args:
          | {
              _event_data?: Json
              _event_type: string
              _risk_level?: string
              _target_user_id?: string
            }
          | {
              p_event_data?: Json
              p_event_type: string
              p_message: string
              p_risk_level?: string
              p_target_user_id?: string
            }
        Returns: undefined
      }
      purge_ai_and_subsidy_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      purge_pipeline_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      release_processing_lock: {
        Args: { log_id: string }
        Returns: boolean
      }
      revoke_user_role: {
        Args: {
          _revoked_by?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rollback_to_previous: {
        Args: { p_run_id: string }
        Returns: boolean
      }
      safe_data_purge: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      scrape_run_kpis: {
        Args: { p_run_id: string }
        Returns: {
          avg_latency: number
          completion_rate: number
          docs_fail: number
          docs_ok: number
          docs_pending: number
          docs_total: number
          error_rate: number
          ocr_rate: number
          pages_crawled: number
          subsidies_parsed: number
        }[]
      }
      update_extraction_status: {
        Args: {
          p_extraction_id: string
          p_failure_code?: string
          p_failure_detail?: string
          p_progress_metadata?: Json
          p_status: Database["public"]["Enums"]["extraction_status_enum"]
        }
        Returns: boolean
      }
      validate_database_integrity: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      verify_system_health: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      access_tier: "free" | "starter" | "professional" | "enterprise"
      app_role: "admin" | "moderator" | "user" | "qa_reviewer"
      applicant_type: "individual" | "business" | "nonprofit" | "municipality"
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
      credit_type:
        | "application"
        | "document"
        | "ai_minutes"
        | "api_calls"
        | "combo"
      document_category:
        | "ownership_proof"
        | "lease_agreement"
        | "environmental_permit"
        | "technical_docs"
        | "animal_registration"
        | "id_document"
        | "company_certificate"
        | "lpis_maps"
        | "legal"
        | "financial"
        | "environmental"
        | "technical"
        | "certification"
        | "other"
      extraction_status_enum:
        | "uploading"
        | "virus_scan"
        | "extracting"
        | "ocr"
        | "ai"
        | "completed"
        | "failed"
        | "needs_review"
      user_type: "farmer" | "consultant" | "organization"
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
      access_tier: ["free", "starter", "professional", "enterprise"],
      app_role: ["admin", "moderator", "user", "qa_reviewer"],
      applicant_type: ["individual", "business", "nonprofit", "municipality"],
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ],
      credit_type: [
        "application",
        "document",
        "ai_minutes",
        "api_calls",
        "combo",
      ],
      document_category: [
        "ownership_proof",
        "lease_agreement",
        "environmental_permit",
        "technical_docs",
        "animal_registration",
        "id_document",
        "company_certificate",
        "lpis_maps",
        "legal",
        "financial",
        "environmental",
        "technical",
        "certification",
        "other",
      ],
      extraction_status_enum: [
        "uploading",
        "virus_scan",
        "extracting",
        "ocr",
        "ai",
        "completed",
        "failed",
        "needs_review",
      ],
      user_type: ["farmer", "consultant", "organization"],
    },
  },
} as const
