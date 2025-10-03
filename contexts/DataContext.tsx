import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
// FIX: Imported NotificationData to use in the context type.
import { TeamMember, DailyLog, Notification, SiteSettings, Role, ExpenseClaim, PlanStatus, TeamMemberFormData, ExpenseClaimFormData, Meeting, MeetingFormData, DailyLogFormData, NotificationData, RoleId } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface AppDataContextType {
  siteSettings: SiteSettings | null;
  teamMembers: TeamMember[];
  roles: Role[];
  dailyLogs: DailyLog[];
  notifications: Notification[];
  expenseClaims: ExpenseClaim[];
  meetings: Meeting[];
  currency: string;
  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
  handleUpdateMember: (member: TeamMember | TeamMemberFormData) => Promise<void>;
  handleAddDailyLog: (logData: DailyLogFormData & { teamMemberId: number, date: string }) => Promise<void>;
  handleUpdateDailyLog: (log: DailyLog) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => void;
  // FIX: Changed the type of notificationData to the more specific NotificationData union type.
  addNotification: (notificationData: NotificationData) => void;
  handleUpdateRole: (role: Role) => Promise<void>;
  handleAddRole: (roleData: { name: string }) => Promise<Role>;
  handleDeleteRole: (roleId: RoleId) => Promise<void>;
  handleSubmitExpenseClaim: (claimData: ExpenseClaimFormData) => Promise<void>;
  handleUpdateExpenseClaimStatus: (claimId: string, status: 'approved' | 'rejected') => Promise<void>;
  handleBulkUpdatePlanStatus: (memberIds: number[], status: PlanStatus) => Promise<void>;
  handleUpdatePlanStatus: (memberId: number, status: PlanStatus) => Promise<void>;
  handleAddMeeting: (meetingData: MeetingFormData) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

const updateThemeColor = (color: string) => {
    const styleId = 'dynamic-theme-color';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
        :root {
            --theme-color-500: ${color};
            /* You might want to generate shades automatically in a real app */
            --theme-color-600: ${color}; 
            --theme-color-700: ${color};
            --theme-color-100: ${color}20; /* Example with opacity */
        }
    `;
};


export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAppData = async () => {
        try {
            const [settings, members, logs, claims, meetingsData, rolesData] = await Promise.all([
                api.fetchSiteSettings(),
                api.fetchTeamMembers(),
                api.fetchDailyLogs(),
                api.fetchExpenseClaims(),
                api.fetchMeetings(),
                api.fetchRoles(),
            ]);
            setSiteSettings(settings);
            if (settings.themeColor) {
                updateThemeColor(settings.themeColor);
            }
            setTeamMembers(members);
            setDailyLogs(logs);
            setExpenseClaims(claims);
            setMeetings(meetingsData);
            setRoles(rolesData);
        } catch (error) {
            console.error("Failed to load app data", error);
            addToast('فشل تحميل بيانات التطبيق', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    loadAppData();
  }, [addToast]);

  const handleUpdateSiteSettings = useCallback(async (settings: SiteSettings) => {
    await api.updateSiteSettings(settings);
    setSiteSettings(settings);
    if (settings.themeColor) {
        updateThemeColor(settings.themeColor);
    }
    addToast('تم تحديث إعدادات الموقع', 'success');
  }, [addToast]);
  
  const handleUpdateMember = useCallback(async (memberData: TeamMember | TeamMemberFormData) => {
      const isNew = !('id' in memberData);
      const updatedMember = isNew
        ? await api.addTeamMember(memberData as TeamMemberFormData)
        : await api.updateTeamMember(memberData as TeamMember);
      
      if (isNew) {
        setTeamMembers(prev => [...prev, updatedMember]);
        addToast('تمت إضافة العضو بنجاح', 'success');
      } else {
        setTeamMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
        addToast('تم تحديث بيانات العضو بنجاح', 'success');
      }
  }, [addToast]);

  const handleAddDailyLog = useCallback(async (logData: DailyLogFormData & { teamMemberId: number, date: string }) => {
    const newLog = await api.addDailyLog(logData);
    setDailyLogs(prev => [...prev, newLog]);
  }, []);

  const handleUpdateDailyLog = useCallback(async (log: DailyLog) => {
    await api.updateDailyLog(log);
    setDailyLogs(prev => prev.map(l => l.id === log.id ? log : l));
  }, []);

  const handleDeleteDailyLog = useCallback(async (logId: string) => {
    await api.deleteDailyLog(logId);
    setDailyLogs(prev => prev.filter(l => l.id !== logId));
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
  }, []);

  const addNotification = useCallback((notificationData: NotificationData) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
    } as Notification;
    setNotifications(prev => [newNotification, ...prev]);
  }, []);
  
  const handleUpdateRole = useCallback(async (role: Role) => {
      await api.updateRole(role);
      setRoles(prev => prev.map(r => r.id === role.id ? role : r));
      addToast(`تم تحديث دور "${role.name}"`, 'success');
  }, [addToast]);
  
  const handleAddRole = useCallback(async (roleData: { name: string }): Promise<Role> => {
      const newRole = await api.addRole(roleData);
      setRoles(prev => [...prev, newRole]);
      addToast(`تمت إضافة دور "${newRole.name}" بنجاح`, 'success');
      return newRole;
  }, [addToast]);
  
  const handleDeleteRole = useCallback(async (roleId: RoleId) => {
      try {
        await api.deleteRole(roleId);
        setRoles(prev => prev.filter(r => r.id !== roleId));
        addToast('تم حذف الدور بنجاح', 'success');
      } catch (error: any) {
        addToast(error.message || 'فشل حذف الدور', 'error');
        throw error;
      }
  }, [addToast]);


  const handleSubmitExpenseClaim = useCallback(async (claimData: ExpenseClaimFormData) => {
    if (!currentUser) return;
    const newClaim = await api.addExpenseClaim(claimData, currentUser.id);
    setExpenseClaims(prev => [newClaim, ...prev]);
  }, [currentUser]);

  const handleUpdateExpenseClaimStatus = useCallback(async (claimId: string, status: 'approved' | 'rejected') => {
    const updatedClaim = await api.updateExpenseClaimStatus(claimId, status);
    setExpenseClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
  }, []);

  const handleUpdatePlanStatus = useCallback(async (memberId: number, status: PlanStatus) => {
      const updatedMember = await api.updatePlanStatus(memberId, status);
      setTeamMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
      addToast('تم تحديث حالة الخطة', 'info');
  }, [addToast]);

  const handleBulkUpdatePlanStatus = useCallback(async (memberIds: number[], status: PlanStatus) => {
      const updatedMembers = await api.bulkUpdatePlanStatus(memberIds, status);
      setTeamMembers(prev => prev.map(m => updatedMembers.find(u => u.id === m.id) || m));
      addToast(`تم تحديث حالة ${memberIds.length} خطط بنجاح`, 'success');
  }, [addToast]);

  const handleAddMeeting = useCallback(async (meetingData: MeetingFormData) => {
      const newMeeting = await api.addMeeting(meetingData);
      setMeetings(prev => [newMeeting, ...prev]);
      addToast('تم جدولة الاجتماع بنجاح', 'success');
  }, [addToast]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <AppDataContext.Provider value={{
      siteSettings,
      teamMembers,
      roles,
      dailyLogs,
      notifications,
      expenseClaims,
      meetings,
      currency: siteSettings?.currency || 'SAR',
      handleUpdateSiteSettings,
      handleUpdateMember,
      handleAddDailyLog,
      handleUpdateDailyLog,
      handleDeleteDailyLog,
      markNotificationAsRead,
      addNotification,
      handleUpdateRole,
      handleAddRole,
      handleDeleteRole,
      handleSubmitExpenseClaim,
      handleUpdateExpenseClaimStatus,
      handleUpdatePlanStatus,
      handleBulkUpdatePlanStatus,
      handleAddMeeting,
    }}>
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