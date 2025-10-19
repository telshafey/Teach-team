import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { DailyLog, DailyLogFormData } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { useRealtime } from './RealtimeContext';

export interface TimeLogContextType {
  dailyLogs: DailyLog[];
  isLoading: boolean;
  handleAddDailyLog: (logData: Omit<DailyLog, 'id'>) => Promise<void>;
  handleUpdateDailyLog: (logData: Partial<DailyLog>) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
}

const TimeLogContext = createContext<TimeLogContextType | undefined>(undefined);

export const TimeLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth(); // Depend on user
  const { addToast } = useToast();
  const { subscribe } = useRealtime();
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabaseClient || !currentUser) return; // Wait for client and user
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const logs = await api.getAll<DailyLog>(supabaseClient, 'daily_logs');
        setDailyLogs(logs);
      } catch (error: any) {
        addToast(`Failed to fetch time logs: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [supabaseClient, currentUser, addToast]); 

  useEffect(() => {
    const handleLogChange = (payload: any) => {
      if (payload.eventType === 'INSERT') {
        setDailyLogs(prev => [payload.new, ...prev.filter(l => l.id !== payload.new.id)]);
      } else if (payload.eventType === 'UPDATE') {
        setDailyLogs(prev => prev.map(log => log.id === payload.new.id ? payload.new : log));
      } else if (payload.eventType === 'DELETE') {
        setDailyLogs(prev => prev.filter(log => log.id !== payload.old.id));
      }
    };
    const unsubscribe = subscribe('daily_logs', handleLogChange);
    return () => unsubscribe();
  }, [subscribe]);

  const handleAddDailyLog = useCallback(async (logData: Omit<DailyLog, 'id'>) => {
    if (!supabaseClient) return;
    try {
        await api.insert<DailyLog>(supabaseClient, 'daily_logs', logData);
        addToast('تم إضافة سجل العمل بنجاح.', 'success');
    } catch(error: any) {
        addToast(`فشل إضافة السجل: ${error.message}`, 'error');
        console.error("Failed to add daily log:", error);
    }
  }, [supabaseClient, addToast]);

  const handleUpdateDailyLog = useCallback(async (logData: Partial<DailyLog>) => {
    if (!supabaseClient || !logData.id) return;
    try {
        await api.update<DailyLog>(supabaseClient, 'daily_logs', logData.id, logData);
        addToast('تم تحديث سجل العمل بنجاح.', 'success');
    } catch(error: any) {
        addToast(`فشل تحديث السجل: ${error.message}`, 'error');
        console.error("Failed to update daily log:", error);
    }
  }, [supabaseClient, addToast]);

  const handleDeleteDailyLog = useCallback(async (logId: string) => {
    if (!supabaseClient) return;
    try {
        await api.deleteById(supabaseClient, 'daily_logs', logId);
        addToast('تم حذف سجل العمل بنجاح.', 'success');
    } catch (error: any) {
        addToast(`فشل حذف سجل العمل: ${error.message}`, 'error');
        console.error("Failed to delete daily log:", error);
    }
  }, [supabaseClient, addToast]);

  const value = { dailyLogs, isLoading, handleAddDailyLog, handleUpdateDailyLog, handleDeleteDailyLog };

  return <TimeLogContext.Provider value={value}>{children}</TimeLogContext.Provider>;
};

export const useTimeLogContext = () => {
  const context = useContext(TimeLogContext);
  if (context === undefined) {
    throw new Error('useTimeLogContext must be used within a TimeLogProvider');
  }
  return context;
};
