import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { initialData } from '../data/initialData';

export interface SupabaseContextType {
  supabaseClient: SupabaseClient | null;
  isLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Supabase client
  useEffect(() => {
    try {
      const { supabaseUrl, supabaseAnonKey } = initialData.siteSettings.databaseSettings;
      if (supabaseUrl && supabaseAnonKey) {
        const client = createClient(supabaseUrl, supabaseAnonKey);
        setSupabaseClient(client);
      } else {
        throw new Error("Supabase URL or Anon Key is missing in initialData.");
      }
    } catch (error: any) {
      console.error("Failed to initialize Supabase client:", error);
      setSupabaseClient(null);
    } finally {
        setIsLoading(false);
    }
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
