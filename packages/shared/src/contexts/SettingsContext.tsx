import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteSettings } from "../types";
import { useSupabase } from "./SupabaseContext";
import * as api from "../services/apiService";
import { initialData } from "../data/initialData";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { useRealtime } from "./RealtimeContext";

export interface SettingsContextType {
  siteSettings: SiteSettings | null;
  currency: string;
  handleUpdateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { subscribe } = useRealtime();
  const queryClient = useQueryClient();

  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ["site_settings"],
    queryFn: async () => {
      if (!supabaseClient) throw new Error("Supabase client not available");
      const { data, error } = await supabaseClient
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();
      if (
        error &&
        error.code !== "PGRST116" &&
        error.code !== "42P01" &&
        error.code !== "PGRST205"
      ) {
        setTimeout(
          () => alert("Error loading site settings: " + error.message),
          1000,
        );
        throw error;
      }
      if (!data) {
        // setTimeout(() => alert('No site settings found in DB! Falling back to defaults.'), 1000);
      }

      const parsedData = data
        ? (api.keysToCamel(data) as any)
        : (initialData.siteSettings as any);

      return parsedData as SiteSettings;
    },
    enabled: !!supabaseClient && !!currentUser,
    staleTime: Infinity, // Settings don't change often, rely on realtime for updates
  });

  useEffect(() => {
    const handleSettingsChange = (payload: any) => {
      if (
        payload.eventType === "UPDATE" &&
        payload.table === "site_settings" &&
        String(payload.new.id) === "1"
      ) {
        queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      }
    };
    const unsubscribe = subscribe("site_settings", handleSettingsChange);
    return () => {
      unsubscribe();
    };
  }, [subscribe, queryClient]);

  const updateMutation = useMutation({
    mutationFn: async (settings: Partial<SiteSettings>) => {
      const payloadToSave: any = { ...settings, id: 1 };
      const payload = api.camelToSnakeCase(payloadToSave);

      const upsertPromise = api.upsertSiteSettingsAdmin(payload);

      const timeoutPromise = new Promise<{ data: any; error: any }>(
        (_, reject) =>
          setTimeout(() => reject(new Error("Update Request Timeout")), 15000),
      );

      const data = await Promise.race([
        upsertPromise,
        timeoutPromise,
      ]);

      return data as SiteSettings;
    },
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ["site_settings"] });
      const previousSettings = queryClient.getQueryData<SiteSettings>([
        "site_settings",
      ]);
      queryClient.setQueryData<SiteSettings>(["site_settings"], (old) => ({
        ...old!,
        ...newSettings,
      }));
      return { previousSettings };
    },
    onError: (err: any, newSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["site_settings"], context.previousSettings);
      }
      addToast(
        err.message || "فشل حفظ الإعدادات. يرجى المحاولة مرة أخرى.",
        "error",
      );
    },
    onSuccess: () => {
      addToast("تم حفظ الإعدادات بنجاح.", "success");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["site_settings"] });
    },
  });

  const handleUpdateSiteSettings = useCallback(
    async (settings: Partial<SiteSettings>) => {
      await updateMutation.mutateAsync(settings);
    },
    [updateMutation],
  );

  const currency = siteSettings?.currency || "USD";

  const value = {
    siteSettings: siteSettings || null,
    currency,
    handleUpdateSiteSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error(
      "useSettingsContext must be used within a SettingsProvider",
    );
  }
  return context;
};
