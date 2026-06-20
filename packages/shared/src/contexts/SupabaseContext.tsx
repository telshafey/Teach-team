import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseContextType {
  supabaseClient: SupabaseClient | null;
  isLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined,
);

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let globalSupabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  globalSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storage: window.localStorage,
      storageKey: "supabase.auth.bokra.v2", // use custom key to avoid previous locks/bad data
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Disable the native navigator.locks which hangs infinitely in cross-origin iframes
      lock: (name, acquireTimeout, fn) => fn(),
    },
  });
}

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(
    globalSupabaseClient,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!globalSupabaseClient) {
      console.warn(
        "Supabase credentials not found in environment variables. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided.",
      );
    }

    setIsLoading(false);
  }, []);

  const value = {
    supabaseClient,
    isLoading,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};
