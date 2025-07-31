export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
          confidence_score: number | null
          created_at: string
          debug_info: Json | null
          document_id: string
          error_message: string | null
          extracted_data: Json
          extraction_type: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          debug_info?: Json | null
          document_id: string
          error_message?: string | null
          extracted_data: Json
          extraction_type?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          debug_info?: Json | null
          document_id?: string
          error_message?: string | null
          extracted_data?: Json
          extraction_type?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_extractions_document_id"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "farm_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      error_log: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          id: string
          metadata: Json | null
          raw_log_id: string | null
          stack_trace: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          metadata?: Json | null
          raw_log_id?: string | null
          stack_trace?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          raw_log_id?: string | null
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
      farm_documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          category_agreement: boolean | null
          classification_model: string | null
          classification_timestamp: string | null
          farm_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          predicted_category: string | null
          prediction_confidence: number | null
          uploaded_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["document_category"]
          category_agreement?: boolean | null
          classification_model?: string | null
          classification_timestamp?: string | null
          farm_id: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          predicted_category?: string | null
          prediction_confidence?: number | null
          uploaded_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          category_agreement?: boolean | null
          classification_model?: string | null
          classification_timestamp?: string | null
          farm_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          predicted_category?: string | null
          prediction_confidence?: number | null
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
      raw_logs: {
        Row: {
          created_at: string
          file_refs: string[] | null
          id: string
          payload: string
          processed: boolean | null
          processed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_refs?: string[] | null
          id?: string
          payload: string
          processed?: boolean | null
          processed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_refs?: string[] | null
          id?: string
          payload?: string
          processed?: boolean | null
          processed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      raw_scraped_pages: {
        Row: {
          attachment_count: number | null
          attachment_paths: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          raw_html: string | null
          raw_text: string | null
          scrape_date: string | null
          source_site: string | null
          source_url: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_count?: number | null
          attachment_paths?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          raw_html?: string | null
          raw_text?: string | null
          scrape_date?: string | null
          source_site?: string | null
          source_url: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_count?: number | null
          attachment_paths?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          raw_html?: string | null
          raw_text?: string | null
          scrape_date?: string | null
          source_site?: string | null
          source_url?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
        }
        Relationships: []
      }
      subsidies: {
        Row: {
          agency: string | null
          amount_max: number | null
          amount_min: number | null
          application_docs: Json | null
          application_schema: Json | null
          categories: string[] | null
          code: string
          created_at: string | null
          deadline: string | null
          description: Json
          documents: Json | null
          domain: string | null
          eligibility_criteria: Json | null
          funding_type: string | null
          id: string
          language: string[] | null
          legal_entities: string[] | null
          matching_tags: string[] | null
          raw_content: Json | null
          region: string[] | null
          source_url: string | null
          status: string | null
          tags: string[] | null
          title: Json
          updated_at: string | null
        }
        Insert: {
          agency?: string | null
          amount_max?: number | null
          amount_min?: number | null
          application_docs?: Json | null
          application_schema?: Json | null
          categories?: string[] | null
          code: string
          created_at?: string | null
          deadline?: string | null
          description: Json
          documents?: Json | null
          domain?: string | null
          eligibility_criteria?: Json | null
          funding_type?: string | null
          id?: string
          language?: string[] | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          raw_content?: Json | null
          region?: string[] | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title: Json
          updated_at?: string | null
        }
        Update: {
          agency?: string | null
          amount_max?: number | null
          amount_min?: number | null
          application_docs?: Json | null
          application_schema?: Json | null
          categories?: string[] | null
          code?: string
          created_at?: string | null
          deadline?: string | null
          description?: Json
          documents?: Json | null
          domain?: string | null
          eligibility_criteria?: Json | null
          funding_type?: string | null
          id?: string
          language?: string[] | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          raw_content?: Json | null
          region?: string[] | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          title?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      subsidies_structured: {
        Row: {
          agency: string | null
          amount: number[] | null
          application_method: string | null
          application_requirements: Json | null
          application_window_end: string | null
          application_window_start: string | null
          audit: Json | null
          audit_notes: string | null
          beneficiary_types: string[] | null
          co_financing_rate: number | null
          co_financing_rates_by_category: Json | null
          compliance_requirements: string | null
          conditional_eligibility: Json | null
          created_at: string
          deadline: string | null
          description: string | null
          documents: Json | null
          eligibility: string | null
          eligible_actions: string[] | null
          evaluation_criteria: string | null
          funding_source: string | null
          funding_tranches: Json | null
          funding_type: string | null
          geographic_scope: Json | null
          id: string
          ineligible_actions: string[] | null
          investment_types: string[] | null
          language: string | null
          legal_entity_type: string[] | null
          matching_algorithm_score: number | null
          minimum_score: number | null
          missing_fields: string[] | null
          objectives: string[] | null
          payment_terms: string | null
          previous_acceptance_rate: number | null
          priority_groups: Json | null
          program: string | null
          project_duration: string | null
          questionnaire_steps: Json | null
          raw_log_id: string | null
          region: string[] | null
          rejection_conditions: string[] | null
          reporting_requirements: string | null
          requirements_extraction_status: string | null
          scoring_criteria: Json | null
          sector: string[] | null
          submission_conditions: string | null
          technical_support: string | null
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          agency?: string | null
          amount?: number[] | null
          application_method?: string | null
          application_requirements?: Json | null
          application_window_end?: string | null
          application_window_start?: string | null
          audit?: Json | null
          audit_notes?: string | null
          beneficiary_types?: string[] | null
          co_financing_rate?: number | null
          co_financing_rates_by_category?: Json | null
          compliance_requirements?: string | null
          conditional_eligibility?: Json | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          documents?: Json | null
          eligibility?: string | null
          eligible_actions?: string[] | null
          evaluation_criteria?: string | null
          funding_source?: string | null
          funding_tranches?: Json | null
          funding_type?: string | null
          geographic_scope?: Json | null
          id?: string
          ineligible_actions?: string[] | null
          investment_types?: string[] | null
          language?: string | null
          legal_entity_type?: string[] | null
          matching_algorithm_score?: number | null
          minimum_score?: number | null
          missing_fields?: string[] | null
          objectives?: string[] | null
          payment_terms?: string | null
          previous_acceptance_rate?: number | null
          priority_groups?: Json | null
          program?: string | null
          project_duration?: string | null
          questionnaire_steps?: Json | null
          raw_log_id?: string | null
          region?: string[] | null
          rejection_conditions?: string[] | null
          reporting_requirements?: string | null
          requirements_extraction_status?: string | null
          scoring_criteria?: Json | null
          sector?: string[] | null
          submission_conditions?: string | null
          technical_support?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          agency?: string | null
          amount?: number[] | null
          application_method?: string | null
          application_requirements?: Json | null
          application_window_end?: string | null
          application_window_start?: string | null
          audit?: Json | null
          audit_notes?: string | null
          beneficiary_types?: string[] | null
          co_financing_rate?: number | null
          co_financing_rates_by_category?: Json | null
          compliance_requirements?: string | null
          conditional_eligibility?: Json | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          documents?: Json | null
          eligibility?: string | null
          eligible_actions?: string[] | null
          evaluation_criteria?: string | null
          funding_source?: string | null
          funding_tranches?: Json | null
          funding_type?: string | null
          geographic_scope?: Json | null
          id?: string
          ineligible_actions?: string[] | null
          investment_types?: string[] | null
          language?: string | null
          legal_entity_type?: string[] | null
          matching_algorithm_score?: number | null
          minimum_score?: number | null
          missing_fields?: string[] | null
          objectives?: string[] | null
          payment_terms?: string | null
          previous_acceptance_rate?: number | null
          priority_groups?: Json | null
          program?: string | null
          project_duration?: string | null
          questionnaire_steps?: Json | null
          raw_log_id?: string | null
          region?: string[] | null
          rejection_conditions?: string[] | null
          reporting_requirements?: string | null
          requirements_extraction_status?: string | null
          scoring_criteria?: Json | null
          sector?: string[] | null
          submission_conditions?: string | null
          technical_support?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subsidies_structured_raw_log_id_fkey"
            columns: ["raw_log_id"]
            isOneToOne: false
            referencedRelation: "raw_logs"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_processing_lock: {
        Args: { log_id: string }
        Returns: boolean
      }
      calculate_match_confidence: {
        Args: {
          farm_tags: string[]
          subsidy_tags: string[]
          farm_region: string
          subsidy_regions: string[]
        }
        Returns: number
      }
      release_processing_lock: {
        Args: { log_id: string }
        Returns: boolean
      }
    }
    Enums: {
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
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
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
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
      user_type: ["farmer", "consultant", "organization"],
    },
  },
} as const
