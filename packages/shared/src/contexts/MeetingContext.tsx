import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { Meeting, MeetingFormData } from "../types";
import { useSupabase } from "./SupabaseContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import * as api from "../services/apiService";
import { useSettingsContext } from "./SettingsContext";
import { useRealtime } from "./RealtimeContext";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface MeetingContextType {
  handleAddMeeting: (meetingData: MeetingFormData) => Promise<void>;
  handleDeleteMeeting: (meetingId: string) => Promise<void>;
  handleJoinMeeting: (meetingId: string) => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const useMeeting = (): MeetingContextType => { 
        return new Proxy({}, { 
            get: (target, prop) => { 
                if (prop === 'isLoading') return false;
                if (prop === 'hasPermission') return () => true;
                if (prop === 'visibleMemberIds') return new Set();
                return typeof prop === 'string' && prop.startsWith('handle') ? async () => {} : []; 
            } 
        }) as MeetingContextType; 
    };

export const useMeetingContext = useMeeting;
