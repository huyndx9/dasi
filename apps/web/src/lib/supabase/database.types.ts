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
    };
    Views: { [_ in never]: never };
    Functions: {
      join_class: { Args: { p_invite_code: string; p_mother_tongue: string }; Returns: string };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
    };
    Enums: { user_role: 'teacher' | 'student' | 'admin' };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ClassRow = Database['public']['Tables']['classes']['Row'];
