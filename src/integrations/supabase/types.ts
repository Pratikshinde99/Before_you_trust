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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      entities: {
        Row: {
          created_at: string
          id: string
          identifier: string
          name: string
          normalized_identifier: string
          type: Database["public"]["Enums"]["entity_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          name: string
          normalized_identifier: string
          type: Database["public"]["Enums"]["entity_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          name?: string
          normalized_identifier?: string
          type?: Database["public"]["Enums"]["entity_type"]
          updated_at?: string
        }
        Relationships: []
      }
      entity_risk_scores: {
        Row: {
          calculated_at: string
          entity_id: string
          id: string
          last_incident_at: string | null
          risk_level: string
          severity_score: number
          total_incidents: number
          verified_incidents: number
        }
        Insert: {
          calculated_at?: string
          entity_id: string
          id?: string
          last_incident_at?: string | null
          risk_level?: string
          severity_score?: number
          total_incidents?: number
          verified_incidents?: number
        }
        Update: {
          calculated_at?: string
          entity_id?: string
          id?: string
          last_incident_at?: string | null
          risk_level?: string
          severity_score?: number
          total_incidents?: number
          verified_incidents?: number
        }
        Relationships: [
          {
            foreignKeyName: "entity_risk_scores_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_evidence: {
        Row: {
          created_at: string
          file_name: string | null
          file_size_bytes: number | null
          file_type: string
          file_url: string
          id: string
          incident_id: string
          is_verified: boolean
          mime_type: string | null
          verification_notes: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_type: string
          file_url: string
          id?: string
          incident_id: string
          is_verified?: boolean
          mime_type?: string | null
          verification_notes?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_type?: string
          file_url?: string
          id?: string
          incident_id?: string
          is_verified?: boolean
          mime_type?: string | null
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_evidence_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          category: Database["public"]["Enums"]["incident_category"]
          created_at: string
          date_occurred: string
          description: string
          entity_id: string
          evidence_count: number | null
          id: string
          location: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          status: Database["public"]["Enums"]["verification_status"]
          submitter_ip_hash: string | null
          title: string
          updated_at: string
          verification_confidence: number | null
          verified_at: string | null
          what_actually_happened: string | null
          what_was_promised: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          date_occurred: string
          description: string
          entity_id: string
          evidence_count?: number | null
          id?: string
          location?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["verification_status"]
          submitter_ip_hash?: string | null
          title: string
          updated_at?: string
          verification_confidence?: number | null
          verified_at?: string | null
          what_actually_happened?: string | null
          what_was_promised?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          date_occurred?: string
          description?: string
          entity_id?: string
          evidence_count?: number | null
          id?: string
          location?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["verification_status"]
          submitter_ip_hash?: string | null
          title?: string
          updated_at?: string
          verification_confidence?: number | null
          verified_at?: string | null
          what_actually_happened?: string | null
          what_was_promised?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_verification_confidence: {
        Args: { p_incident_id: string }
        Returns: number
      }
      cleanup_rate_limits: { Args: never; Returns: number }
    }
    Enums: {
      entity_type: "person" | "business" | "phone" | "website" | "service"
      incident_category:
        | "fraud"
        | "scam"
        | "harassment"
        | "misrepresentation"
        | "non_delivery"
        | "quality_issue"
        | "safety_concern"
        | "data_breach"
        | "unauthorized_charges"
        | "other"
      severity_level: "low" | "medium" | "high" | "critical"
      verification_status: "pending" | "verified" | "disputed" | "rejected"
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
      entity_type: ["person", "business", "phone", "website", "service"],
      incident_category: [
        "fraud",
        "scam",
        "harassment",
        "misrepresentation",
        "non_delivery",
        "quality_issue",
        "safety_concern",
        "data_breach",
        "unauthorized_charges",
        "other",
      ],
      severity_level: ["low", "medium", "high", "critical"],
      verification_status: ["pending", "verified", "disputed", "rejected"],
    },
  },
} as const
