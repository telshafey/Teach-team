import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SiteSettings } from '../types';
import { useSupabase } from './SupabaseContext';
import * as api from '../services/apiService';
import { initialData } from '../data/initialData';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useRealtime } from './RealtimeContext';

export interface SettingsContextType {
  siteSettings: SiteSettings | null;
  currency: string;
  handleUpdateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { subscribe } = useRealtime();
  const queryClient = useQueryClient();

  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ['site_settings'],
    queryFn: async () => {
      if (!supabaseClient) throw new Error("Supabase client not available");
      const { data, error } = await supabaseClient.from('site_settings').select('*').limit(1).single();
      if (error && error.code !== 'PGRST116' && error.code !== '42P01' && error.code !== 'PGRST205') {
        setTimeout(() => alert('Error loading site settings: ' + error.message), 1000);
        throw error;
      }
      if (!data) {
        // setTimeout(() => alert('No site settings found in DB! Falling back to defaults.'), 1000);
      }
      
      const parsedData = data ? api.keysToCamel(data) as any : initialData.siteSettings as any;
      
      // Load geminiApiKey from meetingSettings to avoid schema column missing issues
      if (parsedData.meetingSettings && parsedData.meetingSettings.geminiApiKey) {
        parsedData.geminiApiKey = parsedData.meetingSettings.geminiApiKey;
      }
      
      return parsedData as SiteSettings;
    },
    enabled: !!supabaseClient && !!currentUser,
    staleTime: Infinity, // Settings don't change often, rely on realtime for updates
  });

  useEffect(() => {
    const handleSettingsChange = (payload: any) => {
      if (payload.eventType === 'UPDATE' && payload.table === 'site_settings' && payload.new.id === '1') {
        queryClient.invalidateQueries({ queryKey: ['site_settings'] });
      }
    };
    const unsubscribe = subscribe('site_settings', handleSettingsChange);
    return () => { unsubscribe(); };
  }, [subscribe, queryClient]);

  const updateMutation = useMutation({
    mutationFn: (settings: Partial<SiteSettings>) => {
      if (!supabaseClient) throw new Error("Supabase client not available");
      
      const payloadToSave: any = { ...settings };
      
      // Pack geminiApiKey into meetingSettings to bypass missing DB column
      if ('geminiApiKey' in payloadToSave) {
         const currentSettings = queryClient.getQueryData<SiteSettings>(['site_settings']);
         payloadToSave.meetingSettings = {
           ...(currentSettings?.meetingSettings || {}),
           geminiApiKey: payloadToSave.geminiApiKey
         };
         delete payloadToSave.geminiApiKey;
      }
      
      return api.update<SiteSettings>(supabaseClient, 'site_settings', '1', payloadToSave);
    },
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ['site_settings'] });
      const previousSettings = queryClient.getQueryData<SiteSettings>(['site_settings']);
      queryClient.setQueryData<SiteSettings>(['site_settings'], old => ({ ...old!, ...newSettings }));
      return { previousSettings };
    },
    onError: (err: any, newSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['site_settings'], context.previousSettings);
      }
      addToast(err.message || 'فشل حفظ الإعدادات. يرجى المحاولة مرة أخرى.', 'error');
    },
    onSuccess: () => {
      addToast('تم حفظ الإعدادات بنجاح.', 'success');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['site_settings'] });
    },
  });

  const handleUpdateSiteSettings = useCallback(async (settings: Partial<SiteSettings>) => {
    await updateMutation.mutateAsync(settings);
  }, [updateMutation]);

  const currency = siteSettings?.currency || 'USD';
  
  const value = { siteSettings: siteSettings || null, currency, handleUpdateSiteSettings };

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
