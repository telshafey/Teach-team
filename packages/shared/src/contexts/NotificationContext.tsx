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

export const useNotification = (): NotificationContextType => { 
        return new Proxy({}, { 
            get: (target, prop) => { 
                if (prop === 'isLoading') return false;
                if (prop === 'hasPermission') return () => true;
                if (prop === 'visibleMemberIds') return new Set();
                return typeof prop === 'string' && prop.startsWith('handle') ? async () => {} : []; 
            } 
        }) as NotificationContextType; 
    };

export const useNotificationContext = useNotification;
