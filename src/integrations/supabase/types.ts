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
    PostgrestVersion: "12.2.3 (519615d)"
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
      farm_documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          farm_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["document_category"]
          farm_id: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          farm_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
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
      subsidies: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          categories: string[] | null
          code: string
          created_at: string | null
          deadline: string | null
          description: Json
          eligibility_criteria: Json | null
          funding_type: string | null
          id: string
          language: string[] | null
          legal_entities: string[] | null
          matching_tags: string[] | null
          region: string[] | null
          status: string | null
          tags: string[] | null
          title: Json
          updated_at: string | null
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          categories?: string[] | null
          code: string
          created_at?: string | null
          deadline?: string | null
          description: Json
          eligibility_criteria?: Json | null
          funding_type?: string | null
          id?: string
          language?: string[] | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          region?: string[] | null
          status?: string | null
          tags?: string[] | null
          title: Json
          updated_at?: string | null
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          categories?: string[] | null
          code?: string
          created_at?: string | null
          deadline?: string | null
          description?: Json
          eligibility_criteria?: Json | null
          funding_type?: string | null
          id?: string
          language?: string[] | null
          legal_entities?: string[] | null
          matching_tags?: string[] | null
          region?: string[] | null
          status?: string | null
          tags?: string[] | null
          title?: Json
          updated_at?: string | null
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
      calculate_match_confidence: {
        Args: {
          farm_tags: string[]
          subsidy_tags: string[]
          farm_region: string
          subsidy_regions: string[]
        }
        Returns: number
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
