import { SupabaseClient } from "@supabase/supabase-js";
import { Notification } from "../types";

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

    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session?.access_token;

    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(notificationPayload)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || "Failed to create notification via backend proxy");
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Failed to create notification:", errMsg);
    throw error;
  }
};
