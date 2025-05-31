export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        ]
      }
      farms: {
        Row: {
          address: string
          apia_region: string[] | null
          cnp_or_cui: string | null
          created_at: string | null
          department: string | null
          environmental_permit: boolean | null
          gdpr_consent: boolean
          id: string
          land_use_types: string[] | null
          legal_status: string | null
          livestock: Json | null
          livestock_present: boolean | null
          locality: string | null
          name: string
          notify_consent: boolean | null
          own_or_lease: boolean | null
          phone: string | null
          preferred_language: string | null
          subsidy_interest: string[] | null
          tech_docs: boolean | null
          total_hectares: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          apia_region?: string[] | null
          cnp_or_cui?: string | null
          created_at?: string | null
          department?: string | null
          environmental_permit?: boolean | null
          gdpr_consent?: boolean
          id?: string
          land_use_types?: string[] | null
          legal_status?: string | null
          livestock?: Json | null
          livestock_present?: boolean | null
          locality?: string | null
          name: string
          notify_consent?: boolean | null
          own_or_lease?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          subsidy_interest?: string[] | null
          tech_docs?: boolean | null
          total_hectares?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          apia_region?: string[] | null
          cnp_or_cui?: string | null
          created_at?: string | null
          department?: string | null
          environmental_permit?: boolean | null
          gdpr_consent?: boolean
          id?: string
          land_use_types?: string[] | null
          legal_status?: string | null
          livestock?: Json | null
          livestock_present?: boolean | null
          locality?: string | null
          name?: string
          notify_consent?: boolean | null
          own_or_lease?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          subsidy_interest?: string[] | null
          tech_docs?: boolean | null
          total_hectares?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      [_ in never]: never
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
      user_type: "farmer" | "consultant" | "organization"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
      ],
      user_type: ["farmer", "consultant", "organization"],
    },
  },
} as const
