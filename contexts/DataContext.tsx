import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import { useAuth } from './AuthContext';
import { useSupabase } from './SupabaseContext';
import {
  TeamMember,
  DailyLog,
  Role,
  SiteSettings,
  ExpenseClaim,
  Notification,
  Meeting,
  TeamMemberFormData,
  PlanStatus,
  Permission,
  RoleId,
  ExpenseClaimStatus,
  MeetingFormData
} from '../types';
import { useToast } from './ToastContext';
import { initialData } from '../App.initialData';
import { slugify } from '../utils/slugify';

interface AppDataContextType {
  teamMembers: TeamMember[];
  dailyLogs: DailyLog[];
  roles: Role[];
  siteSettings: SiteSettings | null;
  expenseClaims: ExpenseClaim[];
  notifications: Notification[];
  meetings: Meeting[];
  currency: string;
  isLoading: boolean;
  
  handleUpdateRole: (role: Role) => Promise<void>;
  handleAddRole: (roleData: { name: string, permissions?: Permission[] }) => Promise<Role>;
  handleDeleteRole: (roleId: RoleId) => Promise<void>;

  handleAddMember: (memberData: TeamMemberFormData) => Promise<void>;
  handleUpdateMember: (memberId: number, memberData: Partial<TeamMemberFormData | TeamMember>) => Promise<void>;

  handleAddDailyLog: (logData: Omit<DailyLog, 'id'>) => Promise<void>;
  handleUpdateDailyLog: (log: DailyLog) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
  handleUpdatePlanStatus: (memberId: number, status: PlanStatus) => Promise<void>;
  
  handleSubmitExpenseClaim: (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
  handleUpdateExpenseClaimStatus: (claimId: string, status: ExpenseClaimStatus) => Promise<void>;
  
  handleAddMeeting: (data: MeetingFormData) => Promise<void>;
  handleDeleteMeeting: (meetingId: string) => Promise<void>;

  markNotificationAsRead: (notificationId: string) => Promise<void>;
  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(initialData.siteSettings);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currency = siteSettings?.currency || 'USD';
  
  const fetchData = useCallback(async () => {
    if (!currentUser || !supabaseClient) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        membersData,
        logsData,
        rolesData,
        settingsData,
        claimsData,
        notificationsData,
        meetingsData
      ] = await Promise.all([
        api.fetchTeamMembers(supabaseClient),
        api.fetchDailyLogs(supabaseClient),
        api.fetchRoles(supabaseClient),
        api.fetchSiteSettings(supabaseClient),
        api.fetchExpenseClaims(supabaseClient),
        api.fetchNotifications(supabaseClient),
        api.fetchMeetings(supabaseClient)
      ]);
      
      setTeamMembers(membersData);
      setDailyLogs(logsData);
      setRoles(rolesData);
      setSiteSettings(settingsData);
      setExpenseClaims(claimsData);
      setNotifications(notificationsData);
      setMeetings(meetingsData);

    } catch (error: any) {
      addToast(`فشل تحميل بيانات التطبيق: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, supabaseClient, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!supabaseClient) return;

    const subscriptions = [
        supabaseClient.channel('public:team_members').on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => fetchData()).subscribe(),
        supabaseClient.channel('public:daily_logs').on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, () => fetchData()).subscribe(),
        supabaseClient.channel('public:roles').on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => fetchData()).subscribe(),
        supabaseClient.channel('public:expense_claims').on('postgres_changes', { event: '*', schema: 'public', table: 'expense_claims' }, () => fetchData()).subscribe(),
        supabaseClient.channel('public:notifications').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchData()).subscribe(),
        supabaseClient.channel('public:meetings').on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchData()).subscribe(),
        supabaseClient.channel('public:site_settings').on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => fetchData()).subscribe(),
    ];

    return () => {
        subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [supabaseClient, fetchData]);

  // Roles
  const handleUpdateRole = async (role: Role) => {
      if (!supabaseClient) return;
      const originalRoles = [...roles];
      setRoles(prev => prev.map(r => r.id === role.id ? role : r));
      try {
          await api.update(supabaseClient, 'roles', role.id, role);
          addToast(`تم تحديث دور "${role.name}" بنجاح.`, 'success');
      } catch (error) {
          addToast('فشل تحديث الدور.', 'error');
          setRoles(originalRoles);
      }
  };

  const handleAddRole = async (roleData: { name: string, permissions?: Permission[] }): Promise<Role> => {
      if (!supabaseClient) throw new Error("No client");
      try {
          const newRole = await api.insert<Role>(supabaseClient, 'roles', { ...roleData, permissions: roleData.permissions || [] });
          setRoles(prev => [...prev, newRole]);
          addToast(`تمت إضافة دور "${newRole.name}" بنجاح.`, 'success');
          return newRole;
      } catch (error) {
          addToast('فشل إضافة الدور.', 'error');
          throw error;
      }
  };

  const handleDeleteRole = async (roleId: RoleId) => {
      if (!supabaseClient) return;
      if (teamMembers.some(m => m.roleId === roleId)) {
        addToast('لا يمكن حذف الدور لأنه مسند لأعضاء حاليين.', 'error');
        throw new Error('Role is in use');
      }
      const originalRoles = [...roles];
      setRoles(prev => prev.filter(r => r.id !== roleId));
      try {
          await api.deleteById(supabaseClient, 'roles', roleId);
          addToast('تم حذف الدور بنجاح.', 'success');
      } catch (error) {
          addToast('فشل حذف الدور.', 'error');
          setRoles(originalRoles);
          throw error;
      }
  };

  // Team Members
  const handleAddMember = async (memberData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    try {
        const { data: user, error: authError } = await supabaseClient.auth.signUp({
            email: memberData.email!,
            password: memberData.password!,
            options: {
                data: {
                    full_name: memberData.name,
                    avatar_url: memberData.avatarUrl,
                }
            }
        });
        if (authError) throw authError;
        if (!user.user) throw new Error("User not created");

        const profileData = { ...memberData, authUserId: user.user.id };
        delete profileData.password;

        const newMember = await api.insert<TeamMember>(supabaseClient, 'team_members', profileData);
        setTeamMembers(prev => [...prev, newMember]);
        addToast(`تمت إضافة عضو جديد: ${newMember.name}`, 'success');
    } catch (error: any) {
        addToast(`فشل إضافة عضو: ${error.message}`, 'error');
        throw error;
    }
  };

  const handleUpdateMember = async (memberId: number, memberData: Partial<TeamMemberFormData | TeamMember>) => {
      if (!supabaseClient) return;
      const originalMembers = [...teamMembers];
      const optimisticUpdatedMember = { ...teamMembers.find(m => m.id === memberId)!, ...memberData };
      setTeamMembers(prev => prev.map(m => m.id === memberId ? optimisticUpdatedMember : m));
      try {
          await api.update<TeamMember>(supabaseClient, 'team_members', memberId, memberData);
          addToast(`تم تحديث بيانات ${optimisticUpdatedMember.name}`, 'success');
      } catch (error) {
          addToast('فشل تحديث بيانات العضو.', 'error');
          setTeamMembers(originalMembers);
          throw error;
      }
  };

  // Daily Logs
  const handleAddDailyLog = async (logData: Omit<DailyLog, 'id'>) => {
      if (!supabaseClient) return;
      try {
          const newLog = await api.insert<DailyLog>(supabaseClient, 'daily_logs', logData);
          setDailyLogs(prev => [...prev, newLog]);
          addToast('تم حفظ السجل بنجاح.', 'success');
      } catch (error) {
          addToast('فشل حفظ السجل.', 'error');
      }
  };

  const handleUpdateDailyLog = async (log: DailyLog) => {
      if (!supabaseClient) return;
      const originalLogs = [...dailyLogs];
      setDailyLogs(prev => prev.map(l => l.id === log.id ? log : l));
      try {
          await api.update<DailyLog>(supabaseClient, 'daily_logs', log.id, log);
          addToast('تم تحديث السجل.', 'success');
      } catch (error) {
          addToast('فشل تحديث السجل.', 'error');
          setDailyLogs(originalLogs);
      }
  };
  
  const handleDeleteDailyLog = async (logId: string) => {
      if (!supabaseClient) return;
      const originalLogs = [...dailyLogs];
      setDailyLogs(prev => prev.filter(l => l.id !== logId));
      try {
          await api.deleteById(supabaseClient, 'daily_logs', logId);
          addToast('تم حذف السجل.', 'success');
      } catch (error) {
          addToast('فشل حذف السجل.', 'error');
          setDailyLogs(originalLogs);
      }
  };
  
  // Plans
  const handleUpdatePlanStatus = async (memberId: number, status: PlanStatus) => {
    if (!supabaseClient) return;
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    const originalMember = { ...member };
    const updatedPlan = { ...member.weeklyPlan, status };
    const updatedMember = { ...member, weeklyPlan: updatedPlan };
    setTeamMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));

    try {
        await handleUpdateMember(memberId, { weeklyPlan: updatedPlan });
        addToast(`تم تحديث حالة الخطة لـ ${member.name}.`, 'success');
    } catch (error) {
        addToast('فشل تحديث حالة الخطة.', 'error');
        setTeamMembers(prev => prev.map(m => m.id === memberId ? originalMember : m)); // Revert
    }
  };

  // Expenses
  const handleSubmitExpenseClaim = async (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => {
    if (!supabaseClient) return;
    try {
      const newClaim = await api.insert<ExpenseClaim>(supabaseClient, 'expense_claims', { ...claimData, status: 'pending' });
      setExpenseClaims(prev => [...prev, newClaim]);
      addToast('تم تقديم طلب الصرف بنجاح.', 'success');
    } catch (error) {
      addToast('فشل تقديم طلب الصرف.', 'error');
    }
  };

  const handleUpdateExpenseClaimStatus = async (claimId: string, status: ExpenseClaimStatus) => {
    if (!supabaseClient) return;
    const originalClaims = [...expenseClaims];
    setExpenseClaims(prev => prev.map(c => c.id === claimId ? { ...c, status } : c));
    try {
        await api.update(supabaseClient, 'expense_claims', claimId, { status });
        addToast('تم تحديث حالة طلب الصرف.', 'success');
    } catch (error) {
        addToast('فشل تحديث حالة الطلب.', 'error');
        setExpenseClaims(originalClaims);
    }
  };
  
  // Meetings
  const handleAddMeeting = async (data: MeetingFormData) => {
    if (!supabaseClient || !currentUser) return;
    
    // Ensure the creator is always a participant
    const finalParticipants = Array.from(new Set([...data.participants, currentUser.id]));

    const meetingData = {
      title: data.title,
      scheduledTime: data.scheduledTime,
      jitsiRoomName: `BokraTeam-${slugify(data.title)}-${Date.now()}`,
    };

    // FIX: Correctly type newMeetingRecord to Omit<Meeting, 'participants'>
    let newMeetingRecord: Omit<Meeting, 'participants'> | null = null;
    try {
      // Step 1: Insert the meeting record
      newMeetingRecord = await api.insert<Omit<Meeting, 'participants'>>(supabaseClient, 'meetings', meetingData);

      // Step 2: Insert participants into the join table
      const participantData = finalParticipants.map(memberId => ({
        meeting_id: newMeetingRecord!.id,
        team_member_id: memberId,
      }));
      
      await api.insertMany(supabaseClient, 'meeting_participants', participantData);
      
      // Step 3: Update local state with the complete meeting object
      const newMeetingWithParticipants: Meeting = { ...newMeetingRecord, participants: finalParticipants };
      setMeetings(prev => [...prev, newMeetingWithParticipants]);
      
      addToast('تم جدولة الاجتماع بنجاح.', 'success');

    } catch (error: any) {
      addToast(`فشل حفظ الاجتماع: ${error.message}`, 'error');

      // Rollback: If participant insertion fails, delete the meeting record.
      if (newMeetingRecord) {
        await api.deleteById(supabaseClient, 'meetings', newMeetingRecord.id);
      }
      
      // Re-throw the error so the calling component knows it failed
      throw error;
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!supabaseClient) return;
    const originalMeetings = [...meetings];
    setMeetings(prev => prev.filter(m => m.id !== meetingId));
    try {
        await api.deleteById(supabaseClient, 'meetings', meetingId);
        addToast('تم حذف الاجتماع.', 'success');
    } catch (error) {
        addToast('فشل حذف الاجتماع.', 'error');
        setMeetings(originalMeetings);
    }
  };
  
  // Notifications
  const markNotificationAsRead = async (notificationId: string) => {
      if (!supabaseClient) return;
      const originalNotifications = [...notifications];
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      try {
          await api.update(supabaseClient, 'notifications', notificationId, { read: true });
      } catch (error) {
          console.error("Failed to mark notification as read", error);
          setNotifications(originalNotifications);
      }
  };

  // Site Settings
  const handleUpdateSiteSettings = async (settings: SiteSettings) => {
      if (!supabaseClient) return;
      const originalSettings = siteSettings;
      setSiteSettings(settings);
      try {
          await api.updateSiteSettings(supabaseClient, settings);
      } catch (error) {
          addToast('فشل حفظ الإعدادات.', 'error');
          setSiteSettings(originalSettings);
          throw error;
      }
  };


  const value = {
    teamMembers,
    dailyLogs,
    roles,
    siteSettings,
    expenseClaims,
    notifications,
    meetings,
    currency,
    isLoading,
    handleUpdateRole,
    handleAddRole,
    handleDeleteRole,
    handleAddMember,
    handleUpdateMember,
    handleAddDailyLog,
    handleUpdateDailyLog,
    handleDeleteDailyLog,
    handleUpdatePlanStatus,
    handleSubmitExpenseClaim,
    handleUpdateExpenseClaimStatus,
    handleAddMeeting,
    handleDeleteMeeting,
    markNotificationAsRead,
    handleUpdateSiteSettings,
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