import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import { useAuth } from './AuthContext';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import {
  TeamMember, Role, DailyLog, SiteSettings, Notification, Meeting, ExpenseClaim,
  TeamMemberFormData, DailyLogFormData, PlanStatus, RoleId, MeetingFormData, ExpenseClaimFormData
} from '../types';
import { initialData } from '../App.initialData';
import { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_SETTINGS_KEY = 'supabase_settings';

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
  
  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
  handleAddMember: (memberData: TeamMemberFormData) => Promise<void>;
  handleUpdateMember: (memberId: number, memberData: Partial<TeamMemberFormData>) => Promise<void>;
  handleAddDailyLog: (logData: Omit<DailyLog, 'id'>) => Promise<void>;
  handleUpdateDailyLog: (log: DailyLog) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  handleUpdatePlanStatus: (memberId: number, status: PlanStatus) => Promise<void>;
  handleAddRole: (roleData: { name: string, permissions?: string[] }) => Promise<Role>;
  handleUpdateRole: (role: Role) => Promise<void>;
  handleDeleteRole: (roleId: RoleId) => Promise<void>;
  handleSubmitExpenseClaim: (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
  handleUpdateExpenseClaimStatus: (claimId: string, status: 'approved' | 'rejected') => Promise<void>;
  handleAddMeeting: (meetingData: MeetingFormData) => Promise<void>;
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

  const fetchData = useCallback(async (client: SupabaseClient) => {
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
        api.fetchTeamMembers(client),
        api.fetchDailyLogs(client),
        api.fetchNotifications(client),
        api.fetchMeetings(client),
        api.fetchExpenseClaims(client),
        api.fetchSiteSettings(client),
        api.fetchRoles(client),
      ]);

      setTeamMembers(membersData);
      setDailyLogs(logsData);
      setNotifications(notificationsData);
      setMeetings(meetingsData);
      setExpenseClaims(claimsData);
      setSiteSettings(settingsData || initialData.siteSettings);
      setRoles(rolesData);

    } catch (error: any) {
      addToast(`فشل تحميل البيانات: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (currentUser && supabaseClient) {
      fetchData(supabaseClient);
    } else {
      setIsLoading(false);
    }
  }, [currentUser, supabaseClient, fetchData]);

  const handleUpdateSiteSettings = async (settings: SiteSettings) => {
    if (!supabaseClient) return;
    try {
        const { data } = await supabaseClient.from('site_settings').update({ settings: api.camelToSnake(settings) }).eq('id', 1).select().single();
        if (data) {
            const newSettings = api.snakeToCamel(data.settings) as SiteSettings;
            setSiteSettings(newSettings);
            // Also update local storage for next app load
            if(newSettings.databaseSettings) {
                localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify(newSettings.databaseSettings));
            }
        }
    } catch(error) {
        addToast('فشل تحديث الإعدادات.', 'error');
        throw error;
    }
  };

  const handleAddMember = async (memberData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    const { password, ...profileData } = memberData;
    if (!password) throw new Error("Password is required for new members.");
    
    // Create auth user
    const { data: authData, error: signUpError } = await supabaseClient.auth.signUp({
        email: profileData.email!,
        password: password,
    });

    if (signUpError) {
      addToast(`فشل إنشاء المستخدم: ${signUpError.message}`, 'error');
      throw signUpError;
    }

    if (authData.user) {
        try {
            // Create user profile
            const newMember = await api.insert<TeamMember>(supabaseClient, 'team_members', {
                ...profileData,
                authUserId: authData.user.id
            });
            setTeamMembers(prev => [...prev, newMember]);
            addToast(`تمت إضافة ${newMember.name} بنجاح.`, 'success');
        } catch (profileError) {
            // Rollback auth user creation if profile fails
            // In a real app, you might want a more robust transaction/cleanup process
            // For now, we'll just log it. Supabase admin can delete the orphaned auth user.
            console.error("Failed to create profile, auth user might be orphaned:", profileError);
            addToast('فشل إنشاء ملف تعريف المستخدم.', 'error');
            throw profileError;
        }
    }
  };

  const handleUpdateMember = async (memberId: number, memberData: Partial<TeamMemberFormData>) => {
    if (!supabaseClient) return;
    try {
        const updatedMember = await api.update<TeamMember>(supabaseClient, 'team_members', memberId, memberData);
        setTeamMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
        addToast(`تم تحديث بيانات ${updatedMember.name}.`, 'success');
    } catch (error) {
        addToast('فشل تحديث بيانات العضو.', 'error');
        throw error;
    }
  };
  
  const handleAddDailyLog = async (logData: Omit<DailyLog, 'id'>) => {
    if (!supabaseClient) return;
    try {
        const newLog = await api.insert<DailyLog>(supabaseClient, 'daily_logs', logData);
        setDailyLogs(prev => [...prev, newLog]);
        addToast('تم تسجيل النشاط بنجاح.', 'success');
    } catch (error) {
        addToast('فشل تسجيل النشاط.', 'error');
        throw error;
    }
  };

  const handleUpdateDailyLog = async (log: DailyLog) => {
    if (!supabaseClient) return;
    try {
        const updatedLog = await api.update<DailyLog>(supabaseClient, 'daily_logs', log.id, log);
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
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    try {
      await api.update(supabaseClient, 'notifications', notificationId, { read: true });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      // Optionally revert state, but for UX it might be better to leave it as read.
    }
  };
  
  const handleUpdatePlanStatus = async (memberId: number, status: PlanStatus) => {
    if (!supabaseClient) return;
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;
    const updatedPlan = { ...member.weeklyPlan, status };
    try {
        const updatedMember = await api.update<TeamMember>(supabaseClient, 'team_members', memberId, { weeklyPlan: updatedPlan });
        setTeamMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
        addToast(`تم تحديث حالة الخطة لـ ${member.name}.`, 'success');
    } catch (error) {
        addToast('فشل تحديث حالة الخطة.', 'error');
        throw error;
    }
  };

  const handleAddRole = async (roleData: { name: string, permissions?: string[] }): Promise<Role> => {
    if (!supabaseClient) throw new Error("Client not ready");
    try {
        const newRole = await api.insert<Role>(supabaseClient, 'roles', { ...roleData, permissions: roleData.permissions || [] });
        setRoles(prev => [...prev, newRole]);
        addToast('تم إنشاء الدور بنجاح.', 'success');
        return newRole;
    } catch (error) {
        addToast('فشل إنشاء الدور.', 'error');
        throw error;
    }
  };
  
  const handleUpdateRole = async (role: Role) => {
    if (!supabaseClient) return;
    try {
        const updatedRole = await api.update<Role>(supabaseClient, 'roles', role.id, role);
        setRoles(prev => prev.map(r => r.id === role.id ? updatedRole : r));
        addToast(`تم تحديث دور "${role.name}".`, 'success');
    } catch (error) {
        addToast('فشل تحديث الدور.', 'error');
        throw error;
    }
  };

  const handleDeleteRole = async (roleId: RoleId) => {
    if (!supabaseClient) return;
    if (teamMembers.some(m => m.roleId === roleId)) {
        addToast('لا يمكن حذف الدور لأنه مسند لأحد أعضاء الفريق.', 'error');
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

    const handleSubmitExpenseClaim = async (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => {
        if (!supabaseClient) return;
        try {
            const newClaim = await api.insert<ExpenseClaim>(supabaseClient, 'expense_claims', {
                ...claimData,
                status: 'pending'
            });
            setExpenseClaims(prev => [...prev, newClaim]);
            addToast('تم تقديم طلب الصرف بنجاح.', 'success');
        } catch (error) {
            addToast('فشل تقديم طلب الصرف.', 'error');
            throw error;
        }
    };
    
    const handleUpdateExpenseClaimStatus = async (claimId: string, status: 'approved' | 'rejected') => {
        if (!supabaseClient) return;
        try {
            const updatedClaim = await api.update<ExpenseClaim>(supabaseClient, 'expense_claims', claimId, { status });
            setExpenseClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
            addToast('تم تحديث حالة طلب الصرف.', 'success');
        } catch (error) {
            addToast('فشل تحديث حالة الطلب.', 'error');
            throw error;
        }
    };

    const handleAddMeeting = async (meetingData: MeetingFormData) => {
        if (!supabaseClient) return;
        const jitsiRoomName = `BokraTeamMeeting-${Date.now()}`;
        try {
            const newMeeting = await api.insert<Meeting>(supabaseClient, 'meetings', { ...meetingData, jitsiRoomName });
            setMeetings(prev => [...prev, newMeeting]);
            addToast('تم جدولة الاجتماع بنجاح.', 'success');
        } catch (error) {
            addToast('فشل جدولة الاجتماع.', 'error');
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
    currency: siteSettings?.currency || 'USD',
    roles,
    isLoading,
    handleUpdateSiteSettings,
    handleAddMember,
    handleUpdateMember,
    handleAddDailyLog,
    handleUpdateDailyLog,
    handleDeleteDailyLog,
    markNotificationAsRead,
    handleUpdatePlanStatus,
    handleAddRole,
    handleUpdateRole,
    handleDeleteRole,
    handleSubmitExpenseClaim,
    handleUpdateExpenseClaimStatus,
    handleAddMeeting,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppDataContext = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppDataContext must be used within a DataProvider');
  }
  return context;
};
