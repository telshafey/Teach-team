import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import {
  TeamMember, Role, DailyLog, Notification, Meeting, ExpenseClaim,
  SiteSettings, TeamMemberFormData, DailyLogFormData, MeetingFormData,
  ExpenseClaimFormData, PlanStatus, OvertimeRequest, OvertimeStatus, LeaveRequest, LeaveRequestFormData, LeaveStatus, Permission, OvertimeRequestFormData, WorkContractChangeRequest, WorkContractChangeRequestFormData, WorkContractChangeStatus
} from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { initialData as appInitialData } from '../data/initialData';
import { slugify } from '../utils/slugify';

interface AppDataContextType {
  teamMembers: TeamMember[];
  dailyLogs: DailyLog[];
  roles: Role[];
  notifications: Notification[];
  meetings: Meeting[];
  expenseClaims: ExpenseClaim[];
  overtimeRequests: OvertimeRequest[];
  leaveRequests: LeaveRequest[];
  workContractChangeRequests: WorkContractChangeRequest[];
  siteSettings: SiteSettings | null;
  currency: string;
  isLoading: boolean;
  
  // Handlers
  handleAddMember: (memberData: TeamMemberFormData) => Promise<void>;
  handleUpdateMember: (memberId: number, memberData: Partial<TeamMemberFormData>) => Promise<void>;
  handleUpdatePlanStatus: (memberId: number, status: PlanStatus) => Promise<void>;
  
  handleAddDailyLog: (logData: Omit<DailyLog, 'id'>) => Promise<void>;
  handleUpdateDailyLog: (log: DailyLog) => Promise<void>;
  handleDeleteDailyLog: (logId: string) => Promise<void>;
  
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  handleCreateNotification: (notificationData: Omit<Notification, 'id' | 'read' | 'timestamp'>) => Promise<void>;
  
  handleAddMeeting: (meetingData: MeetingFormData) => Promise<void>;
  handleDeleteMeeting: (meetingId: string) => Promise<void>;
  
  submitLeaveRequest: (formData: LeaveRequestFormData) => Promise<void>;
  cancelLeaveRequest: (requestId: string) => Promise<void>;
  handleUpdateLeaveStatus: (requestId: string, status: LeaveStatus, managerNotes: string) => Promise<void>;

  handleSubmitExpenseClaim: (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
  handleUpdateExpenseClaimStatus: (claimId: string, status: ExpenseClaim['status']) => Promise<void>;

  submitOvertimeRequest: (formData: OvertimeRequestFormData) => Promise<void>;
  cancelOvertimeRequest: (requestId: string) => Promise<void>;
  handleUpdateOvertimeStatus: (requestId: string, status: OvertimeStatus, managerNotes: string) => Promise<void>;
  
  submitWorkContractChangeRequest: (formData: WorkContractChangeRequestFormData) => Promise<void>;
  handleUpdateWorkContractChangeRequestStatus: (requestId: string, status: WorkContractChangeStatus, managerNotes: string, approvedValues?: { hours: number; salary: number }) => Promise<void>;
  
  handleAddRole: (roleData: { name: string, permissions: Permission[] }) => Promise<void>;
  handleUpdateRole: (role: Role) => Promise<void>;
  handleDeleteRole: (roleId: string) => Promise<void>;
  
  handleUpdateSiteSettings: (settings: SiteSettings) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [workContractChangeRequests, setWorkContractChangeRequests] = useState<WorkContractChangeRequest[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(appInitialData.siteSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabaseClient) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        membersData,
        logsData,
        rolesData,
        notificationsData,
        meetingsData,
        expenseClaimsData,
        overtimeRequestsData,
        leaveRequestsData,
        workContractChangeRequestsData,
        siteSettingsData
      ] = await Promise.all([
        api.fetchAll<TeamMember>(supabaseClient, 'team_members'),
        api.fetchAll<DailyLog>(supabaseClient, 'daily_logs'),
        api.fetchAll<Role>(supabaseClient, 'roles'),
        api.fetchAll<Notification>(supabaseClient, 'notifications'),
        api.fetchAll<Meeting>(supabaseClient, 'meetings'),
        api.fetchAll<ExpenseClaim>(supabaseClient, 'expense_claims'),
        api.fetchAll<OvertimeRequest>(supabaseClient, 'overtime_requests'),
        api.fetchLeaveRequests(supabaseClient),
        api.fetchAll<WorkContractChangeRequest>(supabaseClient, 'contract_change_requests'),
        supabaseClient.from('site_settings').select('settings').eq('id', 1).single(),
      ]);

      setTeamMembers(membersData);
      setDailyLogs(logsData);
      setRoles(rolesData);
      setNotifications(notificationsData);
      setMeetings(meetingsData);
      setExpenseClaims(expenseClaimsData);
      setOvertimeRequests(overtimeRequestsData);
      setLeaveRequests(leaveRequestsData);
      setWorkContractChangeRequests(workContractChangeRequestsData);

      if (siteSettingsData.data) {
        setSiteSettings(siteSettingsData.data.settings as SiteSettings);
      }
    } catch (error: any) {
      addToast(`فشل تحميل البيانات الرئيسية: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, addToast]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    } else {
      setIsLoading(false);
      // Clear data on logout
      setTeamMembers([]);
      setDailyLogs([]);
      setNotifications([]);
      setMeetings([]);
      setExpenseClaims([]);
      setOvertimeRequests([]);
      setLeaveRequests([]);
      setWorkContractChangeRequests([]);
      // keep roles and site settings
    }
  }, [currentUser, fetchData]);
  
  // Team Member Handlers
  const handleAddMember = async (memberData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    try {
      // In a real app, this would be a server-side function to create auth user + profile
      // For now, we'll just insert into team_members
      const newMember = await api.insert<TeamMember>(supabaseClient, 'team_members', {
        ...memberData,
        weeklyPlan: { status: 'approved', hours: {} }
      });
      setTeamMembers(prev => [...prev, newMember]);
      addToast('تم إضافة العضو بنجاح.', 'success');
    } catch (error: any) {
      addToast(`فشل إضافة العضو: ${error.message}`, 'error');
      throw error;
    }
  };

  const handleUpdateMember = async (memberId: number, memberData: Partial<TeamMemberFormData>) => {
    if (!supabaseClient) return;
    try {
      const updatedMember = await api.update<TeamMember>(supabaseClient, 'team_members', memberId, memberData);
      setTeamMembers(prev => prev.map(m => m.id === memberId ? {...m, ...updatedMember} : m));
      addToast('تم تحديث بيانات العضو بنجاح.', 'success');
    } catch (error: any) {
      addToast(`فشل تحديث بيانات العضو: ${error.message}`, 'error');
      throw error;
    }
  };

  const handleUpdatePlanStatus = async (memberId: number, status: PlanStatus) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member || !supabaseClient) return;
    try {
      const updatedMember = await api.update<TeamMember>(supabaseClient, 'team_members', memberId, { weeklyPlan: { ...member.weeklyPlan, status } });
      setTeamMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
      addToast('تم تحديث حالة الخطة.', 'success');
    } catch (error) {
      addToast('فشل تحديث حالة الخطة.', 'error');
      throw error;
    }
  };
  
  // Daily Log Handlers
  const handleAddDailyLog = async (logData: Omit<DailyLog, 'id'>) => {
    if (!supabaseClient) return;
    try {
        const recordToInsert = {
            ...logData,
            id: crypto.randomUUID(),
        };
        const newLog = await api.insert<DailyLog>(supabaseClient, 'daily_logs', recordToInsert);
        setDailyLogs(prev => [...prev, newLog]);
        addToast('تم إضافة السجل بنجاح.', 'success');
    } catch (error) {
        throw error;
    }
  };
  
  const handleUpdateDailyLog = async (log: DailyLog) => {
    if (!supabaseClient) return;
    try {
        const updatedLog = await api.update<DailyLog>(supabaseClient, 'daily_logs', log.id, log);
        setDailyLogs(prev => prev.map(l => l.id === log.id ? updatedLog : l));
        addToast('تم تعديل السجل بنجاح.', 'success');
    } catch (error) {
        throw error;
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
        throw error;
    }
  };

  // Notification handler
  const markNotificationAsRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.read || !supabaseClient) return;

    try {
      const updatedNotification = await api.update<Notification>(supabaseClient, 'notifications', notificationId, { read: true });
      setNotifications(prev => prev.map(n => n.id === notificationId ? updatedNotification : n));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };
  
  const handleCreateNotification = async (notificationData: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    if (!supabaseClient) return;
    try {
        const fullRecord: any = {
            ...notificationData,
            id: crypto.randomUUID(),
            read: false,
            timestamp: new Date().toISOString(),
        };

        // Explicitly remove keys if their value is undefined. This prevents the Supabase
        // client from sending `null` for an optional property, which would violate
        // a NOT NULL constraint if the DB doesn't have a default value.
        Object.keys(fullRecord).forEach(key => {
            if (fullRecord[key] === undefined) {
                delete fullRecord[key];
            }
        });

        const newNotification = await api.insert<Notification>(supabaseClient, 'notifications', fullRecord);
        // Optimistically update state
        setNotifications(prev => [...prev, newNotification]);
    } catch (error: any) {
        console.error("Failed to create notification:", error.message || error);
    }
  };

  // Meeting Handlers
  const handleAddMeeting = async (meetingData: MeetingFormData) => {
      if (!supabaseClient || !currentUser) return;
      try {
          const jitsiRoomName = `BokraTeam-${slugify(meetingData.title)}-${Date.now()}`;
          const meetingToInsert = { 
              ...meetingData, 
              members: meetingData.members,
              jitsiRoomName,
              id: crypto.randomUUID()
          };
          const newMeeting = await api.insert<Meeting>(supabaseClient, 'meetings', meetingToInsert);
          setMeetings(prev => [...prev, newMeeting]);
          addToast('تم جدولة الاجتماع بنجاح.', 'success');

          // Send notifications to participants
          for (const memberId of meetingData.members) {
              if (memberId !== currentUser.id) { // Don't notify self
                  handleCreateNotification({
                      recipientId: memberId,
                      type: 'meeting_scheduled',
                      taskTitle: newMeeting.title, // Using taskTitle for meeting title
                      assignerName: currentUser.name,
                  });
              }
          }

      } catch (error: any) {
          throw new Error(error.message || 'An unknown error occurred while saving the meeting.');
      }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
      if (!supabaseClient) return;
      try {
          await api.deleteById(supabaseClient, 'meetings', meetingId);
          setMeetings(prev => prev.filter(m => m.id !== meetingId));
          addToast('تم حذف الاجتماع.', 'success');
      } catch (error) {
          addToast('فشل حذف الاجتماع.', 'error');
          throw error;
      }
  };
  
  // Expense Claim Handlers
  const handleSubmitExpenseClaim = async (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => {
      if (!supabaseClient) return;
      try {
          const newClaim = await api.insert<ExpenseClaim>(supabaseClient, 'expense_claims', { ...claimData, status: 'pending' });
          setExpenseClaims(prev => [...prev, newClaim]);
          addToast('تم إرسال طلب الصرف للمراجعة.', 'success');
      } catch (error) {
          addToast('فشل إرسال طلب الصرف.', 'error');
          throw error;
      }
  };
  
  const handleUpdateExpenseClaimStatus = async (claimId: string, status: ExpenseClaim['status']) => {
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
  
  // Overtime Handlers
    const submitOvertimeRequest = async (formData: OvertimeRequestFormData) => {
        if (!supabaseClient || !currentUser) return;
        try {
            const newRequest = await api.insert<OvertimeRequest>(supabaseClient, 'overtime_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
            setOvertimeRequests(prev => [...prev, newRequest]);
            addToast('تم إرسال طلب الساعات الإضافية للمراجعة.', 'success');
        } catch(e) {
            addToast('فشل إرسال طلب الساعات الإضافية.', 'error');
            throw e;
        }
    };
    
    const cancelOvertimeRequest = async (requestId: string) => {
        if (!supabaseClient) return;
        try {
            await api.deleteById(supabaseClient, 'overtime_requests', requestId);
            setOvertimeRequests(prev => prev.filter(r => r.id !== requestId));
            addToast('تم إلغاء طلب الساعات الإضافية.', 'success');
        } catch (e) {
            addToast('فشل إلغاء الطلب.', 'error');
            throw e;
        }
    };

  const handleUpdateOvertimeStatus = async (requestId: string, status: OvertimeStatus, managerNotes: string) => {
      if (!supabaseClient) return;
      try {
          const updatedRequest = await api.update<OvertimeRequest>(supabaseClient, 'overtime_requests', requestId, { status, managerNotes });
          setOvertimeRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
          addToast('تم تحديث حالة طلب الساعات الإضافية.', 'success');
      } catch (error) {
          addToast('فشل تحديث حالة الطلب.', 'error');
          throw error;
      }
  };
  
  // Leave Request Handlers
  const submitLeaveRequest = async (formData: LeaveRequestFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const newRequest = await api.insert<LeaveRequest>(supabaseClient, 'leave_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
        setLeaveRequests(prev => [...prev, newRequest]);
        addToast('تم إرسال طلب الإجازة للمراجعة.', 'success');
    } catch(e) {
        addToast('فشل إرسال طلب الإجازة.', 'error');
        throw e;
    }
  };
  
  const cancelLeaveRequest = async (requestId: string) => {
      if (!supabaseClient) return;
      try {
          await api.deleteById(supabaseClient, 'leave_requests', requestId);
          setLeaveRequests(prev => prev.filter(r => r.id !== requestId));
          addToast('تم إلغاء طلب الإجازة.', 'success');
      } catch (e) {
          addToast('فشل إلغاء الطلب.', 'error');
          throw e;
      }
  };

  const handleUpdateLeaveStatus = async (requestId: string, status: LeaveStatus, managerNotes: string) => {
      if (!supabaseClient) return;
      try {
          const updated = await api.update<LeaveRequest>(supabaseClient, 'leave_requests', requestId, { status, managerNotes });
          setLeaveRequests(prev => prev.map(r => r.id === requestId ? updated : r));
          addToast('تم تحديث حالة طلب الإجازة.', 'success');
      } catch(e) {
          addToast('فشل تحديث حالة الطلب.', 'error');
          throw e;
      }
  };
  
  // Work Contract Change Handlers
    const submitWorkContractChangeRequest = async (formData: WorkContractChangeRequestFormData) => {
        if (!supabaseClient || !currentUser) return;
        try {
            const newRequest = await api.insert<WorkContractChangeRequest>(supabaseClient, 'contract_change_requests', { 
                id: crypto.randomUUID(),
                ...formData, 
                teamMemberId: currentUser.id, 
                status: 'pending',
                currentWeeklyHours: currentUser.weeklyHoursRequirement,
                currentSalary: currentUser.salary,
                createdAt: new Date().toISOString()
            });
            setWorkContractChangeRequests(prev => [...prev, newRequest]);
            addToast('تم إرسال طلب تعديل العقد للمراجعة.', 'success');
            
            if (currentUser.reportsTo) {
                handleCreateNotification({
                    recipientId: currentUser.reportsTo,
                    type: 'profile_update', // Generic type
                    message: `قدم ${currentUser.name} طلبًا لتعديل عقد العمل.`,
                });
            }
        } catch(e) {
            addToast('فشل إرسال طلب تعديل العقد.', 'error');
            throw e;
        }
    };

    const handleUpdateWorkContractChangeRequestStatus = async (requestId: string, status: WorkContractChangeStatus, managerNotes: string, approvedValues?: { hours: number; salary: number }) => {
        if (!supabaseClient) return;
        try {
            const updates: Partial<WorkContractChangeRequest> = { status, managerNotes };
            if (status === 'approved' && approvedValues) {
                updates.approvedWeeklyHours = approvedValues.hours;
                updates.approvedSalary = approvedValues.salary;
            }

            const updatedRequest = await api.update<WorkContractChangeRequest>(supabaseClient, 'contract_change_requests', requestId, updates);
            setWorkContractChangeRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
            
            const memberToUpdate = teamMembers.find(m => m.id === updatedRequest.teamMemberId);

            if (memberToUpdate) {
                if (status === 'approved') {
                    await handleUpdateMember(memberToUpdate.id, {
                        weeklyHoursRequirement: approvedValues?.hours ?? updatedRequest.requestedWeeklyHours,
                        salary: approvedValues?.salary ?? updatedRequest.requestedSalary,
                    });
                }
                handleCreateNotification({
                    recipientId: memberToUpdate.id,
                    type: 'profile_update',
                    message: `تم ${status === 'approved' ? 'الموافقة على' : 'رفض'} طلب تعديل عقد العمل الخاص بك.`,
                });
            }
            
            addToast('تم تحديث حالة طلب تعديل العقد.', 'success');
        } catch (error) {
            addToast('فشل تحديث حالة الطلب.', 'error');
            throw error;
        }
    };


  // Role Handlers
  const handleAddRole = async (roleData: { name: string, permissions: Permission[] }) => {
    if (!supabaseClient) return;
    try {
        const newRole = await api.insert<Role>(supabaseClient, 'roles', roleData);
        setRoles(prev => [...prev, newRole]);
    } catch (e) {
        throw e;
    }
  };

  const handleUpdateRole = async (role: Role) => {
      if (!supabaseClient) return;
      try {
          const updatedRole = await api.update<Role>(supabaseClient, 'roles', role.id, role);
          setRoles(prev => prev.map(r => r.id === role.id ? updatedRole : r));
      } catch (e) {
          throw e;
      }
  };

  const handleDeleteRole = async (roleId: string) => {
      if (!supabaseClient) return;
      try {
          await api.deleteById(supabaseClient, 'roles', roleId);
          setRoles(prev => prev.filter(r => r.id !== roleId));
      } catch (e) {
          throw e;
      }
  };

  // Site Settings
  const handleUpdateSiteSettings = async (settings: SiteSettings) => {
      if (!supabaseClient) return;
      try {
          const { data, error } = await supabaseClient.from('site_settings').update({ settings }).eq('id', 1).select().single();
          if (error) throw error;
          const newSettings = data.settings as SiteSettings;
          setSiteSettings(newSettings);
          // Also update localStorage for db settings persistence
          if(newSettings.databaseSettings) {
            localStorage.setItem('supabase_settings', JSON.stringify(newSettings.databaseSettings));
          }

      } catch (e: any) {
          addToast(`فشل حفظ الإعدادات: ${e.message}`, 'error');
          throw e;
      }
  };


  const value: AppDataContextType = {
    teamMembers,
    dailyLogs,
    roles,
    notifications,
    meetings,
    expenseClaims,
    overtimeRequests,
    leaveRequests,
    workContractChangeRequests,
    siteSettings,
    currency: siteSettings?.currency || 'USD',
    isLoading,
    handleAddMember,
    handleUpdateMember,
    handleUpdatePlanStatus,
    handleAddDailyLog,
    handleUpdateDailyLog,
    handleDeleteDailyLog,
    markNotificationAsRead,
    handleCreateNotification,
    handleAddMeeting,
    handleDeleteMeeting,
    submitLeaveRequest,
    cancelLeaveRequest,
    handleUpdateLeaveStatus,
    handleSubmitExpenseClaim,
    handleUpdateExpenseClaimStatus,
    submitOvertimeRequest,
    cancelOvertimeRequest,
    handleUpdateOvertimeStatus,
    submitWorkContractChangeRequest,
    handleUpdateWorkContractChangeRequestStatus,
    handleAddRole,
    handleUpdateRole,
    handleDeleteRole,
    handleUpdateSiteSettings,
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