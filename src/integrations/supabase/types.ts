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
      media_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
        }
        Relationships: []
      }
      queue_state: {
        Row: {
          created_at: string
          cs_queue: number
          cs_serving: number
          cs_status: string
          id: string
          last_called_at: string | null
          last_called_number: number | null
          last_called_type: string | null
          last_reset_date: string
          teller_queue: number
          teller_serving: number
          teller_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cs_queue?: number
          cs_serving?: number
          cs_status?: string
          id?: string
          last_called_at?: string | null
          last_called_number?: number | null
          last_called_type?: string | null
          last_reset_date?: string
          teller_queue?: number
          teller_serving?: number
          teller_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cs_queue?: number
          cs_serving?: number
          cs_status?: string
          id?: string
          last_called_at?: string | null
          last_called_number?: number | null
          last_called_type?: string | null
          last_reset_date?: string
          teller_queue?: number
          teller_serving?: number
          teller_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tv_display_config: {
        Row: {
          created_at: string
          id: string
          layout: string
          media_mode: string
          media_type: string
          media_url: string | null
          running_text: string | null
          running_text_bg_color: string
          running_text_color: string
          running_text_speed: string
          show_media: boolean
          show_running_text: boolean
          slideshow_animation: string
          slideshow_images: Json | null
          slideshow_interval: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout?: string
          media_mode?: string
          media_type?: string
          media_url?: string | null
          running_text?: string | null
          running_text_bg_color?: string
          running_text_color?: string
          running_text_speed?: string
          show_media?: boolean
          show_running_text?: boolean
          slideshow_animation?: string
          slideshow_images?: Json | null
          slideshow_interval?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: string
          media_mode?: string
          media_type?: string
          media_url?: string | null
          running_text?: string | null
          running_text_bg_color?: string
          running_text_color?: string
          running_text_speed?: string
          show_media?: boolean
          show_running_text?: boolean
          slideshow_animation?: string
          slideshow_images?: Json | null
          slideshow_interval?: number
          updated_at?: string
        }
        Relationships: []
      }
      voice_config: {
        Row: {
          created_at: string
          custom_audio_phrases: Json
          id: string
          pronunciations: Json
          speed: string
          updated_at: string
          use_custom_audio: boolean
          voice_name: string
        }
        Insert: {
          created_at?: string
          custom_audio_phrases?: Json
          id?: string
          pronunciations?: Json
          speed?: string
          updated_at?: string
          use_custom_audio?: boolean
          voice_name?: string
        }
        Update: {
          created_at?: string
          custom_audio_phrases?: Json
          id?: string
          pronunciations?: Json
          speed?: string
          updated_at?: string
          use_custom_audio?: boolean
          voice_name?: string
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
