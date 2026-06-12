import { SupabaseClient } from "@supabase/supabase-js";
import { Notification } from "../types";
import * as api from "./apiService";

export const createNotification = async (
  supabaseClient: SupabaseClient,
  notificationData: Omit<Notification, "id" | "read" | "timestamp">,
): Promise<void> => {
  try {
    const notificationPayload = {
      ...notificationData,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Use the generic api.insert which now correctly handles ID generation by the database
    // and returns the created object. This removes the inconsistent bypass.
    await api.insert<Notification>(
      supabaseClient,
      "notifications",
      notificationPayload,
    );
  } catch (error: any) {
    console.error("Failed to create notification:", error.message);
    // Do not re-throw, as notification creation is often non-critical
  }
};
