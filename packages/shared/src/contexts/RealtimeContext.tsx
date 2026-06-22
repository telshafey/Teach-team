import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
  useMemo,
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
  const subscribe = useCallback((table: string, callback: RealtimeCallback) => {
    return () => {};
  }, []);

  return useMemo(() => ({ subscribe }), [subscribe]);
};

export const useRealtimeContext = useRealtime;

