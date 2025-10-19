import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Notification } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import * as api from '../services/apiService';
import { useToast } from './ToastContext';

export interface NotificationContextType {
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
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

    const channel = supabaseClient
      .channel(`public:notifications:recipient_id=eq.${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${currentUser.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = api.keysToCamel(payload.new) as Notification;
            setNotifications(prev => [newNotification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = api.keysToCamel(payload.new) as Notification;
            setNotifications(prev => prev.map(n => n.id === updatedNotification.id ? updatedNotification : n));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, currentUser, addToast]);

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