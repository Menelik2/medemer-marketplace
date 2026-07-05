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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      delivery_updates: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          note: string | null
          order_id: string
          photo_url: string | null
          signature_url: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          order_id: string
          photo_url?: string | null
          signature_url?: string | null
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          order_id?: string
          photo_url?: string | null
          signature_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_updates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          commission_pct: number
          id: string
          order_id: string
          platform_fee: number
          product_id: string
          quantity: number
          seller_id: string
          seller_payout: number
          unit_price: number
        }
        Insert: {
          commission_pct: number
          id?: string
          order_id: string
          platform_fee: number
          product_id: string
          quantity: number
          seller_id: string
          seller_payout: number
          unit_price: number
        }
        Update: {
          commission_pct?: number
          id?: string
          order_id?: string
          platform_fee?: number
          product_id?: string
          quantity?: number
          seller_id?: string
          seller_payout?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          city: string | null
          coupon_code: string | null
          created_at: string
          delivery_fee: number
          discount: number
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          city?: string | null
          coupon_code?: string | null
          created_at?: string
          delivery_fee?: number
          discount?: number
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string | null
          coupon_code?: string | null
          created_at?: string
          delivery_fee?: number
          discount?: number
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          commission_pct: number
          created_at: string
          description: string | null
          description_am: string | null
          id: string
          img: string | null
          name: string
          name_am: string | null
          price: number
          rating: number
          review_count: number
          search_tsv: unknown
          seller_id: string
          slug: string
          stock: number
          tags: string[]
        }
        Insert: {
          category: string
          commission_pct?: number
          created_at?: string
          description?: string | null
          description_am?: string | null
          id: string
          img?: string | null
          name: string
          name_am?: string | null
          price: number
          rating?: number
          review_count?: number
          search_tsv?: unknown
          seller_id: string
          slug: string
          stock?: number
          tags?: string[]
        }
        Update: {
          category?: string
          commission_pct?: number
          created_at?: string
          description?: string | null
          description_am?: string | null
          id?: string
          img?: string | null
          name?: string
          name_am?: string | null
          price?: number
          rating?: number
          review_count?: number
          search_tsv?: unknown
          seller_id?: string
          slug?: string
          stock?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          language: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          language?: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          language?: string
          phone?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved: boolean
          body: string | null
          body_am: string | null
          created_at: string
          id: string
          order_id: string | null
          photo_urls: string[]
          product_id: string
          rating: number
          title: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean
          body?: string | null
          body_am?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          photo_urls?: string[]
          product_id: string
          rating: number
          title?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean
          body?: string | null
          body_am?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          photo_urls?: string[]
          product_id?: string
          rating?: number
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          avatar: string | null
          commission_pct: number
          created_at: string
          dot_class: string | null
          id: string
          name: string
          owner_id: string | null
          phone: string | null
          rating: number
          region: string | null
          since: number | null
          slug: string
          tagline: string | null
          tagline_am: string | null
          verified: boolean
        }
        Insert: {
          avatar?: string | null
          commission_pct?: number
          created_at?: string
          dot_class?: string | null
          id: string
          name: string
          owner_id?: string | null
          phone?: string | null
          rating?: number
          region?: string | null
          since?: number | null
          slug: string
          tagline?: string | null
          tagline_am?: string | null
          verified?: boolean
        }
        Update: {
          avatar?: string | null
          commission_pct?: number
          created_at?: string
          dot_class?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number
          region?: string | null
          since?: number | null
          slug?: string
          tagline?: string | null
          tagline_am?: string | null
          verified?: boolean
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
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          note: string | null
          order_id: string | null
          seller_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          order_id?: string | null
          seller_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          order_id?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          account_details: string | null
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          seller_id: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
        }
        Insert: {
          account_details?: string | null
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method: string
          seller_id: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Update: {
          account_details?: string | null
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "seller" | "customer"
      order_status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
      payment_method: "chapa" | "telebirr" | "cod"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid"
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
      app_role: ["admin", "seller", "customer"],
      order_status: ["pending", "paid", "shipped", "delivered", "cancelled"],
      payment_method: ["chapa", "telebirr", "cod"],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
