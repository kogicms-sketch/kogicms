// Permissive replacement for the auto-generated Supabase types. The Lovable
// Cloud schema is empty for this project (real data lives in an external
// Supabase project), so the generated `Tables<T>` resolves to `never` and
// breaks every typed query/row access. This file is wired in via tsconfig
// `paths` + vite alias to override `@/integrations/supabase/loose-types`.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type AnyRow = { [key: string]: any };

export type Database = {
  public: {
    Tables: { [key: string]: { Row: AnyRow; Insert: AnyRow; Update: AnyRow; Relationships: [] } };
    Views: { [key: string]: { Row: AnyRow; Relationships: [] } };
    Functions: { [key: string]: { Args: AnyRow; Returns: any } };
    Enums: { [key: string]: string };
    CompositeTypes: { [key: string]: AnyRow };
  };
};

export type Tables<_T extends string = string> = AnyRow;
export type TablesInsert<_T extends string = string> = AnyRow;
export type TablesUpdate<_T extends string = string> = AnyRow;
export type Enums<_T extends string = string> = string;
export type CompositeTypes<_T extends string = string> = AnyRow;

export const Constants = { public: { Enums: {} } } as const;
