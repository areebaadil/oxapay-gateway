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
      admin_profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          merchant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          merchant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deposit_intents: {
        Row: {
          callback_url: string | null
          coin: Database["public"]["Enums"]["coin_type"]
          created_at: string
          deposit_address: string | null
          expected_amount: number
          expires_at: string
          id: string
          merchant_id: string
          user_reference: string
        }
        Insert: {
          callback_url?: string | null
          coin: Database["public"]["Enums"]["coin_type"]
          created_at?: string
          deposit_address?: string | null
          expected_amount: number
          expires_at: string
          id?: string
          merchant_id: string
          user_reference: string
        }
        Update: {
          callback_url?: string | null
          coin?: Database["public"]["Enums"]["coin_type"]
          created_at?: string
          deposit_address?: string | null
          expected_amount?: number
          expires_at?: string
          id?: string
          merchant_id?: string
          user_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_intents_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          coin: Database["public"]["Enums"]["coin_type"]
          updated_at: string
          usd_rate: number
        }
        Insert: {
          coin: Database["public"]["Enums"]["coin_type"]
          updated_at?: string
          usd_rate: number
        }
        Update: {
          coin?: Database["public"]["Enums"]["coin_type"]
          updated_at?: string
          usd_rate?: number
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["ledger_category"]
          coin: Database["public"]["Enums"]["coin_type"]
          created_at: string
          description: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          merchant_id: string
          transaction_id: string
          usd_value_at_time: number
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["ledger_category"]
          coin: Database["public"]["Enums"]["coin_type"]
          created_at?: string
          description: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          merchant_id: string
          transaction_id: string
          usd_value_at_time: number
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["ledger_category"]
          coin?: Database["public"]["Enums"]["coin_type"]
          created_at?: string
          description?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          merchant_id?: string
          transaction_id?: string
          usd_value_at_time?: number
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_users: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_users_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          created_at: string
          deposit_fee_percentage: number
          email: string
          id: string
          is_enabled: boolean
          name: string
          updated_at: string
          webhook_url: string | null
          withdrawal_fee_percentage: number
        }
        Insert: {
          created_at?: string
          deposit_fee_percentage?: number
          email: string
          id?: string
          is_enabled?: boolean
          name: string
          updated_at?: string
          webhook_url?: string | null
          withdrawal_fee_percentage?: number
        }
        Update: {
          created_at?: string
          deposit_fee_percentage?: number
          email?: string
          id?: string
          is_enabled?: boolean
          name?: string
          updated_at?: string
          webhook_url?: string | null
          withdrawal_fee_percentage?: number
        }
        Relationships: []
      }
      settlements: {
        Row: {
          amount: number
          coin: Database["public"]["Enums"]["coin_type"]
          id: string
          merchant_id: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: Database["public"]["Enums"]["settlement_status"]
          usd_value_at_request: number
          wallet_address: string
        }
        Insert: {
          amount: number
          coin: Database["public"]["Enums"]["coin_type"]
          id?: string
          merchant_id: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          usd_value_at_request: number
          wallet_address: string
        }
        Update: {
          amount?: number
          coin?: Database["public"]["Enums"]["coin_type"]
          id?: string
          merchant_id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          usd_value_at_request?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          coin: Database["public"]["Enums"]["coin_type"]
          confirmed_at: string | null
          created_at: string
          crypto_amount: number
          deposit_intent_id: string | null
          exchange_rate: number
          id: string
          merchant_id: string
          status: Database["public"]["Enums"]["transaction_status"]
          tx_hash: string | null
          usd_value: number
          user_reference: string
        }
        Insert: {
          coin: Database["public"]["Enums"]["coin_type"]
          confirmed_at?: string | null
          created_at?: string
          crypto_amount: number
          deposit_intent_id?: string | null
          exchange_rate: number
          id?: string
          merchant_id: string
          status?: Database["public"]["Enums"]["transaction_status"]
          tx_hash?: string | null
          usd_value: number
          user_reference: string
        }
        Update: {
          coin?: Database["public"]["Enums"]["coin_type"]
          confirmed_at?: string | null
          created_at?: string
          crypto_amount?: number
          deposit_intent_id?: string | null
          exchange_rate?: number
          id?: string
          merchant_id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          tx_hash?: string | null
          usd_value?: number
          user_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_deposit_intent_id_fkey"
            columns: ["deposit_intent_id"]
            isOneToOne: false
            referencedRelation: "deposit_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_attempt_at: string
          merchant_id: string
          payload: Json
          response_status: number | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          last_attempt_at?: string
          merchant_id: string
          payload: Json
          response_status?: number | null
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          last_attempt_at?: string
          merchant_id?: string
          payload?: Json
          response_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_merchant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      coin_type: "BTC" | "ETH" | "USDT" | "USDC" | "LTC" | "TRX"
      ledger_category: "DEPOSIT" | "FEE" | "SETTLEMENT" | "PROCESSOR_FEE"
      ledger_entry_type: "CREDIT" | "DEBIT"
      settlement_status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
      transaction_status:
        | "PENDING"
        | "CONFIRMED"
        | "FAILED"
        | "EXPIRED"
        | "SETTLED"
      user_role: "admin" | "merchant"
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
      coin_type: ["BTC", "ETH", "USDT", "USDC", "LTC", "TRX"],
      ledger_category: ["DEPOSIT", "FEE", "SETTLEMENT", "PROCESSOR_FEE"],
      ledger_entry_type: ["CREDIT", "DEBIT"],
      settlement_status: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
      transaction_status: [
        "PENDING",
        "CONFIRMED",
        "FAILED",
        "EXPIRED",
        "SETTLED",
      ],
      user_role: ["admin", "merchant"],
    },
  },
} as const
