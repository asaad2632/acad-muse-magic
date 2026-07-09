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
      allowed_users: {
        Row: {
          created_at: string
          email: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      bibliography: {
        Row: {
          added_at: string | null
          author: string | null
          bib_entry: string | null
          category: string | null
          client_id: string | null
          created_at: string
          doc_id: string | null
          id: string
          section: string | null
          sort_key: string | null
          title: string | null
          updated_at: string
          user_id: string | null
          year: string | null
        }
        Insert: {
          added_at?: string | null
          author?: string | null
          bib_entry?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          doc_id?: string | null
          id?: string
          section?: string | null
          sort_key?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          year?: string | null
        }
        Update: {
          added_at?: string | null
          author?: string | null
          bib_entry?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          doc_id?: string | null
          id?: string
          section?: string | null
          sort_key?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          year?: string | null
        }
        Relationships: []
      }
      cards: {
        Row: {
          ai_content: string | null
          chapter_id: number | null
          client_id: string | null
          created_at: string
          date: string | null
          id: string
          notes: string | null
          related_doc_ids: string[] | null
          section_id: string | null
          tags: string[] | null
          title: string | null
          topic: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_content?: string | null
          chapter_id?: number | null
          client_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          notes?: string | null
          related_doc_ids?: string[] | null
          section_id?: string | null
          tags?: string[] | null
          title?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_content?: string | null
          chapter_id?: number | null
          client_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          notes?: string | null
          related_doc_ids?: string[] | null
          section_id?: string | null
          tags?: string[] | null
          title?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          chapter_id: number
          color: string | null
          created_at: string
          id: string
          sections: Json | null
          title_ar: string | null
          user_id: string | null
        }
        Insert: {
          chapter_id: number
          color?: string | null
          created_at?: string
          id?: string
          sections?: Json | null
          title_ar?: string | null
          user_id?: string | null
        }
        Update: {
          chapter_id?: number
          color?: string | null
          created_at?: string
          id?: string
          sections?: Json | null
          title_ar?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      custom_formats: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          name: string | null
          templates: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          templates?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          templates?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deleted_base_docs: {
        Row: {
          base_doc_id: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          base_doc_id: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          base_doc_id?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      library_sources: {
        Row: {
          analyzed: boolean | null
          author: string | null
          chapter_id: number | null
          client_id: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          how_to_use: string | null
          id: string
          important_pages: string | null
          key_points: Json | null
          keywords: string[] | null
          language: string | null
          notes: string | null
          priority: string | null
          section_id: string | null
          source_type: string | null
          status: string | null
          storage_path: string | null
          sub_section_id: string | null
          summary: string | null
          title: string | null
          updated_at: string
          upload_date: string | null
          user_id: string | null
          why_important: string | null
          year: string | null
        }
        Insert: {
          analyzed?: boolean | null
          author?: string | null
          chapter_id?: number | null
          client_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          how_to_use?: string | null
          id?: string
          important_pages?: string | null
          key_points?: Json | null
          keywords?: string[] | null
          language?: string | null
          notes?: string | null
          priority?: string | null
          section_id?: string | null
          source_type?: string | null
          status?: string | null
          storage_path?: string | null
          sub_section_id?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          upload_date?: string | null
          user_id?: string | null
          why_important?: string | null
          year?: string | null
        }
        Update: {
          analyzed?: boolean | null
          author?: string | null
          chapter_id?: number | null
          client_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          how_to_use?: string | null
          id?: string
          important_pages?: string | null
          key_points?: Json | null
          keywords?: string[] | null
          language?: string | null
          notes?: string | null
          priority?: string | null
          section_id?: string | null
          source_type?: string | null
          status?: string | null
          storage_path?: string | null
          sub_section_id?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          upload_date?: string | null
          user_id?: string | null
          why_important?: string | null
          year?: string | null
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      researcher_analysis: {
        Row: {
          chapter_id: number | null
          content: string | null
          created_at: string
          id: string
          section_id: string | null
          updated_at: string
          user_id: string | null
          version: number | null
        }
        Insert: {
          chapter_id?: number | null
          content?: string | null
          created_at?: string
          id?: string
          section_id?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number | null
        }
        Update: {
          chapter_id?: number | null
          content?: string | null
          created_at?: string
          id?: string
          section_id?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          access_date: string | null
          archive_ref: string | null
          author: string | null
          category: string | null
          chapter_id: number | null
          client_id: string | null
          college: string | null
          created_at: string
          degree: string | null
          edition: string | null
          id: string
          institution: string | null
          is_new: boolean | null
          issue: string | null
          journal: string | null
          newspaper: string | null
          notes: string | null
          pages: string | null
          place: string | null
          priority: string | null
          publisher: string | null
          section_id: string | null
          source_type: string | null
          status: string | null
          title: string | null
          university: string | null
          url: string | null
          user_id: string | null
          volume: string | null
          year: string | null
        }
        Insert: {
          access_date?: string | null
          archive_ref?: string | null
          author?: string | null
          category?: string | null
          chapter_id?: number | null
          client_id?: string | null
          college?: string | null
          created_at?: string
          degree?: string | null
          edition?: string | null
          id?: string
          institution?: string | null
          is_new?: boolean | null
          issue?: string | null
          journal?: string | null
          newspaper?: string | null
          notes?: string | null
          pages?: string | null
          place?: string | null
          priority?: string | null
          publisher?: string | null
          section_id?: string | null
          source_type?: string | null
          status?: string | null
          title?: string | null
          university?: string | null
          url?: string | null
          user_id?: string | null
          volume?: string | null
          year?: string | null
        }
        Update: {
          access_date?: string | null
          archive_ref?: string | null
          author?: string | null
          category?: string | null
          chapter_id?: number | null
          client_id?: string | null
          college?: string | null
          created_at?: string
          degree?: string | null
          edition?: string | null
          id?: string
          institution?: string | null
          is_new?: boolean | null
          issue?: string | null
          journal?: string | null
          newspaper?: string | null
          notes?: string | null
          pages?: string | null
          place?: string | null
          priority?: string | null
          publisher?: string | null
          section_id?: string | null
          source_type?: string | null
          status?: string | null
          title?: string | null
          university?: string | null
          url?: string | null
          user_id?: string | null
          volume?: string | null
          year?: string | null
        }
        Relationships: []
      }
      supervisor_decisions: {
        Row: {
          client_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          date: string | null
          decision_type: string | null
          id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          decision_type?: string | null
          id?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          decision_type?: string | null
          id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_files: {
        Row: {
          chapter: string | null
          client_id: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          note: string | null
          status: string | null
          storage_path: string | null
          updated_at: string
          upload_date: string | null
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          chapter?: string | null
          client_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          note?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string
          upload_date?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          chapter?: string | null
          client_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          note?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string
          upload_date?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      supervisor_meetings: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          decisions: string | null
          id: string
          location: string | null
          meeting_date: string | null
          next_meeting_date: string | null
          next_requirements: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          id?: string
          location?: string | null
          meeting_date?: string | null
          next_meeting_date?: string | null
          next_requirements?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          id?: string
          location?: string | null
          meeting_date?: string | null
          next_meeting_date?: string | null
          next_requirements?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_notes: {
        Row: {
          chapter: string | null
          client_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          date: string | null
          done: boolean | null
          id: string
          note_type: string | null
          section: string | null
          updated_at: string
        }
        Insert: {
          chapter?: string | null
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          done?: boolean | null
          id?: string
          note_type?: string | null
          section?: string | null
          updated_at?: string
        }
        Update: {
          chapter?: string | null
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          done?: boolean | null
          id?: string
          note_type?: string | null
          section?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_questions: {
        Row: {
          chapter: string | null
          client_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          date: string | null
          id: string
          note_type: string | null
          priority: string | null
          status: string | null
          student_reply: string | null
          updated_at: string
        }
        Insert: {
          chapter?: string | null
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          note_type?: string | null
          priority?: string | null
          status?: string | null
          student_reply?: string | null
          updated_at?: string
        }
        Update: {
          chapter?: string | null
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          note_type?: string | null
          priority?: string | null
          status?: string | null
          student_reply?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      supervisor_reports: {
        Row: {
          client_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          saved_at: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          saved_at?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          saved_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          client_id: string | null
          created_at: string
          doc_meta: Json | null
          file_name: string | null
          id: string
          key_points: Json | null
          original_text: string | null
          saved_at: string | null
          translation: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          doc_meta?: Json | null
          file_name?: string | null
          id?: string
          key_points?: Json | null
          original_text?: string | null
          saved_at?: string | null
          translation?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          doc_meta?: Json | null
          file_name?: string | null
          id?: string
          key_points?: Json | null
          original_text?: string | null
          saved_at?: string | null
          translation?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_allowed: { Args: never; Returns: boolean }
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
