import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useSupabase } from "./SupabaseContext";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import * as api from "../services/apiService";

type RealtimeCallback = (payload: RealtimePostgresChangesPayload<any>) => void;
type TableCallbacks = Record<string, RealtimeCallback[]>;

interface RealtimeContextType {
  subscribe: (table: string, callback: RealtimeCallback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined,
);

export const useRealtime = (): RealtimeContextType => {
  return {
    subscribe: () => () => {},
  };
};

export const useRealtimeContext = useRealtime;

