import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { initialData } from '../data/initialData';
import { DatabaseSettings, SiteSettings } from '../types';
import * as api from '../services/apiService';
import { useToast } from './ToastContext';

const SUPABASE_SETTINGS_KEY = 'supabase_settings';

export interface SupabaseContextType {
  supabaseClient: SupabaseClient | null;
  siteSettings: SiteSettings | null;
  isLoading: boolean;
  currency: string;
  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  const initialize = useCallback(() => {
    setIsLoading(true);
    try {
        let settings: SiteSettings | null = null;
        const storedSettingsRaw = localStorage.getItem(SUPABASE_SETTINGS_KEY);
        
        if (storedSettingsRaw) {
            try {
                // Try to parse settings from local storage
                settings = JSON.parse(storedSettingsRaw) as SiteSettings;
            } catch (e) {
                console.warn("Could not parse stored settings, falling back to initial data.", e);
                localStorage.removeItem(SUPABASE_SETTINGS_KEY);
            }
        }
        
        // If no valid settings from storage, use initial data
        if (!settings) {
            settings = initialData.siteSettings;
            localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(settings));
        }

        const dbSettings = settings.databaseSettings;

        // Final validation before creating the client
        if (!dbSettings || !dbSettings.supabaseUrl || !dbSettings.supabaseAnonKey) {
            // If settings are fundamentally broken, reset to initial and try again.
            console.error("Supabase URL or Anon Key is missing. Resetting to initial settings.");
            localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(initialData.siteSettings));
            settings = initialData.siteSettings;
            if (!settings.databaseSettings.supabaseUrl || !settings.databaseSettings.supabaseAnonKey) {
                 throw new Error("Initial Supabase settings are also invalid.");
            }
        }

        const client = createClient(
            settings.databaseSettings.supabaseUrl, 
            settings.databaseSettings.supabaseAnonKey,
            { global: { fetch: window.fetch } }
        );
        
        setSiteSettings(settings);
        setSupabaseClient(client);

    } catch (error: any) {
        console.error('CRITICAL: Supabase initialization failed.', error);
        addToast(`فشل تهيئة التطبيق: ${error.message}`, 'error');
        setSiteSettings(null);
        setSupabaseClient(null);
    } finally {
        setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // This effect will run after initialization and sync settings from the database
  // without interfering with the currently running client.
   useEffect(() => {
    if (!supabaseClient) return;

    const syncSettingsFromDb = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('site_settings')
                .select('settings')
                .eq('id', 1)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
                throw error;
            }

            if (data?.settings) {
                const dbSettings = data.settings as SiteSettings;
                // Update local state for non-critical changes if they differ
                if (JSON.stringify(dbSettings) !== JSON.stringify(siteSettings)) {
                    console.log("Settings in DB differ from local state. Updating state and localStorage.");
                    setSiteSettings(dbSettings);
                    localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(dbSettings));
                }
            } else if (!error) {
                // No settings found in DB, so let's upload the initial ones
                 await supabaseClient.from('site_settings').upsert({ id: 1, settings: initialData.siteSettings });
            }
        } catch (error: any) {
            console.warn("Could not sync settings from DB:", error.message);
            // Don't show a toast for this, it's a background sync.
        }
    };
    
    syncSettingsFromDb();

  }, [supabaseClient, siteSettings]);


  const handleUpdateSiteSettings = async (settings: SiteSettings) => {
    if (!supabaseClient) throw new Error("Supabase client is not available.");
    
    try {
      // The table has a single row with id=1. We update the 'settings' column of that row.
      const { data, error } = await supabaseClient
        .from('site_settings')
        .update({ settings: settings }) // The payload is the whole settings object for the 'settings' jsonb column
        .eq('id', 1)
        .select()
        .single();
        
      if (error) throw error;
      if (!data) throw new Error("لم يتم العثور على سجل الإعدادات في قاعدة البيانات. فشل التحديث.");

      // On successful DB update, update the state and localStorage
      const oldDbSettings = siteSettings?.databaseSettings;
      
      setSiteSettings(settings);
      localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(settings));

      addToast('تم تحديث الإعدادات بنجاح.', 'success');
      
      const newDbSettings = settings.databaseSettings;

      if (oldDbSettings && (oldDbSettings.supabaseUrl !== newDbSettings.supabaseUrl || oldDbSettings.supabaseAnonKey !== newDbSettings.supabaseAnonKey)) {
          addToast('تم تحديث إعدادات الاتصال. سيتم إعادة تحميل الصفحة.', 'info');
          setTimeout(() => window.location.reload(), 2000);
      }
    } catch (error: any) {
      // No need to revert state since we didn't update it optimistically
      addToast(`فشل تحديث الإعدادات: ${error.message}`, 'error');
      throw error;
    }
  };

  const currency = siteSettings?.currency || initialData.siteSettings.currency;

  const value = { supabaseClient, siteSettings, isLoading, currency, handleUpdateSiteSettings };

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