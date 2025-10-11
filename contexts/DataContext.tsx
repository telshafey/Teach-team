import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsContext, SettingsContextType } from './SettingsContext';
import { useTeamContext, TeamContextType } from './TeamContext';
import { useRequestsContext, RequestsContextType } from './RequestsContext';
import { useMeetingContext, MeetingContextType } from './MeetingContext';
import { useTimeLogContext, TimeLogContextType } from './TimeLogContext';
import { useNotificationContext, NotificationContextType } from './NotificationContext';
import { useProjectContext, ProjectContextType } from './ProjectContext';
import { useSupabase } from './SupabaseContext';
import { useTimeTracking, TimeTrackingContextType } from './TimeTrackingContext';
import { DailyLog, DailyLogFormData } from '../types';


// Combine all context types into one.
// We are effectively creating a facade over all the individual data contexts
// for easier consumption in components.
type AppDataContextType = SettingsContextType &
  TeamContextType &
  RequestsContextType &
  MeetingContextType &
  TimeLogContextType &
  NotificationContextType &
  ProjectContextType &
  TimeTrackingContextType &
  { 
    isStorageConfigured: boolean;
  };

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const settingsContext = useSettingsContext();
  const teamContext = useTeamContext();
  const requestsContext = useRequestsContext();
  const meetingContext = useMeetingContext();
  const timeLogContext = useTimeLogContext();
  const notificationContext = useNotificationContext();
  const projectContext = useProjectContext();
  const timeTrackingContext = useTimeTracking();
  const { supabaseClient } = useSupabase();

  // A simple check if storage is configured. This is a proxy.
  // In a real app, this might be a more robust check on Supabase project settings.
  const isStorageConfigured = !!supabaseClient?.storage;

  const value: AppDataContextType = {
    ...settingsContext,
    ...teamContext,
    ...requestsContext,
    ...meetingContext,
    ...timeLogContext,
    ...notificationContext,
    ...projectContext,
    ...timeTrackingContext,
    isStorageConfigured,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppDataContext = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppDataContext must be used within a DataProvider');
  }
  return context;
};