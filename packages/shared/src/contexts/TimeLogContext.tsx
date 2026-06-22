import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DailyLog } from "../types";
import { useSupabase } from "./SupabaseContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import * as api from "../services/apiService";
import { useRealtime } from "./RealtimeContext";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface TimeLogContextType {
  dailyLogs: DailyLog[];
  isLoading: boolean;
  handleAddDailyLog: (logData: Omit<DailyLog, "id">) => Promise<void>;
  handleUpdateDailyLog: (logData: Partial<DailyLog>) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
}

const TimeLogContext = createContext<TimeLogContextType | undefined>(undefined);

export const useTimeLog = (): TimeLogContextType => { 
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: dailyLogs = [], isLoading } = useQuery<DailyLog[]>({
    queryKey: ["dailyLogs"],
    queryFn: async () => {
      if (!supabaseClient) return [];
      return api.getAll<DailyLog>(supabaseClient, "daily_logs");
    },
    enabled: !!supabaseClient,
  });

  const handleAddDailyLog = useCallback(async (logData: Omit<DailyLog, "id">) => {
    if (!supabaseClient) return;
    try {
      await api.insert<DailyLog>(supabaseClient, "daily_logs", logData);
      queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
      addToast("تم تسجيل ساعات العمل بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل تسجيل ساعات العمل", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleUpdateDailyLog = useCallback(async (logData: Partial<DailyLog>) => {
    if (!supabaseClient || !logData.id) return;
    try {
      const { id, ...updates } = logData;
      await api.update<DailyLog>(supabaseClient, "daily_logs", id, updates);
      queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
      addToast("تم تحديث ساعات العمل بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل تحديث ساعات العمل", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleDeleteDailyLog = useCallback(async (logId: string) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, "daily_logs", logId);
      queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
      addToast("تم حذف السجل بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل حذف السجل", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const { subscribe } = useRealtime();
  useEffect(() => {
    if (!supabaseClient) return;
    const unsubscribe = subscribe(
      "daily_logs",
      (payload: RealtimePostgresChangesPayload<any>) => {
        queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [supabaseClient, subscribe, queryClient]);

  return {
    dailyLogs,
    isLoading,
    handleAddDailyLog,
    handleUpdateDailyLog,
    handleDeleteDailyLog,
  };
};

export const useTimeLogContext = useTimeLog;
