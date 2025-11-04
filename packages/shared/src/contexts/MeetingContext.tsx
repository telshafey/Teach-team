import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Meeting, MeetingFormData } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { useSettingsContext } from './SettingsContext';
import { useRealtime } from './RealtimeContext';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface MeetingContextType {
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
  const { subscribe } = useRealtime();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleMeetingChange = (payload: RealtimePostgresChangesPayload<Meeting>) => {
      queryClient.setQueryData(['meetings'], (oldData: Meeting[] | undefined) => {
        if (oldData === undefined) return [];
        if (payload.eventType === 'INSERT') {
          if (oldData.some(m => m.id === payload.new.id)) return oldData;
          return [payload.new, ...oldData];
        }
        if (payload.eventType === 'UPDATE') {
          return oldData.map(m => m.id === payload.new.id ? payload.new : m);
        }
        if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id: string }).id;
          return oldData.filter(m => m.id !== oldId);
        }
        return oldData;
      });
    };
    const unsubscribe = subscribe('meetings', handleMeetingChange);
    return () => unsubscribe();
  }, [subscribe, queryClient]);

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
    
    // Optimistically update the cache first
    queryClient.setQueryData(['meetings'], (oldData: Meeting[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(m => {
            if (m.id === meetingId) {
                const attendees = m.attendees || [];
                if (!attendees.includes(currentUser.id)) {
                    return { ...m, attendees: [...attendees, currentUser.id] };
                }
            }
            return m;
        });
    });

    // Then, send the update to the server without blocking
    try {
      const { data: meeting } = await supabaseClient.from('meetings').select('attendees').eq('id', meetingId).single();
      const currentAttendees = meeting?.attendees || [];
      if (!currentAttendees.includes(currentUser.id)) {
        const updatedAttendees = [...currentAttendees, currentUser.id];
        await api.update<Meeting>(supabaseClient, 'meetings', meetingId, { attendees: updatedAttendees });
      }
    } catch (error) {
        console.error("Failed to mark user as attendee:", error);
        // Revert optimistic update on failure
        queryClient.invalidateQueries({ queryKey: ['meetings'] });
    }
  }, [supabaseClient, currentUser, queryClient]);

  const value = { handleAddMeeting, handleDeleteMeeting, handleJoinMeeting };

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
};

export const useMeetingContext = () => {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeetingContext must be used within a MeetingProvider');
  }
  return context;
};
