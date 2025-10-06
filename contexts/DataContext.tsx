import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { TeamMember, DailyLog, Notification, Meeting, ExpenseClaim, SiteSettings, Role, TeamMemberFormData, DailyLogFormData, MeetingFormData, PlanStatus, ExpenseClaimFormData } from '../types';
import { initialData } from '../App.initialData';
import { slugify } from '../utils/slugify';

interface AppDataContextType {
  teamMembers: TeamMember[];
  dailyLogs: DailyLog[];
  notifications: Notification[];
  meetings: Meeting[];
  expenseClaims: ExpenseClaim[];
  siteSettings: SiteSettings | null;
  currency: string;
  roles: Role[];
  isLoading: boolean;
  
  handleUpdateMember: (memberId: number, data: Partial<TeamMember>) => Promise<void>;
  handleAddMember: (memberData: TeamMemberFormData) => Promise<void>;

  // FIX: Changed DailyLogFormData to Omit<DailyLog, 'id'> to correctly type the data for a new log.
  handleAddDailyLog: (logData: Omit<DailyLog, 'id'>) => Promise<void>;
  handleUpdateDailyLog: (log: DailyLog) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
  
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  
  handleAddMeeting: (meetingData: MeetingFormData) => Promise<void>;
  
  handleUpdatePlanStatus: (memberId: number, status: PlanStatus) => Promise<void>;

  handleSubmitExpenseClaim: (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
  handleUpdateExpenseClaimStatus: (claimId: string, status: 'approved' | 'rejected') => Promise<void>;

  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
  
  handleUpdateRole: (role: Role) => Promise<void>;
  handleAddRole: (roleData: { name: string, permissions?: string[] }) => Promise<Role>;
  handleDeleteRole: (roleId: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(initialData.siteSettings);
  const [roles, setRoles] = useState<Role[]>([]);

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
        notificationsData,
        meetingsData,
        claimsData,
        settingsData,
        rolesData
      ] = await Promise.all([
        api.fetchTeamMembers(supabaseClient),
        api.fetchDailyLogs(supabaseClient),
        api.fetchNotifications(supabaseClient),
        api.fetchMeetings(supabaseClient),
        api.fetchExpenseClaims(supabaseClient),
        api.fetchSiteSettings(supabaseClient),
        api.fetchRoles(supabaseClient)
      ]);
      setTeamMembers(membersData);
      setDailyLogs(logsData);
      setNotifications(notificationsData);
      setMeetings(meetingsData);
      setExpenseClaims(claimsData);
      setSiteSettings(settingsData || initialData.siteSettings);
      setRoles(rolesData);
    } catch (error) {
      console.error("Failed to fetch app data:", error);
      addToast("فشل تحميل بيانات التطبيق.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, supabaseClient, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Team Member Handlers
  const handleUpdateMember = async (memberId: number, data: Partial<TeamMember>) => {
    if (!supabaseClient) return;
    try {
      await api.update(supabaseClient, 'team_members', memberId, data);
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...data } : m));
      addToast('تم تحديث بيانات العضو بنجاح.', 'success');
    } catch (error) {
      addToast('فشل تحديث بيانات العضو.', 'error');
      throw error;
    }
  };

  const handleAddMember = async (memberData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    try {
      await api.createNewUser(supabaseClient, memberData);
      addToast('تمت إضافة العضو بنجاح. سيتم تحديث القائمة.', 'success');
      fetchData(); // Refetch all data to get the new member
    } catch (error) {
      addToast('فشل إضافة العضو.', 'error');
      throw error;
    }
  };


  // Daily Log Handlers
  // FIX: Changed DailyLogFormData to Omit<DailyLog, 'id'> to correctly type the data for a new log. This fixes the runtime bug of missing teamMemberId and date on insert.
  const handleAddDailyLog = async (logData: Omit<DailyLog, 'id'>) => {
    if (!supabaseClient) return;
    try {
      const newLog = await api.insert(supabaseClient, 'daily_logs', logData);
      setDailyLogs(prev => [...prev, newLog]);
      addToast('تمت إضافة السجل بنجاح.', 'success');
    } catch (error) {
      addToast('فشل إضافة السجل.', 'error');
    }
  };

  const handleUpdateDailyLog = async (log: DailyLog) => {
    if (!supabaseClient) return;
    try {
      const updatedLog = await api.update(supabaseClient, 'daily_logs', log.id, log);
      setDailyLogs(prev => prev.map(l => l.id === log.id ? updatedLog[0] : l));
      addToast('تم تحديث السجل بنجاح.', 'success');
    } catch (error) {
      addToast('فشل تحديث السجل.', 'error');
    }
  };
  
  const handleDeleteDailyLog = async (logId: string) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, 'daily_logs', logId);
      setDailyLogs(prev => prev.filter(l => l.id !== logId));
      addToast('تم حذف السجل بنجاح.', 'success');
    } catch (error) {
      addToast('فشل حذف السجل.', 'error');
    }
  };

  // Notification Handler
  const markNotificationAsRead = async (notificationId: string) => {
    if (!supabaseClient) return;
    try {
      await api.update(supabaseClient, 'notifications', notificationId, { read: true });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  // Meeting Handler
  const handleAddMeeting = async (meetingData: MeetingFormData) => {
    if (!supabaseClient) return;
     try {
        const jitsiRoomName = `${slugify(meetingData.title)}-${Date.now()}`;
        const dataToInsert = { ...meetingData, jitsiRoomName };

        const { participants, ...restOfData } = dataToInsert;
        const newMeetingBase = await api.insert(supabaseClient, 'meetings', restOfData);
        
        const participantRecords = participants.map(pId => ({
            meeting_id: newMeetingBase.id,
            team_member_id: pId
        }));
        await supabaseClient.from('meeting_participants').insert(participantRecords);
        
        const newMeeting = { ...newMeetingBase, participants };

        setMeetings(prev => [...prev, newMeeting]);
        addToast('تمت جدولة الاجتماع بنجاح.', 'success');
    } catch (error) {
        addToast('فشل جدولة الاجتماع.', 'error');
        throw error;
    }
  };

  // Plan Status Handler
  const handleUpdatePlanStatus = async (memberId: number, status: PlanStatus) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;
    const updatedPlan = { ...member.weeklyPlan, status };
    await handleUpdateMember(memberId, { weeklyPlan: updatedPlan });
  };
  
  // Expense Claim Handlers
  const handleSubmitExpenseClaim = async (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => {
    if (!supabaseClient) return;
    try {
        const newClaim = await api.insert(supabaseClient, 'expense_claims', { ...claimData, status: 'pending' });
        setExpenseClaims(prev => [...prev, newClaim]);
        addToast('تم إرسال طلب الصرف للمراجعة.', 'success');
    } catch (error) {
        addToast('فشل إرسال طلب الصرف.', 'error');
        throw error;
    }
  };
  
  const handleUpdateExpenseClaimStatus = async (claimId: string, status: 'approved' | 'rejected') => {
    if (!supabaseClient) return;
    try {
      const updatedClaim = await api.update(supabaseClient, 'expense_claims', claimId, { status });
      setExpenseClaims(prev => prev.map(c => c.id === claimId ? updatedClaim[0] : c));
      addToast(`تم ${status === 'approved' ? 'اعتماد' : 'رفض'} الطلب.`, 'success');
    } catch (error) {
      addToast('فشل تحديث حالة الطلب.', 'error');
    }
  };

  // Site Settings Handler
  const handleUpdateSiteSettings = async (settings: SiteSettings) => {
    if (!supabaseClient) return;
    try {
        await api.upsert(supabaseClient, 'site_settings', { id: 1, settings });
        setSiteSettings(settings);
        if (settings.databaseSettings) {
            localStorage.setItem('supabase_settings', JSON.stringify(settings.databaseSettings));
        }
    } catch (error) {
        addToast('فشل تحديث الإعدادات.', 'error');
        throw error;
    }
  };

  // Role Handlers
  const handleUpdateRole = async (role: Role) => {
    if (!supabaseClient) return;
    try {
      const updatedRole = await api.update(supabaseClient, 'roles', role.id, role);
      setRoles(prev => prev.map(r => r.id === role.id ? updatedRole[0] : r));
      addToast('تم تحديث الدور بنجاح.', 'success');
    } catch (error) {
      addToast('فشل تحديث الدور.', 'error');
    }
  };

  const handleAddRole = async (roleData: { name: string, permissions?: string[] }) => {
    if (!supabaseClient) throw new Error("Supabase client not available");
    try {
      const newRoleData = { name: roleData.name, permissions: roleData.permissions || [] };
      const newRole = await api.insert(supabaseClient, 'roles', newRoleData);
      setRoles(prev => [...prev, newRole]);
      addToast('تمت إضافة الدور بنجاح.', 'success');
      return newRole;
    } catch (error) {
      addToast('فشل إضافة الدور.', 'error');
      throw error;
    }
  };
  
  const handleDeleteRole = async (roleId: string) => {
    if (!supabaseClient) return;
     const membersInRole = teamMembers.filter(m => m.roleId === roleId).length;
     if (membersInRole > 0) {
         addToast(`لا يمكن حذف الدور لوجود ${membersInRole} أعضاء مرتبطين به.`, 'error');
         throw new Error('Role has members');
     }
    try {
      await api.deleteById(supabaseClient, 'roles', roleId);
      setRoles(prev => prev.filter(r => r.id !== roleId));
      addToast('تم حذف الدور بنجاح.', 'success');
    } catch (error) {
      addToast('فشل حذف الدور.', 'error');
      throw error;
    }
  };

  const value = {
    teamMembers,
    dailyLogs,
    notifications,
    meetings,
    expenseClaims,
    siteSettings,
    currency,
    roles,
    isLoading,
    handleUpdateMember,
    handleAddMember,
    handleAddDailyLog,
    handleUpdateDailyLog,
    handleDeleteDailyLog,
    markNotificationAsRead,
    handleAddMeeting,
    handleUpdatePlanStatus,
    handleSubmitExpenseClaim,
    handleUpdateExpenseClaimStatus,
    handleUpdateSiteSettings,
    handleUpdateRole,
    handleAddRole,
    handleDeleteRole,
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
