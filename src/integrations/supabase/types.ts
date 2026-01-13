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
      activity_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["action_type"]
          created_at: string
          description: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["action_type"]
          created_at?: string
          description: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["action_type"]
          created_at?: string
          description?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      attendance_coverage: {
        Row: {
          approval_status: string
          coverage_date: string
          coverage_reason: string
          coverage_type: string
          created_at: string | null
          employee_code: string
          id: string
          source_id: string
          source_table: string
          updated_at: string | null
        }
        Insert: {
          approval_status: string
          coverage_date: string
          coverage_reason: string
          coverage_type: string
          created_at?: string | null
          employee_code: string
          id?: string
          source_id: string
          source_table: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string
          coverage_date?: string
          coverage_reason?: string
          coverage_type?: string
          created_at?: string | null
          employee_code?: string
          id?: string
          source_id?: string
          source_table?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          created_at: string
          date: string
          duration: string | null
          employee_code: string
          id: string
          in_time: string | null
          out_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          duration?: string | null
          employee_code: string
          id?: string
          in_time?: string | null
          out_time?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          duration?: string | null
          employee_code?: string
          id?: string
          in_time?: string | null
          out_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_regularization: {
        Row: {
          approval_status: string
          attendance_day: string
          created_at: string
          description: string | null
          employee_code: string
          id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          approval_status: string
          attendance_day: string
          created_at?: string
          description?: string | null
          employee_code: string
          id?: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          attendance_day?: string
          created_at?: string
          description?: string | null
          employee_code?: string
          id?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          birthday: string | null
          created_at: string
          date_of_exit: string | null
          doj: string
          empl_no: string
          epf: number | null
          gender: string | null
          id: string
          level: string
          location: string
          mobile_number: string | null
          name: string
          official_email: string
          personal_email: string | null
          pod: string
          pod_lead: string | null
          reporting_manager: string | null
          salary: number | null
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          date_of_exit?: string | null
          doj: string
          empl_no: string
          epf?: number | null
          gender?: string | null
          id?: string
          level: string
          location: string
          mobile_number?: string | null
          name: string
          official_email: string
          personal_email?: string | null
          pod: string
          pod_lead?: string | null
          reporting_manager?: string | null
          salary?: number | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          date_of_exit?: string | null
          doj?: string
          empl_no?: string
          epf?: number | null
          gender?: string | null
          id?: string
          level?: string
          location?: string
          mobile_number?: string | null
          name?: string
          official_email?: string
          personal_email?: string | null
          pod?: string
          pod_lead?: string | null
          reporting_manager?: string | null
          salary?: number | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leave_records: {
        Row: {
          approval_status: string
          created_at: string
          days_hours_taken: number
          employee_code: string
          from_date: string
          id: string
          leave_type: string
          to_date: string
          updated_at: string
          zoho_link_id: string
        }
        Insert: {
          approval_status: string
          created_at?: string
          days_hours_taken: number
          employee_code: string
          from_date: string
          id?: string
          leave_type: string
          to_date: string
          updated_at?: string
          zoho_link_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          days_hours_taken?: number
          employee_code?: string
          from_date?: string
          id?: string
          leave_type?: string
          to_date?: string
          updated_at?: string
          zoho_link_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      salary_ranges: {
        Row: {
          created_at: string
          id: string
          level: string
          max_salary: number
          min_salary: number
          updated_at: string
          variable_pay_percentage: number
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          max_salary: number
          min_salary: number
          updated_at?: string
          variable_pay_percentage: number
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          max_salary?: number
          min_salary?: number
          updated_at?: string
          variable_pay_percentage?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
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
      expand_leave_dates: {
        Args: {
          p_approval_status: string
          p_employee_code: string
          p_from_date: string
          p_leave_type: string
          p_source_id: string
          p_to_date: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reconcile_all_attendance: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          delhi_employees: number
          non_delhi_employees: number
          total_processed: number
          total_updated: number
        }[]
      }
      reconcile_attendance_range: {
        Args: {
          p_employee_code: string
          p_end_date: string
          p_start_date: string
        }
        Returns: undefined
      }
    }
    Enums: {
      action_type: "create" | "update" | "delete"
      app_role: "super_admin" | "user"
      entity_type: "employee" | "user"
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
      action_type: ["create", "update", "delete"],
      app_role: ["super_admin", "user"],
      entity_type: ["employee", "user"],
    },
  },
} as const
