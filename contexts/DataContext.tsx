import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import * as api from '../services/apiService';
import { SiteSettings, TeamMember, Role, DailyLog, Notification, Meeting, PlanStatus, RoleId, TeamMemberFormData, MeetingFormData, ExpenseClaim, ExpenseClaimFormData } from '../types';
import { useToast } from './ToastContext';

interface AppDataContextType {
  siteSettings: SiteSettings | null;
  teamMembers: TeamMember[];
  roles: Role[];
  dailyLogs: DailyLog[];
  notifications: Notification[];
  meetings: Meeting[];
  expenseClaims: ExpenseClaim[];
  currency: string;
  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  handleUpdatePlanStatus: (memberId: number, status: PlanStatus) => Promise<void>;
  handleBulkUpdatePlanStatus: (memberIds: number[], status: PlanStatus) => Promise<void>;
  handleAddDailyLog: (logData: Omit<DailyLog, 'id'>) => Promise<void>;
  handleUpdateDailyLog: (log: DailyLog) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
  handleUpdateRole: (role: Role) => Promise<void>;
  handleAddRole: (roleData: { name: string }) => Promise<Role>;
  handleDeleteRole: (roleId: RoleId) => Promise<void>;
  handleUpdateMember: (member: TeamMember) => Promise<void>;
  handleAddMeeting: (meetingData: MeetingFormData) => Promise<void>;
  handleSubmitExpenseClaim: (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();
  
  useEffect(() => {
    const loadData = async () => {
        try {
            const [settings, members, fetchedRoles, logs, notifs, fetchedMeetings, claims] = await Promise.all([
                api.fetchSiteSettings(),
                api.fetchTeamMembers(),
                api.fetchRoles(),
                api.fetchDailyLogs(),
                api.fetchNotifications(),
                api.fetchMeetings(),
                api.fetchExpenseClaims(),
            ]);
            setSiteSettings(settings);
            setTeamMembers(members);
            setRoles(fetchedRoles);
            setDailyLogs(logs);
            setNotifications(notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            setMeetings(fetchedMeetings);
            setExpenseClaims(claims);
        } catch (error) {
            console.error("Failed to load app data", error);
            addToast('فشل تحميل بيانات التطبيق', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [addToast]);
  
  const handleUpdateSiteSettings = useCallback(async (settings: SiteSettings) => {
    const updatedSettings = await api.updateSiteSettings(settings);
    setSiteSettings(updatedSettings);
    document.documentElement.style.setProperty('--theme-color-100', `${settings.themeColor}1A`);
    document.documentElement.style.setProperty('--theme-color-500', settings.themeColor);
    document.documentElement.style.setProperty('--theme-color-600', settings.themeColor);
    document.documentElement.style.setProperty('--theme-color-700', settings.themeColor);
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);
  
  const markNotificationAsRead = useCallback((notificationId: string) => {
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
  }, []);

  const handleUpdatePlanStatus = useCallback(async (memberId: number, status: PlanStatus) => {
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, weeklyPlan: { ...m.weeklyPlan, status }} : m));
  }, []);

  const handleBulkUpdatePlanStatus = useCallback(async (memberIds: number[], status: PlanStatus) => {
    setTeamMembers(prev => prev.map(m => memberIds.includes(m.id) ? { ...m, weeklyPlan: { ...m.weeklyPlan, status }} : m));
    addToast(`تم تحديث ${memberIds.length} خطط بنجاح`, 'success');
  }, [addToast]);
  
  const handleAddDailyLog = useCallback(async (logData: Omit<DailyLog, 'id'>) => {
    const newLog: DailyLog = { ...logData, id: `log_${Date.now()}` };
    setDailyLogs(prev => [...prev, newLog]);
    addToast('تمت إضافة السجل بنجاح', 'success');
  }, [addToast]);

  const handleUpdateDailyLog = useCallback(async (log: DailyLog) => {
    setDailyLogs(prev => prev.map(l => l.id === log.id ? log : l));
    addToast('تم تحديث السجل بنجاح', 'success');
  }, [addToast]);

  const handleDeleteDailyLog = useCallback(async (logId: string) => {
    setDailyLogs(prev => prev.filter(l => l.id !== logId));
    addToast('تم حذف السجل بنجاح', 'info');
  }, [addToast]);

  const handleUpdateRole = useCallback(async (role: Role) => {
      setRoles(prev => prev.map(r => r.id === role.id ? role : r));
      addToast('تم تحديث الدور بنجاح', 'success');
  }, [addToast]);

  const handleAddRole = useCallback(async (roleData: { name: string }): Promise<Role> => {
    const newRole: Role = { ...roleData, id: `role_${Date.now()}`, permissions: [] };
    setRoles(prev => [...prev, newRole]);
    addToast('تمت إضافة الدور بنجاح', 'success');
    return newRole;
  }, [addToast]);

  const handleDeleteRole = useCallback(async (roleId: RoleId) => {
      if (teamMembers.some(m => m.roleId === roleId)) {
        addToast('لا يمكن حذف الدور لوجود أعضاء معينين له', 'error');
        throw new Error('Role has members assigned');
      }
      setRoles(prev => prev.filter(r => r.id !== roleId));
      addToast('تم حذف الدور بنجاح', 'info');
  }, [teamMembers, addToast]);
  
  const handleUpdateMember = useCallback(async (member: TeamMember) => {
    setTeamMembers(prev => {
        const existing = prev.find(m => m.id === member.id);
        if (existing) {
            return prev.map(m => m.id === member.id ? member : m);
        }
        return [...prev, member];
    });
    addToast(teamMembers.some(m => m.id === member.id) ? 'تم تحديث العضو' : 'تمت إضافة العضو', 'success');
  }, [addToast, teamMembers]);

  const handleAddMeeting = useCallback(async (meetingData: MeetingFormData) => {
    const newMeeting: Meeting = {
        ...meetingData,
        id: `meet_${Date.now()}`,
        jitsiRoomName: `TeemTimeMeeting-${Date.now()}`
    };
    setMeetings(prev => [...prev, newMeeting]);
    addToast('تمت جدولة الاجتماع بنجاح', 'success');
  }, [addToast]);

  const handleSubmitExpenseClaim = useCallback(async (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => {
    const newClaim = await api.addExpenseClaim({ ...claimData, status: 'pending' });
    setExpenseClaims(prev => [...prev, newClaim]);
    addToast('تم تقديم طلب الصرف بنجاح', 'success');
  }, [addToast]);

  useEffect(() => {
    if (siteSettings?.themeColor) {
      handleUpdateSiteSettings(siteSettings);
    }
  }, [siteSettings?.themeColor, handleUpdateSiteSettings]);

  if (isLoading) {
    return null; // Or a loading spinner for the whole app
  }

  const value = {
    siteSettings,
    teamMembers,
    roles,
    dailyLogs,
    notifications,
    meetings,
    expenseClaims,
    currency: siteSettings?.currency || 'SAR',
    handleUpdateSiteSettings,
    addNotification,
    markNotificationAsRead,
    handleUpdatePlanStatus,
    handleBulkUpdatePlanStatus,
    handleAddDailyLog,
    handleUpdateDailyLog,
    handleDeleteDailyLog,
    handleUpdateRole,
    handleAddRole,
    handleDeleteRole,
    handleUpdateMember,
    handleAddMeeting,
    handleSubmitExpenseClaim,
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
    throw new Error('useAppDataContext must be used within an AppDataProvider');
  }
  return context;
};