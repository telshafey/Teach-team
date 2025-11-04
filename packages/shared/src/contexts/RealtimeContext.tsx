import React, { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useSupabase } from './SupabaseContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import * as api from '../services/apiService';

type RealtimeCallback = (payload: RealtimePostgresChangesPayload<any>) => void;
type TableCallbacks = Record<string, RealtimeCallback[]>;

interface RealtimeContextType {
  subscribe: (table: string, callback: RealtimeCallback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const callbacksRef = useRef<TableCallbacks>({});

  const subscribe = useCallback((table: string, callback: RealtimeCallback) => {
    if (!callbacksRef.current[table]) {
      callbacksRef.current[table] = [];
    }
    callbacksRef.current[table].push(callback);

    // Return an unsubscribe function
    return () => {
      if (callbacksRef.current[table]) {
        callbacksRef.current[table] = callbacksRef.current[table].filter(cb => cb !== callback);
      }
    };
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;

    const handleChanges = (payload: RealtimePostgresChangesPayload<any>) => {
      const { table } = payload;
      const camelCasedPayload = {
          ...payload,
          new: api.keysToCamel(payload.new),
          old: api.keysToCamel(payload.old),
      };

      if (callbacksRef.current[table]) {
        callbacksRef.current[table].forEach(callback => callback(camelCasedPayload));
      }
    };

    const channel = supabaseClient
      .channel('database-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, handleChanges)
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient]);

  const value = { subscribe };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
