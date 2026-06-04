import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseContextType {
  supabaseClient: SupabaseClient | null;
  isLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let globalSupabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  globalSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storage: window.localStorage,
      storageKey: 'supabase.auth.bokra.v2', // use custom key to avoid previous locks/bad data
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Disable the native navigator.locks which hangs infinitely in cross-origin iframes
      lock: async (name, acquireTimeout, fn) => await fn(),
    }
  });
}

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(globalSupabaseClient);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!globalSupabaseClient) {
      console.warn("Supabase credentials not found in environment variables. Falling back to mock client.");
      // Return a completely fake offline client if no credentials
      const fakeClient = {
        from: () => {
          const queryBuilder: any = {
             select: () => queryBuilder,
             insert: () => queryBuilder,
             update: () => queryBuilder,
             delete: () => queryBuilder,
             upsert: () => queryBuilder,
             eq: () => queryBuilder,
             neq: () => queryBuilder,
             in: () => queryBuilder,
             order: () => queryBuilder,
             limit: () => queryBuilder,
             range: () => queryBuilder,
             single: () => Promise.resolve({ data: null, error: null }),
             maybeSingle: () => Promise.resolve({ data: null, error: null }),
             then: (resolve: any) => resolve({ data: [], error: null }),
          };
          return queryBuilder;
        },
        channel: () => ({ on: () => ({ subscribe: () => {} }) }),
        removeChannel: () => {},
        auth: {
          getSession: () => Promise.resolve({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: () => Promise.resolve(),
        },
        rpc: () => Promise.resolve({ data: null, error: null })
      } as unknown as SupabaseClient;

      setSupabaseClient(fakeClient);
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
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};