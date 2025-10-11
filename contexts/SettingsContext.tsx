import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabase } from './SupabaseContext';
import { SiteSettings } from '../types';

// The exposed type is aliased for backward compatibility with consuming contexts like DataContext.
export interface SettingsContextType {
  siteSettings: SiteSettings | null;
  isLoading: boolean;
  currency: string;
  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
  // fetchData is no longer part of this context's public interface.
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// This Provider is now just a pass-through wrapper. The real work is done in SupabaseProvider,
// which must be an ancestor in the component tree.
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// The hook is now a proxy to useSupabase.
// This prevents us from having to refactor every component that relies on `useSettingsContext`,
// acting as an adapter to the new underlying implementation.
export const useSettingsContext = (): SettingsContextType => {
  const supabaseHookData = useSupabase();
  
  // We construct the object to match the old SettingsContextType,
  // ensuring that components consuming this hook don't break.
  return {
    siteSettings: supabaseHookData.siteSettings,
    isLoading: supabaseHookData.isLoading,
    currency: supabaseHookData.currency,
    handleUpdateSiteSettings: supabaseHookData.handleUpdateSiteSettings,
  };
};