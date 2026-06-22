import { create } from "zustand";
import { SiteSettings } from "../types";
import { getSupabaseClient } from "./supabaseStore";
import * as api from "../services/apiService";

interface SettingsState {
  siteSettings: SiteSettings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<SiteSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  siteSettings: null,
  isLoading: true,
  fetchSettings: async () => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          console.error("Error fetching site settings:", error);
        }
      } else if (data) {
        set({ siteSettings: api.keysToCamel(data) as SiteSettings });
      }
    } catch (err) {
      console.error("Error fetching site settings:", err);
    } finally {
      set({ isLoading: false });
    }
  },
  updateSettings: async (updates) => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;

    try {
      const payloadToSave = { ...updates, id: 1 };
      const payload = api.camelToSnakeCase(payloadToSave);

      const returnedObj = await api.upsertSiteSettingsAdmin<SiteSettings>(
        supabaseClient,
        payload
      );
      set({ siteSettings: returnedObj });
    } catch (err: any) {
      throw err;
    }
  },
}));
