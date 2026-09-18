import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Ecosystem = Database["public"]["Tables"]["ecosystems"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
