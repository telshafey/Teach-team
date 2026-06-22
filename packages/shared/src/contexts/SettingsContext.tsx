import { SiteSettings } from "../types";
import { useSettingsStore } from "../stores/settingsStore";
import { useEffect } from "react";

export interface SettingsContextType {
  siteSettings: SiteSettings | null;
  currency: string;
  handleUpdateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
}

export const useSettingsContext = (): SettingsContextType => {
  const store = useSettingsStore();

  useEffect(() => {
    if (store.siteSettings === null) {
      store.fetchSettings();
    }
  }, []);

  return {
    ...store,
    currency: store.siteSettings?.currency || "USD",
    handleUpdateSiteSettings: store.updateSettings
  };
};

// Aliases for compatibility
export const useSettings = useSettingsContext;

