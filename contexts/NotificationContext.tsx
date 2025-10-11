import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';

export interface NotificationContextType {
  notifications: Notification[];
  isLoading: boolean;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabaseClient || !currentUser) {
        setIsLoading(false);
        setNotifications([]);
        return;
    };
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient.from('notifications').select('*').eq('recipient_id', currentUser.id);
      if (error) throw error;
      setNotifications(api.snakeToCamel(data) as Notification[]);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, currentUser]);

  useEffect(() => {
    if (supabaseClient && currentUser) {
      fetchData();
      const channel = supabaseClient
        .channel(`public:notifications:recipient_id=eq.${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${currentUser.id}` }, () => fetchData())
        .subscribe();
      return () => {
        supabaseClient.removeChannel(channel);
      };
    } else {
        setNotifications([]);
    }
  }, [supabaseClient, currentUser, fetchData]);

  const markNotificationAsRead = async (notificationId: string) => {
    if (!supabaseClient) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    try {
        await api.update<Notification>(supabaseClient, 'notifications', notificationId, { read: true });
    } catch(e) {
        // Revert on failure
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: false } : n));
        console.error("Failed to mark notification as read", e);
    }
  };

  const value = { notifications, isLoading, markNotificationAsRead, fetchData };

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