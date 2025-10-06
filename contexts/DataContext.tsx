import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import { useAuth } from './AuthContext';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { initialData } from '../App.initialData';
import { slugify } from '../utils/slugify';
import {
  TeamMember,
  DailyLog,
  Notification,
  Meeting,
  ExpenseClaim,
  Role,
  SiteSettings,
  TeamMemberFormData,
  DailyLogFormData,
  MeetingFormData,
  PlanStatus,
  ExpenseClaimStatus,
  RoleId,
} from '../types';

interface AppDataContextType {
  teamMembers: TeamMember[];
  dailyLogs: DailyLog[];
  notifications: Notification[];
  meetings: Meeting[];
  expenseClaims: ExpenseClaim[];
  roles: Role[];
  siteSettings: SiteSettings | null;
  currency: string;
  isLoading: boolean;
  
  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
  handleAddMember: (memberData: TeamMemberFormData) => Promise<void>;
  handleUpdateMember: (memberId: number, memberData: Partial<TeamMemberFormData>) => Promise<void>;
  handleAddDailyLog: (logData: Omit<DailyLog, 'id'>) => Promise<void>;
  handleUpdateDailyLog: (log: DailyLog) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  handleAddMeeting: (meetingData: MeetingFormData) => Promise<void>;
  handleUpdatePlanStatus: (memberId: number, status: PlanStatus) => Promise<void>;
  handleSubmitExpenseClaim: (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
  handleUpdateExpenseClaimStatus: (claimId: string, status: ExpenseClaimStatus) => Promise<void>;
  handleAddRole: (roleData: { name: string, permissions?: string[] }) => Promise<Role>;
  handleUpdateRole: (role: Role) => Promise<void>;
  handleDeleteRole: (roleId: RoleId) => Promise<void>;
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(initialData.siteSettings);
  const [isLoading, setIsLoading] = useState(true);

  const currency = siteSettings?.currency || 'USD';

  const fetchData = useCallback(async () => {
    if (!currentUser || !supabaseClient) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);

    try {
      const [
        teamMembersData,
        dailyLogsData,
        notificationsData,
        meetingsData,
        expenseClaimsData,
        rolesData,
        siteSettingsData
      ] = await Promise.all([
        api.fetchTeamMembers(supabaseClient),
        api.fetchDailyLogs(supabaseClient),
        api.fetchNotifications(supabaseClient),
        api.fetchMeetings(supabaseClient),
        api.fetchExpenseClaims(supabaseClient),
        api.fetchRoles(supabaseClient),
        api.fetchSiteSettings(supabaseClient)
      ]);

      setTeamMembers(teamMembersData);
      setDailyLogs(dailyLogsData);
      setNotifications(notificationsData);
      setMeetings(meetingsData);
      setExpenseClaims(expenseClaimsData);
      setRoles(rolesData);
      if (siteSettingsData) {
        setSiteSettings(siteSettingsData);
        // Also update theme color variable in CSS
        document.documentElement.style.setProperty('--theme-color-500', siteSettingsData.themeColor);
        document.documentElement.style.setProperty('--theme-color-600', siteSettingsData.themeColor);
        document.documentElement.style.setProperty('--theme-color-700', siteSettingsData.themeColor);
        document.documentElement.style.setProperty('--theme-color-100', `${siteSettingsData.themeColor}1A`); // with opacity
      }
      
    } catch (error: any) {
      addToast(`فشل تحميل بيانات التطبيق: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, supabaseClient, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers for data manipulation
  
  const handleUpdateSiteSettings = async (settings: SiteSettings) => {
    if (!supabaseClient) return;
    try {
      await api.upsert(supabaseClient, 'site_settings', { id: 1, settings });
      setSiteSettings(settings);
      localStorage.setItem('supabase_settings', JSON.stringify(settings.databaseSettings));
    } catch (error) {
      addToast('فشل تحديث الإعدادات.', 'error');
      throw error;
    }
  };

  const handleAddMember = async (memberData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    try {
      const newMember = await api.createNewUser(supabaseClient, memberData);
      setTeamMembers(prev => [...prev, newMember]);
      addToast('تمت إضافة العضو بنجاح.', 'success');
    } catch (error) {
      addToast('فشل إضافة العضو.', 'error');
      throw error;
    }
  };

  const handleUpdateMember = async (memberId: number, memberData: Partial<TeamMemberFormData>) => {
    if (!supabaseClient) return;
    try {
      const [updatedMember] = await api.update(supabaseClient, 'team_members', memberId, memberData);
      setTeamMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
      addToast('تم تحديث بيانات العضو.', 'success');
    } catch (error) {
      addToast('فشل تحديث بيانات العضو.', 'error');
      throw error;
    }
  };

  const handleAddDailyLog = async (logData: Omit<DailyLog, 'id'>) => {
    if (!supabaseClient) return;
    try {
      const newLog = await api.insert(supabaseClient, 'daily_logs', logData);
      setDailyLogs(prev => [...prev, newLog]);
      addToast('تم إضافة السجل بنجاح.', 'success');
    } catch (error) {
      addToast('فشل إضافة السجل.', 'error');
      throw error;
    }
  };

  const handleUpdateDailyLog = async (log: DailyLog) => {
    if (!supabaseClient) return;
    try {
      const [updatedLog] = await api.update(supabaseClient, 'daily_logs', log.id, log);
      setDailyLogs(prev => prev.map(l => l.id === log.id ? updatedLog : l));
      addToast('تم تحديث السجل.', 'success');
    } catch (error) {
      addToast('فشل تحديث السجل.', 'error');
      throw error;
    }
  };

  const handleDeleteDailyLog = async (logId: string) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, 'daily_logs', logId);
      setDailyLogs(prev => prev.filter(l => l.id !== logId));
      addToast('تم حذف السجل.', 'success');
    } catch (error) {
      addToast('فشل حذف السجل.', 'error');
      throw error;
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!supabaseClient) return;
    const originalNotifications = [...notifications];
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    try {
      await api.update(supabaseClient, 'notifications', notificationId, { read: true });
    } catch (error) {
      setNotifications(originalNotifications);
      addToast('فشل تحديث الإشعار.', 'error');
    }
  };

  const handleAddMeeting = async (meetingData: MeetingFormData) => {
    if (!supabaseClient) return;
    
    let newMeeting: Meeting | null = null;
    try {
      // Step 1: Create the meeting record
      newMeeting = await api.insert(supabaseClient, 'meetings', {
        title: meetingData.title,
        scheduled_time: meetingData.scheduledTime,
        jitsi_room_name: `TeemTime-${slugify(meetingData.title)}-${Date.now()}`
      });

      if (!newMeeting) {
          throw new Error("لم يتم إنشاء سجل الاجتماع.");
      }

      // Step 2: Prepare and insert participants
      const participantsData = meetingData.participants.map(memberId => ({
          meeting_id: newMeeting!.id,
          team_member_id: memberId
      }));
      
      if (participantsData.length > 0) {
        await api.insertMany(supabaseClient, 'meeting_participants', participantsData);
      }

      // If all successful, update the local state
      setMeetings(prev => [...prev, { ...newMeeting!, participants: meetingData.participants }]);
      addToast('تم جدولة الاجتماع بنجاح.', 'success');

    } catch (error: any) {
        // If any step fails, roll back
        if (newMeeting && newMeeting.id) {
            console.log(`Rolling back meeting creation (ID: ${newMeeting.id}) due to an error.`);
            await api.deleteById(supabaseClient, 'meetings', newMeeting.id);
        }
        
        const errorMessage = error.message || 'حدث خطأ غير معروف.';
        console.error("Full error object during meeting save:", error); 
        addToast(`فشل جدولة الاجتماع: ${errorMessage}`, 'error');
        throw error;
    }
  };

  const handleUpdatePlanStatus = async (memberId: number, status: PlanStatus) => {
    if (!supabaseClient) return;
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    const originalMembers = [...teamMembers];
    const updatedPlan = { ...member.weeklyPlan, status };
    const updatedMember = { ...member, weeklyPlan: updatedPlan };

    setTeamMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
    
    try {
      await api.update(supabaseClient, 'team_members', memberId, { weekly_plan: updatedPlan });
      addToast('تم تحديث حالة الخطة.', 'success');
    } catch (error) {
      setTeamMembers(originalMembers);
      addToast('فشل تحديث حالة الخطة.', 'error');
      throw error;
    }
  };

  const handleSubmitExpenseClaim = async (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => {
    if (!supabaseClient) return;
    try {
      const newClaim = await api.insert(supabaseClient, 'expense_claims', { ...claimData, status: 'pending' });
      setExpenseClaims(prev => [...prev, newClaim]);
      addToast('تم تقديم طلب الصرف بنجاح.', 'success');
    } catch (error) {
      addToast('فشل تقديم طلب الصرف.', 'error');
      throw error;
    }
  };
  
  const handleUpdateExpenseClaimStatus = async (claimId: string, status: ExpenseClaimStatus) => {
    if (!supabaseClient) return;
    const originalClaims = [...expenseClaims];
    const claimToUpdate = expenseClaims.find(c => c.id === claimId);
    if (!claimToUpdate) return;

    setExpenseClaims(prev => prev.map(c => c.id === claimId ? { ...c, status } : c));
    
    try {
      await api.update(supabaseClient, 'expense_claims', claimId, { status });
      addToast('تم تحديث حالة طلب الصرف.', 'success');
    } catch (error) {
      setExpenseClaims(originalClaims);
      addToast('فشل تحديث حالة طلب الصرف.', 'error');
      throw error;
    }
  };

  const handleAddRole = async (roleData: { name: string, permissions?: string[] }): Promise<Role> => {
    if (!supabaseClient) throw new Error("Client not available");
    try {
      const newRole = await api.insert(supabaseClient, 'roles', { ...roleData, id: slugify(roleData.name), permissions: roleData.permissions || [] });
      setRoles(prev => [...prev, newRole]);
      addToast('تم إضافة الدور بنجاح.', 'success');
      return newRole;
    } catch (error) {
      addToast('فشل إضافة الدور. قد يكون المعرّف مستخدمًا بالفعل.', 'error');
      throw error;
    }
  };

  const handleUpdateRole = async (role: Role) => {
    if (!supabaseClient) return;
    const originalRoles = [...roles];
    setRoles(prev => prev.map(r => r.id === role.id ? role : r));

    try {
      await api.update(supabaseClient, 'roles', role.id, role);
      // No success toast needed for optimistic updates unless it's a critical action
    } catch (error) {
      setRoles(originalRoles);
      addToast('فشل تحديث الدور.', 'error');
      throw error;
    }
  };

  const handleDeleteRole = async (roleId: RoleId) => {
    if (!supabaseClient) return;
    const membersInRole = teamMembers.filter(m => m.roleId === roleId).length;
    if (membersInRole > 0) {
      addToast(`لا يمكن حذف الدور لأن هناك ${membersInRole} أعضاء مرتبطين به.`, 'error');
      throw new Error("Role is in use");
    }
    try {
      await api.deleteById(supabaseClient, 'roles', roleId);
      setRoles(prev => prev.filter(r => r.id !== roleId));
      addToast('تم حذف الدور.', 'success');
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
    roles,
    siteSettings,
    currency,
    isLoading,
    handleUpdateSiteSettings,
    handleAddMember,
    handleUpdateMember,
    handleAddDailyLog,
    handleUpdateDailyLog,
    handleDeleteDailyLog,
    markNotificationAsRead,
    handleAddMeeting,
    handleUpdatePlanStatus,
    handleSubmitExpenseClaim,
    handleUpdateExpenseClaimStatus,
    handleAddRole,
    handleUpdateRole,
    handleDeleteRole
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