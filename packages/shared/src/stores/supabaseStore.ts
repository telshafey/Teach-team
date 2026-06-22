import { create } from "zustand";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface SupabaseState {
  supabaseClient: SupabaseClient | null;
}

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let globalSupabaseClient: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  globalSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storage: window.localStorage,
      storageKey: "supabase.auth.bokra.v2",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: (name, acquireTimeout, fn) => fn(),
    },
  });
}

export const useSupabaseStore = create<SupabaseState>()(() => ({
  supabaseClient: globalSupabaseClient,
}));

export const getSupabaseClient = () => globalSupabaseClient;

