import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Notification } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import * as api from '../services/apiService';
import { useToast } from './ToastContext';
import { useRealtime } from './RealtimeContext';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!supabaseClient || !currentUser) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('notifications')
          .select('*')
          .eq('recipient_id', currentUser.id)
          .order('timestamp', { ascending: false });
        
        if (error) throw error;

        if (data) {
          setNotifications(api.keysToCamel(data));
        }
      } catch (error: any) {
        console.error('Error fetching notifications:', error);
        addToast('فشل في تحميل الإشعارات.', 'error');
      }
    };

    fetchNotifications();
  }, [supabaseClient, currentUser, addToast]);

  useEffect(() => {
    if (!currentUser) return () => {};

    const handleNotificationChange = (payload: any) => {
        // Realtime event might arrive before currentUser is set, so check again.
        if (!currentUser) return;
        
        const relevantNew = payload.new && payload.new.recipientId === currentUser.id;
        const relevantOld = payload.old && payload.old.recipientId === currentUser.id;

        if (!relevantNew && !relevantOld) {
            return;
        }

        if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev.filter(n => n.id !== payload.new.id)]);
        } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
        } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
    };

    const unsubscribe = subscribe('notifications', handleNotificationChange);

    return () => {
        unsubscribe();
    };
  }, [currentUser, subscribe]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!supabaseClient) return;
    try {
      await api.update<Notification>(supabaseClient, 'notifications', notificationId, { read: true });
    } catch (error: any) {
      console.error("Failed to mark notification as read:", error);
      addToast(`فشل تحديث الإشعار: ${error.message}`, 'error');
    }
  }, [supabaseClient, addToast]);

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
