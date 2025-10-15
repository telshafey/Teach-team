import { SupabaseClient } from '@supabase/supabase-js';
import { Notification } from '../types';
import * as api from './apiService';

export const createNotification = async (
  supabaseClient: SupabaseClient,
  notificationData: Omit<Notification, 'id' | 'read' | 'timestamp'>
): Promise<void> => {
  try {
    const notificationPayload = {
      id: crypto.randomUUID(),
      ...notificationData,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Bypass generic insert for a direct, more controlled call to definitively fix the null ID issue.
    const { error } = await supabaseClient
        .from('notifications')
        .insert([api.camelToSnake(notificationPayload)]);
    
    if (error) {
        // Rethrow to be caught by the outer catch block
        throw new Error(error.message);
    }

  } catch (error: any) {
    console.error("Failed to create notification:", error.message);
    // Don't show toast for this background task as it's a background process.
  }
};