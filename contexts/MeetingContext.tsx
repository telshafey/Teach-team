import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Meeting, MeetingFormData } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { slugify } from '../utils/slugify';
import { createNotification } from '../services/notificationService';
import { useAuth } from './AuthContext';

export interface MeetingContextType {
  meetings: Meeting[];
  isLoading: boolean;
  handleAddMeeting: (formData: MeetingFormData) => Promise<void>;
  handleDeleteMeeting: (meetingId: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const MeetingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabaseClient || !currentUser) {
        setMeetings([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const meetingsData = await api.fetchAll<Meeting>(supabaseClient, 'meetings');
      setMeetings(meetingsData);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      addToast('فشل تحميل الاجتماعات.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, addToast, currentUser]);

  useEffect(() => {
    if (supabaseClient && currentUser) {
      fetchData();
      const channel = supabaseClient.channel('public:meetings').on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchData()).subscribe();
      return () => {
        supabaseClient.removeChannel(channel);
      };
    } else {
        setMeetings([]);
    }
  }, [supabaseClient, fetchData, currentUser]);

  const handleAddMeeting = async (formData: MeetingFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
      const jitsiRoomName = `${slugify(formData.title)}-${Date.now()}`;
      await api.insert(supabaseClient, 'meetings', { ...formData, jitsiRoomName });
      
      // Send notifications to participants
      for (const memberId of formData.members) {
          if (memberId !== currentUser.id) {
              await createNotification(supabaseClient, {
                  recipientId: memberId,
                  type: 'meeting_scheduled',
                  taskTitle: formData.title,
                  assignerName: currentUser.name,
              });
          }
      }
      addToast('تم جدولة الاجتماع بنجاح.', 'success');
    } catch (e: any) {
      addToast(`فشل جدولة الاجتماع: ${e.message}`, 'error'); throw e;
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, 'meetings', meetingId);
      addToast('تم حذف الاجتماع بنجاح.', 'success');
    } catch (e: any) {
      addToast(`فشل حذف الاجتماع: ${e.message}`, 'error'); throw e;
    }
  };

  const value = { meetings, isLoading, handleAddMeeting, handleDeleteMeeting, fetchData };

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
};

export const useMeetingContext = () => {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeetingContext must be used within a MeetingProvider');
  }
  return context;
};
