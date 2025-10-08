import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { initialData } from '../data/initialData';
import { DatabaseSettings } from '../types';

const SUPABASE_SETTINGS_KEY = 'supabase_settings';

interface SupabaseContextType {
  supabaseClient: SupabaseClient | null;
  isLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapClient = async () => {
      setIsLoading(true);
      let settings: DatabaseSettings | null = null;

      // 1. Get initial settings from localStorage or fallback
      try {
        const stored = localStorage.getItem(SUPABASE_SETTINGS_KEY);
        if (stored) {
          settings = JSON.parse(stored);
        }
      } catch (e) {
        console.warn("Could not parse settings from localStorage", e);
      }

      if (!settings) {
        settings = initialData.siteSettings.databaseSettings;
      }

      if (!settings?.supabaseUrl || !settings?.supabaseAnonKey) {
        console.error("FATAL: Supabase credentials not found.");
        setIsLoading(false);
        return;
      }

      // 2. Create ONE client instance with the best-known settings
      const client = createClient(settings.supabaseUrl, settings.supabaseAnonKey);

      // 3. Use this client to verify the canonical settings from the DB
      const { data, error } = await client.from('site_settings').select('settings').eq('id', 1).single();

      if (error) {
        console.warn('Could not fetch canonical site settings from DB, proceeding with potentially stale settings. Error:', error.message);
      } else if (data?.settings?.databaseSettings) {
        const canonicalSettings = data.settings.databaseSettings as DatabaseSettings;

        // 4. If settings are out of sync, update storage and reload the page.
        // This ensures the entire app starts fresh with the correct client.
        if (JSON.stringify(canonicalSettings) !== JSON.stringify(settings)) {
          console.log("Supabase settings are out of sync. Updating and reloading.");
          localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(canonicalSettings));
          window.location.reload();
          // Don't proceed to set the client, as the page will reload
          return;
        }
      }

      // 5. Settings are verified. Set the one-and-only client and finish loading.
      setSupabaseClient(client);
      setIsLoading(false);
    };

    bootstrapClient();

    // This effect should run only once on application mount.
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabaseClient, isLoading }}>
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