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
          document_markdown: string | null
          error_message: string | null
          extracted_data: Json
          extraction_type: string
          id: string
          session_id: string | null
          status: string
          triggered_by: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          debug_info?: Json | null
          document_id: string
          document_markdown?: string | null
          error_message?: string | null
          extracted_data: Json
          extraction_type?: string
          id?: string
          session_id?: string | null
          status?: string
          triggered_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          debug_info?: Json | null
          document_id?: string
          document_markdown?: string | null
          error_message?: string | null
          extracted_data?: Json
          extraction_type?: string
          id?: string
          session_id?: string | null
          status?: string
          triggered_by?: string | null
          updated_at?: string
          user_id?: string | null
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
          combined_content_markdown: string | null
          created_at: string | null
          error_message: string | null
          id: string
          raw_html: string | null
          raw_markdown: string | null
          raw_text: string | null
          scrape_date: string | null
          source_site: string | null
          source_url: string
          status: string | null
          text_markdown: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_count?: number | null
          attachment_paths?: Json | null
          combined_content_markdown?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          raw_html?: string | null
          raw_markdown?: string | null
          raw_text?: string | null
          scrape_date?: string | null
          source_site?: string | null
          source_url: string
          status?: string | null
          text_markdown?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_count?: number | null
          attachment_paths?: Json | null
          combined_content_markdown?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          raw_html?: string | null
          raw_markdown?: string | null
          raw_text?: string | null
          scrape_date?: string | null
          source_site?: string | null
          source_url?: string
          status?: string | null
          text_markdown?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          extraction_batch_id: string | null
          funding_type: string | null
          id: string
          import_job_id: string | null
          language: string[] | null
          legal_entities: string[] | null
          matching_tags: string[] | null
          raw_content: Json | null
          record_status: string | null
          region: string[] | null
          scrape_date: string | null
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
          extraction_batch_id?: string | null
          funding_type?: string | null
          id?: string
          import_job_id?: string | null
          language?: string[] | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          raw_content?: Json | null
          record_status?: string | null
          region?: string[] | null
          scrape_date?: string | null
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
          extraction_batch_id?: string | null
          funding_type?: string | null
          id?: string
          import_job_id?: string | null
          language?: string[] | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          raw_content?: Json | null
          record_status?: string | null
          region?: string[] | null
          scrape_date?: string | null
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
          amounts: string | null
          application_method: string | null
          application_method_markdown: string | null
          application_process: string | null
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
          deadlines: string | null
          deadlines_markdown: string | null
          description: string | null
          description_markdown: string | null
          document_count: number | null
          documents: Json | null
          documents_markdown: string | null
          eligibility: string | null
          eligibility_markdown: string | null
          eligible_actions: string[] | null
          evaluation_criteria: string | null
          extracted_documents: Json | null
          extraction_batch_id: string | null
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
          scoring_criteria: Json | null
          scrape_date: string | null
          sector: string[] | null
          source_url_verified: string | null
          submission_conditions: string | null
          technical_support: string | null
          title: string | null
          updated_at: string
          url: string | null
          verbatim_extraction: boolean | null
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
          audit?: Json | null
          audit_notes?: string | null
          beneficiary_types?: string[] | null
          co_financing_rate?: number | null
          co_financing_rates_by_category?: Json | null
          compliance_requirements?: string | null
          conditional_eligibility?: Json | null
          created_at?: string
          deadline?: string | null
          deadlines?: string | null
          deadlines_markdown?: string | null
          description?: string | null
          description_markdown?: string | null
          document_count?: number | null
          documents?: Json | null
          documents_markdown?: string | null
          eligibility?: string | null
          eligibility_markdown?: string | null
          eligible_actions?: string[] | null
          evaluation_criteria?: string | null
          extracted_documents?: Json | null
          extraction_batch_id?: string | null
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
          scoring_criteria?: Json | null
          scrape_date?: string | null
          sector?: string[] | null
          source_url_verified?: string | null
          submission_conditions?: string | null
          technical_support?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
          verbatim_extraction?: boolean | null
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
          audit?: Json | null
          audit_notes?: string | null
          beneficiary_types?: string[] | null
          co_financing_rate?: number | null
          co_financing_rates_by_category?: Json | null
          compliance_requirements?: string | null
          conditional_eligibility?: Json | null
          created_at?: string
          deadline?: string | null
          deadlines?: string | null
          deadlines_markdown?: string | null
          description?: string | null
          description_markdown?: string | null
          document_count?: number | null
          documents?: Json | null
          documents_markdown?: string | null
          eligibility?: string | null
          eligibility_markdown?: string | null
          eligible_actions?: string[] | null
          evaluation_criteria?: string | null
          extracted_documents?: Json | null
          extraction_batch_id?: string | null
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
          scoring_criteria?: Json | null
          scrape_date?: string | null
          sector?: string[] | null
          source_url_verified?: string | null
          submission_conditions?: string | null
          technical_support?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
          verbatim_extraction?: boolean | null
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
      calculate_match_confidence: {
        Args: {
          farm_tags: string[]
          subsidy_tags: string[]
          farm_region: string
          subsidy_regions: string[]
        }
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
      get_data_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          count: number
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      release_processing_lock: {
        Args: { log_id: string }
        Returns: boolean
      }
      verify_system_health: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "qa_reviewer"
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
      app_role: ["admin", "moderator", "user", "qa_reviewer"],
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
