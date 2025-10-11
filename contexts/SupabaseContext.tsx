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

  const initialize = useCallback(async () => {
    setIsLoading(true);
    try {
        let tempDbSettings: DatabaseSettings | null = null;
        const storedSettingsRaw = localStorage.getItem(SUPABASE_SETTINGS_KEY);
        if (storedSettingsRaw) {
            try {
                const parsed = JSON.parse(storedSettingsRaw);
                tempDbSettings = parsed.databaseSettings || parsed;
            } catch (e) { console.warn("Could not parse stored settings.") }
        }
        if (!tempDbSettings?.supabaseUrl || !tempDbSettings?.supabaseAnonKey) {
            tempDbSettings = initialData.siteSettings.databaseSettings;
        }

        const tempClient = createClient(tempDbSettings.supabaseUrl, tempDbSettings.supabaseAnonKey);
        const { data, error } = await tempClient.from('site_settings').select('settings').eq('id', 1).single();

        let finalSettings: SiteSettings;
        if (error && error.code !== 'PGRST116') { throw error; }
        
        if (data?.settings) {
            const dbSettings = data.settings as Partial<SiteSettings>;
            
            // Validate the settings from the DB. If they are invalid, fall back to the working temp settings.
            let validDbConnectionSettings = dbSettings.databaseSettings;
            if (!validDbConnectionSettings || !validDbConnectionSettings.supabaseUrl || !validDbConnectionSettings.supabaseAnonKey) {
                console.warn("Incomplete database settings found in DB. Falling back to last known good configuration.");
                validDbConnectionSettings = tempDbSettings; 
            }

            finalSettings = {
                ...initialData.siteSettings,
                ...dbSettings,
                databaseSettings: {
                    ...initialData.siteSettings.databaseSettings,
                    ...validDbConnectionSettings,
                },
            };
        } else {
            finalSettings = initialData.siteSettings;
            const { error: insertError } = await tempClient.from('site_settings').upsert({ id: 1, settings: finalSettings });
            if (insertError) throw insertError;
        }
        
        let finalClient = tempClient;
        const finalDbSettings = finalSettings.databaseSettings;
        if (finalDbSettings.supabaseUrl !== tempDbSettings.supabaseUrl || finalDbSettings.supabaseAnonKey !== tempDbSettings.supabaseAnonKey) {
            finalClient = createClient(finalDbSettings.supabaseUrl, finalDbSettings.supabaseAnonKey);
        }
        
        setSiteSettings(finalSettings);
        setSupabaseClient(finalClient);
        localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(finalSettings));
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
      setSiteSettings(settings);
      localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(settings));

      addToast('تم تحديث الإعدادات بنجاح.', 'success');
      
      const oldDbSettings = siteSettings?.databaseSettings;
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