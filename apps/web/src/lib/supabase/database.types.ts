// Mirrors supabase/migrations. Regenerate with
// `supabase gen types typescript --project-id <ref> > apps/web/src/lib/supabase/database.types.ts`
// once the CLI can reach the project, and keep this file in sync with every migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          role: Database['public']['Enums']['user_role'] | null;
          mother_tongue: string | null;
          ui_lang: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          role?: Database['public']['Enums']['user_role'] | null;
          mother_tongue?: string | null;
          ui_lang?: string;
        };
        Update: {
          display_name?: string;
          role?: Database['public']['Enums']['user_role'] | null;
          mother_tongue?: string | null;
          ui_lang?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          teacher_id: string;
          name: string;
          level: string | null;
          schedule: string | null;
          textbook: string | null;
          invite_code: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id?: string;
          name: string;
          level?: string | null;
          schedule?: string | null;
          textbook?: string | null;
          invite_code?: string;
          settings?: Json;
        };
        Update: {
          name?: string;
          level?: string | null;
          schedule?: string | null;
          textbook?: string | null;
          settings?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'classes_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      class_members: {
        Row: {
          class_id: string;
          student_id: string;
          mother_tongue: string;
          consented_at: string;
          joined_at: string;
        };
        Insert: {
          class_id: string;
          student_id: string;
          mother_tongue: string;
          consented_at: string;
        };
        Update: {
          mother_tongue?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_members_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_members_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          class_id: string;
          title: string;
          topic: string | null;
          textbook: string | null;
          format: Database['public']['Enums']['lesson_format'];
          sources: Database['public']['Enums']['audio_source'][];
          target_langs: string[];
          display: Database['public']['Enums']['subtitle_display'];
          status: Database['public']['Enums']['lesson_status'];
          started_at: string;
          ended_at: string | null;
          audio_path: string | null;
          processing_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          title: string;
          topic?: string | null;
          textbook?: string | null;
          format: Database['public']['Enums']['lesson_format'];
          sources: Database['public']['Enums']['audio_source'][];
          target_langs?: string[];
          display?: Database['public']['Enums']['subtitle_display'];
          status?: Database['public']['Enums']['lesson_status'];
          started_at?: string;
          ended_at?: string | null;
          audio_path?: string | null;
          processing_error?: string | null;
        };
        Update: {
          title?: string;
          topic?: string | null;
          textbook?: string | null;
          display?: Database['public']['Enums']['subtitle_display'];
          status?: Database['public']['Enums']['lesson_status'];
          ended_at?: string | null;
          audio_path?: string | null;
          processing_error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
      };
      segments: {
        Row: {
          id: string;
          lesson_id: string;
          seq: number;
          source: Database['public']['Enums']['audio_source'];
          speaker_label: string | null;
          speaker_profile_id: string | null;
          lang: string;
          text: string;
          start_ms: number;
          end_ms: number;
          edited: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          seq: number;
          source: Database['public']['Enums']['audio_source'];
          speaker_label?: string | null;
          speaker_profile_id?: string | null;
          lang?: string;
          text: string;
          start_ms: number;
          end_ms: number;
          edited?: boolean;
        };
        Update: {
          speaker_label?: string | null;
          speaker_profile_id?: string | null;
          text?: string;
          edited?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'segments_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'segments_speaker_profile_id_fkey';
            columns: ['speaker_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      segment_translations: {
        Row: { segment_id: string; lang: string; text: string };
        Insert: { segment_id: string; lang: string; text: string };
        Update: { text?: string };
        Relationships: [
          {
            foreignKeyName: 'segment_translations_segment_id_fkey';
            columns: ['segment_id'];
            isOneToOne: false;
            referencedRelation: 'segments';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_summaries: {
        Row: { lesson_id: string; lang: string; text: string; edited: boolean };
        Insert: { lesson_id: string; lang: string; text: string; edited?: boolean };
        Update: { text?: string; edited?: boolean };
        Relationships: [
          {
            foreignKeyName: 'lesson_summaries_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      vocab_items: {
        Row: {
          id: string;
          lesson_id: string;
          position: number;
          ko: string;
          pos: Database['public']['Enums']['part_of_speech'];
          topik_level: number | null;
          example_ko: string | null;
          segment_id: string | null;
          edited: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          position: number;
          ko: string;
          pos?: Database['public']['Enums']['part_of_speech'];
          topik_level?: number | null;
          example_ko?: string | null;
          segment_id?: string | null;
          edited?: boolean;
        };
        Update: {
          position?: number;
          ko?: string;
          pos?: Database['public']['Enums']['part_of_speech'];
          topik_level?: number | null;
          example_ko?: string | null;
          segment_id?: string | null;
          edited?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'vocab_items_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vocab_items_segment_id_fkey';
            columns: ['segment_id'];
            isOneToOne: false;
            referencedRelation: 'segments';
            referencedColumns: ['id'];
          },
        ];
      };
      vocab_translations: {
        Row: { vocab_id: string; lang: string; meaning: string };
        Insert: { vocab_id: string; lang: string; meaning: string };
        Update: { meaning?: string };
        Relationships: [
          {
            foreignKeyName: 'vocab_translations_vocab_id_fkey';
            columns: ['vocab_id'];
            isOneToOne: false;
            referencedRelation: 'vocab_items';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      join_class: { Args: { p_invite_code: string; p_mother_tongue: string }; Returns: string };
      is_lesson_teacher: { Args: { p_lesson_id: string }; Returns: boolean };
      can_read_lesson: { Args: { p_lesson_id: string }; Returns: boolean };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
    };
    Enums: {
      user_role: 'teacher' | 'student' | 'admin';
      lesson_format: 'room' | 'online' | 'hybrid';
      audio_source: 'mic' | 'tab';
      lesson_status: 'live' | 'processing' | 'review' | 'published';
      subtitle_display: 'bilingual' | 'korean_only' | 'hidden';
      part_of_speech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'expression' | 'grammar' | 'other';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ClassRow = Database['public']['Tables']['classes']['Row'];
export type LessonRow = Database['public']['Tables']['lessons']['Row'];
export type SegmentRow = Database['public']['Tables']['segments']['Row'];
