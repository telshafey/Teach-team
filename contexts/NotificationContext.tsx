import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Notification } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import * as api from '../services/apiService';
import { useToast } from './ToastContext';
import { useRealtime } from './RealtimeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface NotificationContextType {
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { subscribe } = useRealtime();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
      queryKey: ['notifications', currentUser?.id],
      queryFn: async () => {
          if (!supabaseClient || !currentUser) return [];
          const { data, error } = await supabaseClient
              .from('notifications')
              .select('*')
              .eq('recipient_id', currentUser.id)
              .order('timestamp', { ascending: false });
          if (error) throw error;
          return data ? api.keysToCamel(data) : [];
      },
      enabled: !!supabaseClient && !!currentUser,
  });


  useEffect(() => {
    if (!currentUser) return () => {};

    const handleNotificationChange = (payload: any) => {
        if (payload.new?.recipient_id !== currentUser.id && payload.old?.recipient_id !== currentUser.id) {
            return;
        }
        
        queryClient.setQueryData(['notifications', currentUser.id], (oldData: Notification[] | undefined) => {
            const data = oldData || [];
            if (payload.eventType === 'INSERT') {
                if (data.some(n => n.id === payload.new.id)) return data; // Already exists
                return [payload.new, ...data].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            }
            if (payload.eventType === 'UPDATE') {
                return data.map(n => n.id === payload.new.id ? payload.new : n);
            }
            if (payload.eventType === 'DELETE') {
                return data.filter(n => n.id !== payload.old.id);
            }
            return data;
        });
    };

    const unsubscribe = subscribe('notifications', handleNotificationChange);

    return () => {
        unsubscribe();
    };
  }, [currentUser, subscribe, queryClient]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!supabaseClient) return;
    try {
      await api.update<Notification>(supabaseClient, 'notifications', notificationId, { read: true });
      // Realtime listener will update the local state
    } catch (error: any) {
      console.error("Failed to mark notification as read:", error);
      addToast(`فشل تحديث الإشعار: ${error.message}`, 'error');
    }
  }, [supabaseClient, addToast, queryClient, currentUser]);

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
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};