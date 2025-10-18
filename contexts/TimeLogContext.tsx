import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { DailyLog, DailyLogFormData } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';

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
  }, [supabaseClient, currentUser, addToast]); // Depend on currentUser

  const handleAddDailyLog = useCallback(async (logData: Omit<DailyLog, 'id'>) => {
    if (!supabaseClient) return;
    const newLog = await api.insert<DailyLog>(supabaseClient, 'daily_logs', logData);
    setDailyLogs(prev => [...prev, newLog]);
    addToast('تم إضافة سجل العمل بنجاح.', 'success');
  }, [supabaseClient, addToast]);

  const handleUpdateDailyLog = useCallback(async (logData: Partial<DailyLog>) => {
    if (!supabaseClient || !logData.id) return;
    const updatedLog = await api.update<DailyLog>(supabaseClient, 'daily_logs', logData.id, logData);
    setDailyLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
    addToast('تم تحديث سجل العمل بنجاح.', 'success');
  }, [supabaseClient, addToast]);

  const handleDeleteDailyLog = useCallback(async (logId: string) => {
    if (!supabaseClient) return;
    await api.deleteById(supabaseClient, 'daily_logs', logId);
    setDailyLogs(prev => prev.filter(log => log.id !== logId));
    addToast('تم حذف سجل العمل بنجاح.', 'success');
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