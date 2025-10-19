import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Meeting, MeetingFormData } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { useSettingsContext } from './SettingsContext';

export interface MeetingContextType {
  meetings: Meeting[];
  isLoading: boolean;
  handleAddMeeting: (meetingData: MeetingFormData) => Promise<void>;
  handleDeleteMeeting: (meetingId: string) => Promise<void>;
  handleJoinMeeting: (meetingId: string) => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const MeetingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { siteSettings } = useSettingsContext();
  const { addToast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabaseClient || !currentUser) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await api.getAll<Meeting>(supabaseClient, 'meetings');
        setMeetings(data);
      } catch (error: any) {
        addToast(`Failed to fetch meetings: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    const channel = supabaseClient.channel('public:meetings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, payload => {
        if (payload.eventType === 'INSERT') {
          setMeetings(prev => [...prev, api.keysToCamel(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setMeetings(prev => prev.map(m => m.id === payload.new.id ? api.keysToCamel(payload.new) : m));
        } else if (payload.eventType === 'DELETE') {
          setMeetings(prev => prev.filter(m => m.id !== payload.old.id));
        }
      }).subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };

  }, [supabaseClient, currentUser, addToast]);

  const handleAddMeeting = useCallback(async (meetingData: MeetingFormData) => {
    if (!supabaseClient || !currentUser) return;

    const defaultRoom = siteSettings?.meetingSettings?.defaultMeetingRoom;

    if (!defaultRoom) {
      addToast('فشل جدولة الاجتماع. لم يتم تكوين غرفة الاجتماعات الافتراضية في الإعدادات.', 'error');
      throw new Error('Default meeting room not configured.');
    }
    
    const startTime = new Date(meetingData.startTime);
    const endTime = new Date(startTime.getTime() + meetingData.duration * 60000);

    const newMeetingData = {
        title: meetingData.title,
        roomName: defaultRoom,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        creatorId: currentUser.id,
        members: [...new Set([...meetingData.members, currentUser.id])], // Ensure creator is a member
        projectId: meetingData.projectId,
    };

    try {
        await api.insert<Meeting>(supabaseClient, 'meetings', newMeetingData);
        addToast('تم جدولة الاجتماع بنجاح.', 'success');
    } catch (error: any) {
        console.error("Failed to add meeting:", error);
        addToast(`فشل جدولة الاجتماع: ${error.message}`, 'error');
        throw error;
    }
  }, [supabaseClient, currentUser, siteSettings, addToast]);

  const handleDeleteMeeting = useCallback(async (meetingId: string) => {
    if (!supabaseClient) return;
    try {
        await api.deleteById(supabaseClient, 'meetings', meetingId);
        addToast('تم حذف الاجتماع بنجاح.', 'success');
    } catch (error: any) {
        addToast(`فشل حذف الاجتماع: ${error.message}`, 'error');
        console.error("Failed to delete meeting:", error);
        throw error;
    }
  }, [supabaseClient, addToast]);

  const handleJoinMeeting = useCallback(async (meetingId: string) => {
    if (!supabaseClient || !currentUser) return;
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    const currentAttendees = meeting.attendees || [];
    if (!currentAttendees.includes(currentUser.id)) {
        try {
            const updatedAttendees = [...currentAttendees, currentUser.id];
            await api.update<Meeting>(supabaseClient, 'meetings', meetingId, { attendees: updatedAttendees });
        } catch (error) {
            console.error("Failed to mark user as attendee:", error);
            // We don't toast here as it might disrupt the user joining the meeting room.
        }
    }
  }, [supabaseClient, currentUser, meetings]);

  const value = { meetings, isLoading, handleAddMeeting, handleDeleteMeeting, handleJoinMeeting };

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
};

export const useMeetingContext = () => {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeetingContext must be used within a MeetingProvider');
  }
  return context;
};