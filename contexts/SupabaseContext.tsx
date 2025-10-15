import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SiteSettings } from '../types';
import { initialData } from '../data/initialData';
import { useToast } from './ToastContext';
import { snakeToCamel, camelToSnake } from '../services/apiService';

export interface SupabaseContextType {
  supabaseClient: SupabaseClient | null;
  siteSettings: SiteSettings | null;
  isLoading: boolean;
  currency: string;
  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(initialData.siteSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Supabase client
  useEffect(() => {
    try {
      // Use database settings from static initialData to bootstrap the client.
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
      // AppBootstrap will show a UI error, so a toast is not necessary here.
    }
  }, []);
  
  // Fetch site settings from the database once client is available
  const fetchSiteSettings = useCallback(async (client: SupabaseClient) => {
    setIsLoading(true);
    try {
      const { data, error } = await client
        .from('site_settings')
        .select('*')
        .limit(1); // Use limit(1) instead of single() for robustness

      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // If multiple rows exist, this will just take the first one and prevent a crash.
        setSiteSettings(snakeToCamel(data[0]) as SiteSettings);
      } else {
        // This case is expected on first run of the app with an empty DB.
        console.warn("No site settings found in the database. Using initial static data. You can save settings from the admin page to create the record.");
        setSiteSettings(initialData.siteSettings);
      }
    } catch (error: any) {
      console.error("Failed to fetch site settings:", error);
      addToast(`فشل تحميل إعدادات الموقع: ${error.message}`, 'error');
      // Fallback to static data if fetching fails
      setSiteSettings(initialData.siteSettings);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (supabaseClient) {
      fetchSiteSettings(supabaseClient);

      const channel = supabaseClient
        .channel('site-settings-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, 
            (payload) => {
                if (payload.new) {
                    const newSettings = snakeToCamel(payload.new) as SiteSettings;
                    setSiteSettings(newSettings);
                }
            }
        )
        .subscribe();
      
      return () => {
          supabaseClient.removeChannel(channel);
      }
    } else {
        setIsLoading(false); // No client, so we are not loading.
    }
  }, [supabaseClient, fetchSiteSettings]);

  const handleUpdateSiteSettings = async (settings: SiteSettings) => {
    if (!supabaseClient) {
        throw new Error("Supabase client not available.");
    }
    // Optimistic update
    setSiteSettings(settings);
    
    // The table is a single row, so upsert should have the full object.
    const payload = camelToSnake(settings);
    if (!('id' in payload)) {
        // Assume single row table with id=1
        (payload as any).id = 1;
    }

    const { error } = await supabaseClient
      .from('site_settings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
        // Revert on failure
        addToast(`فشل حفظ الإعدادات: ${error.message}`, 'error');
        fetchSiteSettings(supabaseClient); // Refetch to get the correct state
        throw new Error(error.message);
    }
  };

  const currency = siteSettings?.currency || 'USD';

  const value = {
    supabaseClient,
    siteSettings,
    isLoading,
    currency,
    handleUpdateSiteSettings,
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