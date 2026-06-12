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

export const TimeLogProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { subscribe } = useRealtime();
  const queryClient = useQueryClient();

  const { data: dailyLogs = [], isLoading } = useQuery<DailyLog[]>({
    queryKey: ["daily_logs"],
    queryFn: () => api.getAll<DailyLog>(supabaseClient!, "daily_logs"),
    enabled: !!supabaseClient && !!currentUser,
  });

  useEffect(() => {
    const handleLogChange = (
      payload: RealtimePostgresChangesPayload<DailyLog>,
    ) => {
      queryClient.setQueryData(
        ["daily_logs"],
        (oldData: DailyLog[] | undefined) => {
          if (oldData === undefined) return [];
          if (payload.eventType === "INSERT") {
            if (oldData.some((log) => log.id === payload.new.id))
              return oldData;
            return [payload.new, ...oldData];
          }
          if (payload.eventType === "UPDATE") {
            return oldData.map((log) =>
              log.id === payload.new.id ? payload.new : log,
            );
          }
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            return oldData.filter((log) => log.id !== oldId);
          }
          return oldData;
        },
      );
    };
    const unsubscribe = subscribe("daily_logs", handleLogChange);
    return () => unsubscribe();
  }, [subscribe, queryClient]);

  const handleAddDailyLog = useCallback(
    async (logData: Omit<DailyLog, "id">) => {
      if (!supabaseClient) return;
      try {
        await api.insert<DailyLog>(supabaseClient, "daily_logs", logData);
        addToast("تم إضافة سجل العمل بنجاح.", "success");
      } catch (error: any) {
        addToast(`فشل إضافة السجل: ${error.message}`, "error");
        console.error("Failed to add daily log:", error);
      }
    },
    [supabaseClient, addToast],
  );

  const handleUpdateDailyLog = useCallback(
    async (logData: Partial<DailyLog>) => {
      if (!supabaseClient || !logData.id) return;
      try {
        await api.update<DailyLog>(
          supabaseClient,
          "daily_logs",
          logData.id,
          logData,
        );
        addToast("تم تحديث سجل العمل بنجاح.", "success");
      } catch (error: any) {
        addToast(`فشل تحديث السجل: ${error.message}`, "error");
        console.error("Failed to update daily log:", error);
      }
    },
    [supabaseClient, addToast],
  );

  const handleDeleteDailyLog = useCallback(
    async (logId: string) => {
      if (!supabaseClient) return;
      try {
        await api.deleteById(supabaseClient, "daily_logs", logId);
        addToast("تم حذف سجل العمل بنجاح.", "success");
      } catch (error: any) {
        addToast(`فشل حذف سجل العمل: ${error.message}`, "error");
        console.error("Failed to delete daily log:", error);
      }
    },
    [supabaseClient, addToast],
  );

  const value = {
    dailyLogs,
    isLoading,
    handleAddDailyLog,
    handleUpdateDailyLog,
    handleDeleteDailyLog,
  };

  return (
    <TimeLogContext.Provider value={value}>{children}</TimeLogContext.Provider>
  );
};

export const useTimeLogContext = () => {
  const context = useContext(TimeLogContext);
  if (context === undefined) {
    throw new Error("useTimeLogContext must be used within a TimeLogProvider");
  }
  return context;
};
