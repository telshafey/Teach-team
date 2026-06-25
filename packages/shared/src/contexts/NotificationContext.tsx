import {
  createContext,
  useCallback,
  useEffect,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Notification } from "../types";
import { useSupabase } from "./SupabaseContext";
import { useAuth } from "./AuthContext";
import * as api from "../services/apiService";
import { useRealtime } from "./RealtimeContext";

export interface NotificationContextType {
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = (): NotificationContextType => { 
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  // Query notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications", currentUser?.id],
    queryFn: async () => {
      if (!supabaseClient || !currentUser) return [];
      const { data, error } = await supabaseClient
        .from("notifications")
        .select("*")
        .eq("recipient_id", currentUser.id)
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }
      return api.keysToCamel(data) as Notification[];
    },
    enabled: !!supabaseClient && !!currentUser,
  });

  // Realtime subscription to "notifications" table
  useEffect(() => {
    if (!supabaseClient || !currentUser) return;

    const handleRealtimeChange = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", currentUser.id] });
    };

    const unsubscribe = subscribe("notifications", handleRealtimeChange);
    return () => {
      unsubscribe();
    };
  }, [supabaseClient, currentUser, subscribe, queryClient]);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["notifications", currentUser?.id] });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Error marking notification as read:", errMsg);
    }
  }, [supabaseClient, currentUser, queryClient]);

  return {
    notifications,
    markNotificationAsRead,
  };
};

export const useNotificationContext = useNotification;
