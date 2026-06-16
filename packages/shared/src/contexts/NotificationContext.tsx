import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Notification } from "../types";
import { useSupabase } from "./SupabaseContext";
import { useAuth } from "./AuthContext";
import * as api from "../services/apiService";
import { useToast } from "./ToastContext";
import { useRealtime } from "./RealtimeContext";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface NotificationContextType {
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { subscribe } = useRealtime();
  const queryClient = useQueryClient();

  const queryKey = React.useMemo(
    () => ["notifications", currentUser?.id],
    [currentUser?.id],
  );

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey,
    queryFn: async () => {
      if (!supabaseClient || !currentUser) return [];
      const { data, error } = await supabaseClient
        .from("notifications")
        .select("*")
        .eq("recipient_id", currentUser.id)
        .order("timestamp", { ascending: false });
      if (error) throw error;
      return data ? api.keysToCamel(data) : [];
    },
    enabled: !!supabaseClient && !!currentUser,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!currentUser?.id) return () => {};

    const handleNotificationChange = (payload: any) => {
      const camelPayload = (
        payload.new ? api.keysToCamel(payload.new) : null
      ) as Notification | null;
      const newRecipientId = camelPayload?.recipientId;
      const oldRecipientId =
        payload.old?.recipient_id || payload.old?.recipientId;
      if (
        newRecipientId &&
        newRecipientId !== currentUser.id &&
        oldRecipientId &&
        oldRecipientId !== currentUser.id
      ) {
        return;
      }

      queryClient.setQueryData(
        queryKey,
        (oldData: Notification[] | undefined) => {
          if (oldData === undefined) return [];

          if (payload.eventType === "INSERT" && camelPayload) {
            if (oldData.some((n) => n.id === camelPayload.id)) return oldData;
            return [camelPayload, ...oldData].sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            );
          }
          if (payload.eventType === "UPDATE" && camelPayload) {
            return oldData.map((n) =>
              n.id === camelPayload.id ? camelPayload : n,
            );
          }
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            return oldData.filter((n) => n.id !== oldId);
          }
          return oldData;
        },
      );
    };

    const unsubscribe = subscribe("notifications", handleNotificationChange);
    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, subscribe, queryClient, queryKey]);

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => {
      if (!supabaseClient) throw new Error("Supabase client not available");
      return api.update<Notification>(
        supabaseClient,
        "notifications",
        notificationId,
        { read: true },
      );
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications =
        queryClient.getQueryData<Notification[]>(queryKey);

      queryClient.setQueryData<Notification[]>(
        queryKey,
        (old) =>
          old?.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n,
          ) || [],
      );

      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
      addToast(`فشل تحديث الإشعار`, "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      const currentNotifications =
        queryClient.getQueryData<Notification[]>(queryKey) || [];
      const targetNotification = currentNotifications.find(
        (n) => n.id === notificationId,
      );
      if (targetNotification && !targetNotification.read) {
        await markAsReadMutation.mutateAsync(notificationId);
      }
    },
    [markAsReadMutation, queryClient, queryKey],
  );

  const value = { notifications, markNotificationAsRead };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider",
    );
  }
  return context;
};
