import { SupabaseClient } from '@supabase/supabase-js';
import { Notification } from '../types';
import * as api from './apiService';

export const createNotification = async (
  supabaseClient: SupabaseClient,
  notificationData: Omit<Notification, 'id' | 'read' | 'timestamp'>
): Promise<void> => {
  try {
    const notificationWithTimestamp = {
      ...notificationData,
      timestamp: new Date().toISOString(),
    };
    // We don't need the returned value, just fire and forget.
    await api.insert<Notification>(supabaseClient, 'notifications', notificationWithTimestamp);
  } catch (error: any) {
    console.error("Failed to create notification:", error.message);
    // Don't show toast for this background task.
  }
};
