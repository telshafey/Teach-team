import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Meeting, MeetingFormData } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { createNotification } from '../services/notificationService';
import { useAuth } from './AuthContext';
import { useSettingsContext } from './SettingsContext';

export interface MeetingContextType {
  meetings: Meeting[];
  isLoading: boolean;
  handleAddMeeting: (formData: MeetingFormData) => Promise<void>;
  handleDeleteMeeting: (meetingId: string) => Promise<void>;
  handleJoinMeeting: (meetingId: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const MeetingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const { siteSettings } = useSettingsContext();
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
      const [meetingsRes, participantsRes] = await Promise.all([
        supabaseClient.from('meetings').select('*'),
        supabaseClient.from('meeting_participants').select('meeting_id, team_member_id')
      ]);

      if (meetingsRes.error) throw meetingsRes.error;
      if (participantsRes.error) throw participantsRes.error;

      const baseMeetings: Omit<Meeting, 'members'>[] = api.snakeToCamel(meetingsRes.data);
      const participants = participantsRes.data as { meeting_id: string; team_member_id: number }[];
      
      const participantsByMeetingId = participants.reduce((acc, p) => {
          if (!acc[p.meeting_id]) {
              acc[p.meeting_id] = [];
          }
          acc[p.meeting_id].push(p.team_member_id);
          return acc;
      }, {} as Record<string, number[]>);

      const meetingsWithMembers = baseMeetings.map(meeting => ({
          ...meeting,
          members: participantsByMeetingId[meeting.id] || [],
      }));

      setMeetings(meetingsWithMembers);

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

      const handleDataChange = () => {
        // Refetch all meeting data when either meetings or participants change.
        // This is simpler and more robust for a many-to-many relationship.
        fetchData();
      };

      const meetingsChannel = supabaseClient.channel('meetings_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, handleDataChange).subscribe();
      const participantsChannel = supabaseClient.channel('meeting_participants_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_participants' }, handleDataChange).subscribe();
      
      return () => {
        supabaseClient.removeChannel(meetingsChannel);
        supabaseClient.removeChannel(participantsChannel);
      };
    } else {
        setMeetings([]);
    }
  }, [supabaseClient, currentUser, fetchData]);

  const handleAddMeeting = async (formData: MeetingFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
      const { title, members, startTime, duration, projectId } = formData;
      const defaultRoom = siteSettings?.meetingSettings?.defaultMeetingRoom;
      
      if (!defaultRoom || defaultRoom.trim() === '') {
          addToast('خطأ: لم يتم تحديد غرفة الاجتماعات الافتراضية في الإعدادات.', 'error');
          throw new Error('Default meeting room is not configured or is empty.');
      }

      const roomName = defaultRoom;
      const meetingId = crypto.randomUUID();
      
      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      // 1. Create meeting record without members array
      const newMeetingPayload = {
        id: meetingId,
        title,
        roomName,
        scheduledTime: startDate.toISOString(),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        creatorId: currentUser.id,
        projectId: projectId || null,
      };

      const { data: createdMeetingData, error: meetingError } = await supabaseClient
        .from('meetings')
        .insert(api.camelToSnake(newMeetingPayload))
        .select()
        .single();
      
      if (meetingError) throw meetingError;

      const createdMeeting = api.snakeToCamel(createdMeetingData);

      // 2. Insert members into the join table
      if (members && members.length > 0) {
        const participantsData = members.map(memberId => ({
            meeting_id: createdMeeting.id,
            team_member_id: memberId,
        }));
        const { error: participantsError } = await supabaseClient
            .from('meeting_participants')
            .insert(participantsData);
        if (participantsError) {
            console.error("Failed to add participants:", participantsError);
            addToast('تم إنشاء الاجتماع ولكن فشلت إضافة المشاركين.', 'error');
        }
      }
      
      // Local state update
      const newMeetingForState: Meeting = { ...createdMeeting, members: members };
      setMeetings(prev => [...prev, newMeetingForState]);
      
      // 3. Send notifications
      for (const memberId of members) {
          if (memberId !== currentUser.id) {
              await createNotification(supabaseClient, {
                  recipientId: memberId,
                  type: 'meeting_scheduled',
                  taskTitle: title,
                  assignerName: currentUser.name,
                  projectId: projectId,
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
      // Deleting from `meetings` should cascade to `meeting_participants` if FK is set up correctly.
      await api.deleteById(supabaseClient, 'meetings', meetingId);
      // Local state update
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      addToast('تم حذف الاجتماع بنجاح.', 'success');
    } catch (e: any) {
      addToast(`فشل حذف الاجتماع: ${e.message}`, 'error'); throw e;
    }
  };

  const handleJoinMeeting = async (meetingId: string) => {
    if (!supabaseClient || !currentUser) return;

    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    const currentAttendees = meeting.attendees || [];
    if (currentAttendees.includes(currentUser.id)) {
        return; // Already recorded
    }

    const newAttendees = [...currentAttendees, currentUser.id];
    
    try {
        const updatedMeeting = { ...meeting, attendees: newAttendees };
        setMeetings(prev => prev.map(m => m.id === meetingId ? updatedMeeting : m));
        await api.update<Meeting>(supabaseClient, 'meetings', meetingId, { attendees: newAttendees });
    } catch (error: any) {
        setMeetings(prev => prev.map(m => m.id === meetingId ? meeting : m));
        console.error("Failed to record attendance:", error.message);
    }
  };

  const value = { meetings, isLoading, handleAddMeeting, handleDeleteMeeting, handleJoinMeeting, fetchData };

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