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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      demand_events: {
        Row: {
          author_user_id: string
          body: string | null
          created_at: string
          demand_id: string
          event_type: string
          id: string
          visibility: string
        }
        Insert: {
          author_user_id: string
          body?: string | null
          created_at?: string
          demand_id: string
          event_type: string
          id?: string
          visibility?: string
        }
        Update: {
          author_user_id?: string
          body?: string | null
          created_at?: string
          demand_id?: string
          event_type?: string
          id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_events_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_events_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
        ]
      }
      demands: {
        Row: {
          admin_notes: string | null
          admin_status: string | null
          assigned_to: string | null
          assigned_to_user_id: string | null
          attachment_urls: string[] | null
          created_at: string
          demand_type: string
          department: string
          description: string
          destination_department: string | null
          due_at: string | null
          id: string
          impact_level: string
          name: string
          priority: string | null
          priority_score: number | null
          reference_links: string[] | null
          resolved_at: string | null
          status: string
          system_area: string
        }
        Insert: {
          admin_notes?: string | null
          admin_status?: string | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          attachment_urls?: string[] | null
          created_at?: string
          demand_type: string
          department: string
          description: string
          destination_department?: string | null
          due_at?: string | null
          id?: string
          impact_level: string
          name: string
          priority?: string | null
          priority_score?: number | null
          reference_links?: string[] | null
          resolved_at?: string | null
          status?: string
          system_area: string
        }
        Update: {
          admin_notes?: string | null
          admin_status?: string | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          attachment_urls?: string[] | null
          created_at?: string
          demand_type?: string
          department?: string
          description?: string
          destination_department?: string | null
          due_at?: string | null
          id?: string
          impact_level?: string
          name?: string
          priority?: string | null
          priority_score?: number | null
          reference_links?: string[] | null
          resolved_at?: string | null
          status?: string
          system_area?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demands_backup_20250102: {
        Row: {
          admin_notes: string | null
          admin_status: string | null
          assigned_to: string | null
          assigned_to_user_id: string | null
          attachment_urls: string[] | null
          created_at: string | null
          demand_type: string | null
          department: string | null
          description: string | null
          destination_department: string | null
          due_at: string | null
          id: string | null
          impact_level: string | null
          name: string | null
          priority: string | null
          priority_score: number | null
          reference_links: string[] | null
          resolved_at: string | null
          status: string | null
          system_area: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_status?: string | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          attachment_urls?: string[] | null
          created_at?: string | null
          demand_type?: string | null
          department?: string | null
          description?: string | null
          destination_department?: string | null
          due_at?: string | null
          id?: string | null
          impact_level?: string | null
          name?: string | null
          priority?: string | null
          priority_score?: number | null
          reference_links?: string[] | null
          resolved_at?: string | null
          status?: string | null
          system_area?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_status?: string | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          attachment_urls?: string[] | null
          created_at?: string | null
          demand_type?: string | null
          department?: string | null
          description?: string | null
          destination_department?: string | null
          due_at?: string | null
          id?: string | null
          impact_level?: string | null
          name?: string | null
          priority?: string | null
          priority_score?: number | null
          reference_links?: string[] | null
          resolved_at?: string | null
          status?: string | null
          system_area?: string | null
        }
        Relationships: []
      }
      demands_counts_backup_20250102: {
        Row: {
          admin_status: string | null
          count: number | null
          status: string | null
        }
        Insert: {
          admin_status?: string | null
          count?: number | null
          status?: string | null
        }
        Update: {
          admin_status?: string | null
          count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      demands_structure_backup_20250102: {
        Row: {
          column_default: string | null
          column_name: unknown
          data_type: string | null
          is_nullable: string | null
        }
        Insert: {
          column_default?: string | null
          column_name?: unknown
          data_type?: string | null
          is_nullable?: string | null
        }
        Update: {
          column_default?: string | null
          column_name?: unknown
          data_type?: string | null
          is_nullable?: string | null
        }
        Relationships: []
      }
      department_responsibles: {
        Row: {
          created_at: string
          department: string
          id: string
          is_default: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          is_default?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          is_default?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_responsibles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          dedupe_key: string | null
          demand_id: string | null
          error_message: string | null
          id: string
          payload: Json | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          template_id: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          demand_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          template_id: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          demand_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
          updated_at: string
          whatsapp_opt_in: boolean | null
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          role?: string
          updated_at?: string
          whatsapp_opt_in?: boolean | null
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          updated_at?: string
          whatsapp_opt_in?: boolean | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      user_departments: {
        Row: {
          created_at: string
          department: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_demand_comment: {
        Args: { p_body: string; p_demand_id: string }
        Returns: Json
      }
      set_demand_status: {
        Args: { p_demand_id: string; p_new_status: string }
        Returns: Json
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
