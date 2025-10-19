import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { SiteSettings } from '../types';
import { useSupabase } from './SupabaseContext';
import * as api from '../services/apiService';
import { initialData } from '../data/initialData';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export interface SettingsContextType {
  siteSettings: SiteSettings | null;
  currency: string;
  handleUpdateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(initialData.siteSettings);
  const { addToast } = useToast();
  
  useEffect(() => {
    if (!supabaseClient || !currentUser) return;
    
    const fetchSettings = async () => {
        try {
            const { data, error } = await supabaseClient.from('site_settings').select('*').limit(1).single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116: Not found, which is ok
            
            if (data) {
                setSiteSettings(api.keysToCamel(data));
            } else {
                 console.log("No site settings found in DB, using initial data.");
                 setSiteSettings(initialData.siteSettings);
            }
        } catch (error) {
            console.error("Failed to fetch site settings, using initial data:", error);
            setSiteSettings(initialData.siteSettings);
        }
    };
    fetchSettings();

    const channel = supabaseClient.channel('public:site_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: 'id=eq.1' }, payload => {
          setSiteSettings(api.keysToCamel(payload.new));
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };

  }, [supabaseClient, currentUser]);


  const handleUpdateSiteSettings = useCallback(async (settings: Partial<SiteSettings>) => {
    if (!supabaseClient || !siteSettings) {
        const error = new Error("Supabase client not available or settings not loaded");
        addToast(error.message, 'error');
        throw error;
    }
    try {
        await api.update<SiteSettings>(supabaseClient, 'site_settings', '1', settings);
    } catch (error: any) {
        console.error("Failed to update site settings:", error);
        addToast(error.message || 'فشل حفظ الإعدادات. يرجى المحاولة مرة أخرى.', 'error');
        throw error;
    }
  }, [supabaseClient, siteSettings, addToast]);

  const currency = siteSettings?.currency || 'USD';
  
  const value = { siteSettings, currency, handleUpdateSiteSettings };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};
