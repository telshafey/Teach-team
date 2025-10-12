import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { DailyLog } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

export interface TimeLogContextType {
  dailyLogs: DailyLog[];
  isLoading: boolean;
  handleAddDailyLog: (logData: Omit<DailyLog, 'id'>) => Promise<void>;
  handleUpdateDailyLog: (log: DailyLog) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

const TimeLogContext = createContext<TimeLogContextType | undefined>(undefined);

export const TimeLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabaseClient || !currentUser) {
        setDailyLogs([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const logsData = await api.fetchAll<DailyLog>(supabaseClient, 'daily_logs');
      setDailyLogs(logsData);
    } catch (error: any) {
      console.error('Error fetching daily logs:', error);
      addToast('فشل تحميل سجلات الدوام.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, addToast, currentUser]);

  useEffect(() => {
    if (supabaseClient && currentUser) {
      fetchData();
      const channel = supabaseClient.channel('public:daily_logs').on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, () => fetchData()).subscribe();
      return () => {
        supabaseClient.removeChannel(channel);
      };
    } else {
        setDailyLogs([]);
    }
  }, [supabaseClient, fetchData, currentUser]);
  
  const handleAddDailyLog = async (logData: Omit<DailyLog, 'id'>) => {
    if (!supabaseClient) return;
    try {
        // The DB schema for 'daily_logs' does not auto-generate the 'id'.
        // We generate a UUID on the client as a workaround.
        // A better long-term solution is to set a default value for the 'id' column in the database,
        // e.g., using `gen_random_uuid()`.
        await api.insert(supabaseClient, 'daily_logs', { ...logData, id: crypto.randomUUID() });
        addToast('تم إضافة السجل بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل إضافة السجل: ${e.message}`, 'error'); throw e;
    }
  };
  
  const handleUpdateDailyLog = async (log: DailyLog) => {
    if (!supabaseClient) return;
     try {
        const { id, ...updates } = log;
        await api.update<DailyLog>(supabaseClient, 'daily_logs', id, updates);
        addToast('تم تعديل السجل بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل تعديل السجل: ${e.message}`, 'error'); throw e;
    }
  };
  
  const handleDeleteDailyLog = async (logId: string) => {
    if (!supabaseClient) return;
     try {
        await api.deleteById(supabaseClient, 'daily_logs', logId);
        addToast('تم حذف السجل بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل حذف السجل: ${e.message}`, 'error'); throw e;
    }
  };

  const value = { dailyLogs, isLoading, handleAddDailyLog, handleUpdateDailyLog, handleDeleteDailyLog, fetchData };

  return (
    <TimeLogContext.Provider value={value}>
      {children}
    </TimeLogContext.Provider>
  );
};

export const useTimeLogContext = () => {
  const context = useContext(TimeLogContext);
  if (context === undefined) {
    throw new Error('useTimeLogContext must be used within a TimeLogProvider');
  }
  return context;
};
