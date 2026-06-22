import { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseStore } from "../stores/supabaseStore";

export interface SupabaseContextType {
  supabaseClient: SupabaseClient | null;
  isLoading: boolean;
}

export const useSupabase = (): SupabaseContextType => {
  const supabaseClient = useSupabaseStore((state) => state.supabaseClient);
  return {
    supabaseClient,
    isLoading: false,
  };
};

