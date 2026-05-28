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
      account_members: {
        Row: {
          account_id: string
          created_at: string
          id: string
          invited_email: string | null
          role: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          invited_email?: string | null
          role?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          invited_email?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_connections: {
        Row: {
          account_id: string
          bank_account_iban: string | null
          bank_account_id: string | null
          bank_account_name: string | null
          bank_country: string | null
          bank_logo: string | null
          bank_name: string
          created_at: string
          id: string
          last_synced_at: string | null
          session_id: string
          status: string
          updated_at: string
          user_id: string
          valid_until: string
        }
        Insert: {
          account_id: string
          bank_account_iban?: string | null
          bank_account_id?: string | null
          bank_account_name?: string | null
          bank_country?: string | null
          bank_logo?: string | null
          bank_name: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
          valid_until: string
        }
        Update: {
          account_id?: string
          bank_account_iban?: string | null
          bank_account_id?: string | null
          bank_account_name?: string | null
          bank_country?: string | null
          bank_logo?: string | null
          bank_name?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          valid_until?: string
        }
        Relationships: []
      }
      bank_synced_transactions: {
        Row: {
          account_id: string
          amount: number
          bank_connection_id: string
          created_at: string
          description: string | null
          expense_id: string | null
          id: string
          transaction_date: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount: number
          bank_connection_id: string
          created_at?: string
          description?: string | null
          expense_id?: string | null
          id?: string
          transaction_date: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          bank_connection_id?: string
          created_at?: string
          description?: string | null
          expense_id?: string | null
          id?: string
          transaction_date?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_synced_transactions_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_synced_transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          account_id: string | null
          created_at: string
          deductions: Json | null
          id: string
          month: number
          monthly_budget: number
          salary: number | null
          savings: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          deductions?: Json | null
          id?: string
          month: number
          monthly_budget: number
          salary?: number | null
          savings?: number | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          account_id?: string | null
          created_at?: string
          deductions?: Json | null
          id?: string
          month?: number
          monthly_budget?: number
          salary?: number | null
          savings?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          account_id: string
          created_at: string
          emoji: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          account_id: string
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          budget_id: string
          category: string | null
          created_at: string
          date: string
          id: string
          name: string | null
          user_id: string
        }
        Insert: {
          amount: number
          budget_id: string
          category?: string | null
          created_at?: string
          date: string
          id?: string
          name?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          budget_id?: string
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_pending_invitations: { Args: never; Returns: number }
      has_account_access: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      has_expense_access: {
        Args: { _budget_id: string; _user_id: string }
        Returns: boolean
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
  public: {
    Enums: {},
  },
} as const
