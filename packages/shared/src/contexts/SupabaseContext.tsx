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

  useEffect(() => {
    const initializeClient = async () => {
      const initialSettings = initialData.siteSettings.databaseSettings;
      let finalUrl = initialSettings.supabaseUrl;
      let finalKey = initialSettings.supabaseAnonKey;

      if (!finalUrl || !finalKey) {
        console.error("Initial Supabase credentials are not defined in initialData.ts. Cannot proceed.");
        setIsLoading(false);
        return;
      }

      try {
        // Use fetch to get dynamic settings without creating a temp Supabase client.
        // This assumes the site_settings table is readable by anon key.
        const response = await fetch(`${initialSettings.supabaseUrl}/rest/v1/site_settings?select=database_settings&limit=1`, {
          headers: {
            'apikey': initialSettings.supabaseAnonKey,
            'Authorization': `Bearer ${initialSettings.supabaseAnonKey}`
          }
        });

        if (!response.ok) {
            // Don't throw, just log and fall back.
            console.log(`Could not fetch dynamic settings (status: ${response.status}). Using initial data as fallback.`);
        } else {
            const settingsData = await response.json();
            
            if (settingsData && settingsData.length > 0 && settingsData[0].database_settings) {
              const dbSettings = settingsData[0].database_settings;
              // The REST API might return snake_case keys. Check for both cases for robustness.
              const dynamicUrl = dbSettings.supabaseUrl || dbSettings.supabase_url;
              const dynamicKey = dbSettings.supabaseAnonKey || dbSettings.supabase_anon_key;

              if (dynamicUrl && dynamicKey) {
                finalUrl = dynamicUrl;
                finalKey = dynamicKey;
              } else {
                console.log("Dynamic DB settings found but are invalid. Using initial data as fallback.");
              }
            } else {
              console.log("No dynamic DB settings found in 'site_settings' table. Using initial data as fallback.");
            }
        }
      } catch (error: any) {
        console.error("Failed to fetch DB settings, falling back to initialData. Error:", error.message);
      } finally {
        // Create the client only ONCE with the final determined credentials.
        const client = createClient(finalUrl, finalKey);
        setSupabaseClient(client);
        setIsLoading(false);
      }
    };
    
    initializeClient();
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