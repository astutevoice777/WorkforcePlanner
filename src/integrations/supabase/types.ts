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
      businesses: {
        Row: {
          address: string | null
          business_hours: Json
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          schedule_settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          business_hours?: Json
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          schedule_settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          business_hours?: Json
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          schedule_settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          business_id: string
          color: string
          created_at: string
          description: string | null
          hourly_rate: number | null
          id: string
          max_staff_allowed: number
          min_staff_required: number
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          color?: string
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          max_staff_allowed?: number
          min_staff_required?: number
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          color?: string
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          max_staff_allowed?: number
          min_staff_required?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          ai_generation_data: Json | null
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string
          generated_by: string
          generation_parameters: Json | null
          id: string
          optimization_score: number | null
          status: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          ai_generation_data?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string
          generated_by?: string
          generation_parameters?: Json | null
          id?: string
          optimization_score?: number | null
          status?: string
          updated_at?: string
          week_start_date: string
        }
        Update: {
          ai_generation_data?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string
          generated_by?: string
          generation_parameters?: Json | null
          id?: string
          optimization_score?: number | null
          status?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_constraints: {
        Row: {
          business_id: string
          constraint_type: string
          created_at: string
          day_of_week: number | null
          end_time: string | null
          id: string
          is_active: boolean
          max_count: number | null
          min_count: number | null
          priority: number
          role_id: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          constraint_type: string
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          max_count?: number | null
          min_count?: number | null
          priority?: number
          role_id?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          constraint_type?: string
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          max_count?: number | null
          min_count?: number | null
          priority?: number
          role_id?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_constraints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_constraints_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          business_id: string
          created_at: string
          day_of_week: number
          duration: number
          end_time: string
          id: string
          is_active: boolean
          name: string
          role_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          day_of_week: number
          duration: number
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          role_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          day_of_week?: number
          duration?: number
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          role_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          date: string
          duration: number
          end_time: string
          id: string
          notes: string | null
          pay_rate: number | null
          role_id: string
          schedule_id: string
          staff_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          duration: number
          end_time: string
          id?: string
          notes?: string | null
          pay_rate?: number | null
          role_id: string
          schedule_id: string
          staff_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          duration?: number
          end_time?: string
          id?: string
          notes?: string | null
          pay_rate?: number | null
          role_id?: string
          schedule_id?: string
          staff_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          availability: Json
          business_id: string
          constraints: Json
          created_at: string
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          fixed_salary: number | null
          holiday_dates: Json | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          per_shift_rate: number | null
          phone: string
          position: string | null
          preferred_working_hours: Json | null
          salary_type: string | null
          shift_preferences: Json | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          availability?: Json
          business_id: string
          constraints?: Json
          created_at?: string
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fixed_salary?: number | null
          holiday_dates?: Json | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          per_shift_rate?: number | null
          phone: string
          position?: string | null
          preferred_working_hours?: Json | null
          salary_type?: string | null
          shift_preferences?: Json | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          availability?: Json
          business_id?: string
          constraints?: Json
          created_at?: string
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fixed_salary?: number | null
          holiday_dates?: Json | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          per_shift_rate?: number | null
          phone?: string
          position?: string | null
          preferred_working_hours?: Json | null
          salary_type?: string | null
          shift_preferences?: Json | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_users: {
        Row: {
          created_at: string
          id: string
          staff_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          staff_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          staff_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_users_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          staff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          staff_id: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          end_date: string
          end_time: string | null
          id: string
          is_partial_day: boolean
          leave_type: string
          reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          staff_id: string
          start_date: string
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          end_time?: string | null
          id?: string
          is_partial_day?: boolean
          leave_type?: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          staff_id: string
          start_date: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          end_time?: string | null
          id?: string
          is_partial_day?: boolean
          leave_type?: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          staff_id?: string
          start_date?: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          business_id: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          processed_at: string | null
          processed_by: string | null
          status: string
          total_deductions: number | null
          total_gross_pay: number | null
          total_hours: number | null
          total_net_pay: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_deductions?: number | null
          total_gross_pay?: number | null
          total_hours?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_deductions?: number | null
          total_gross_pay?: number | null
          total_hours?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          bonus: number | null
          created_at: string
          gross_pay: number | null
          holiday_hours: number | null
          holiday_rate: number | null
          id: string
          net_pay: number | null
          notes: string | null
          other_deductions: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          payroll_period_id: string
          regular_hours: number | null
          regular_rate: number
          staff_id: string
          tax_deductions: number | null
          updated_at: string
        }
        Insert: {
          bonus?: number | null
          created_at?: string
          gross_pay?: number | null
          holiday_hours?: number | null
          holiday_rate?: number | null
          id?: string
          net_pay?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          payroll_period_id: string
          regular_hours?: number | null
          regular_rate: number
          staff_id: string
          tax_deductions?: number | null
          updated_at?: string
        }
        Update: {
          bonus?: number | null
          created_at?: string
          gross_pay?: number | null
          holiday_hours?: number | null
          holiday_rate?: number | null
          id?: string
          net_pay?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          payroll_period_id?: string
          regular_hours?: number | null
          regular_rate?: number
          staff_id?: string
          tax_deductions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_deductions: {
        Row: {
          amount: number
          created_at: string
          deduction_type: string
          description: string
          id: string
          is_percentage: boolean | null
          payroll_entry_id: string
          percentage: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          deduction_type: string
          description: string
          id?: string
          is_percentage?: boolean | null
          payroll_entry_id: string
          percentage?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_type?: string
          description?: string
          id?: string
          is_percentage?: boolean | null
          payroll_entry_id?: string
          percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_deductions_payroll_entry_id_fkey"
            columns: ["payroll_entry_id"]
            isOneToOne: false
            referencedRelation: "payroll_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_reports: {
        Row: {
          business_id: string
          created_at: string
          generated_by: string | null
          id: string
          payroll_period_id: string | null
          report_data: Json
          report_type: string
        }
        Insert: {
          business_id: string
          created_at?: string
          generated_by?: string | null
          id?: string
          payroll_period_id?: string | null
          report_data: Json
          report_type: string
        }
        Update: {
          business_id?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          payroll_period_id?: string | null
          report_data?: Json
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_reports_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
