import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Notification } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import * as api from '../services/apiService';

export interface NotificationContextType {
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!supabaseClient || !currentUser) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('recipient_id', currentUser.id)
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications:', error);
      } else if (data) {
        setNotifications(api.keysToCamel(data));
      }
    };

    fetchNotifications();

    const channel = supabaseClient
      .channel(`public:notifications:recipient_id=eq.${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${currentUser.id}` },
        (payload) => {
          const newNotification = api.keysToCamel(payload.new) as Notification;
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, currentUser]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!supabaseClient) return;
    const updatedNotification = await api.update<Notification>(supabaseClient, 'notifications', notificationId, { read: true });
    setNotifications(prev => 
        prev.map(n => n.id === notificationId ? updatedNotification : n)
    );
  }, [supabaseClient]);

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