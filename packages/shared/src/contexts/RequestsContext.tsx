import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LeaveRequest, OvertimeRequest, ExpenseClaim, WorkContractChangeRequest, Penalty, LeaveRequestFormData, OvertimeRequestFormData, ExpenseClaimFormData, WorkContractChangeRequestFormData, PenaltyFormData, WorkContractChangeStatus } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { createNotification } from '../services/notificationService';
import { useTeamContext } from './TeamContext';
import { useRealtime } from './RealtimeContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface RequestsContextType {
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  expenseClaims: ExpenseClaim[];
  workContractChangeRequests: WorkContractChangeRequest[];
  penalties: Penalty[];
  isLoading: boolean;
  submitLeaveRequest: (formData: LeaveRequestFormData) => Promise<void>;
  cancelLeaveRequest: (id: string) => Promise<void>;
  handleUpdateLeaveStatus: (id: string, status: LeaveRequest['status'], managerNotes: string) => Promise<void>;
  submitOvertimeRequest: (formData: OvertimeRequestFormData) => Promise<void>;
  cancelOvertimeRequest: (id: string) => Promise<void>;
  handleUpdateOvertimeStatus: (id: string, status: OvertimeRequest['status'], managerNotes: string) => Promise<void>;
  handleSubmitExpenseClaim: (formData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
  handleUpdateExpenseClaimStatus: (id: string, status: ExpenseClaim['status']) => Promise<void>;
  submitWorkContractChangeRequest: (formData: WorkContractChangeRequestFormData) => Promise<void>;
  handleUpdateWorkContractChangeRequestStatus: (id: string, status: WorkContractChangeRequest['status'], notes: string, modifications?: { hours: number, salary: number }) => Promise<void>;
  handleIssuePenalty: (formData: PenaltyFormData) => Promise<void>;
  handleAppealPenalty: (id: string, appealReason: string) => Promise<void>;
  handleUpdatePenaltyStatus: (id: string, status: Penalty['status'], notes: string) => Promise<void>;
}

const RequestsContext = createContext<RequestsContextType | undefined>(undefined);

const tableToQueryKey: Record<string, string> = {
  leave_requests: 'leave_requests',
  overtime_requests: 'overtime_requests',
  expense_claims: 'expense_claims',
  work_contract_change_requests: 'work_contract_change_requests',
  penalties: 'penalties'
};

export const RequestsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { handleUpdateMember } = useTeamContext();
  const { addToast } = useToast();
  const { subscribe } = useRealtime();
  const queryClient = useQueryClient();
  
  const enabled = !!supabaseClient && !!currentUser;

  const { data: leaveRequests = [], isLoading: isLoadingLR } = useQuery<LeaveRequest[]>({
    queryKey: ['leave_requests'],
    queryFn: () => api.getAll(supabaseClient!, 'leave_requests'),
    enabled,
  });
  const { data: overtimeRequests = [], isLoading: isLoadingOR } = useQuery<OvertimeRequest[]>({
    queryKey: ['overtime_requests'],
    queryFn: () => api.getAll(supabaseClient!, 'overtime_requests'),
    enabled,
  });
  const { data: expenseClaims = [], isLoading: isLoadingEC } = useQuery<ExpenseClaim[]>({
    queryKey: ['expense_claims'],
    queryFn: () => api.getAll(supabaseClient!, 'expense_claims'),
    enabled,
  });
  const { data: workContractChangeRequests = [], isLoading: isLoadingWCR } = useQuery<WorkContractChangeRequest[]>({
    queryKey: ['work_contract_change_requests'],
    queryFn: () => api.getAll(supabaseClient!, 'work_contract_change_requests'),
    enabled,
  });
  const { data: penalties = [], isLoading: isLoadingP } = useQuery<Penalty[]>({
    queryKey: ['penalties'],
    queryFn: () => api.getAll(supabaseClient!, 'penalties'),
    enabled,
  });

  const isLoading = isLoadingLR || isLoadingOR || isLoadingEC || isLoadingWCR || isLoadingP;

  useEffect(() => {
    const handleTableChange = (payload: RealtimePostgresChangesPayload<any>) => {
        const queryKey = tableToQueryKey[payload.table];
        if (!queryKey) return;
        
        queryClient.setQueryData([queryKey], (oldData: any[] | undefined) => {
            if (oldData === undefined) return [];
            if (payload.eventType === 'INSERT') {
                if (oldData.some(item => item.id === payload.new.id)) return oldData;
                return [payload.new, ...oldData];
            }
            if (payload.eventType === 'UPDATE') {
                return oldData.map(item => item.id === payload.new.id ? payload.new : item);
            }
            if (payload.eventType === 'DELETE') {
                 const oldId = (payload.old as { id: string }).id;
                return oldData.filter(item => item.id !== oldId);
            }
            return oldData;
        });
    };
    
    const unsubs = Object.keys(tableToQueryKey).map(table => subscribe(table, handleTableChange));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [subscribe, queryClient]);
  
 const updateRequest = async <T extends {id: string}>(
      table: string,
      id: string,
      updates: Partial<T>
  ): Promise<T> => {
      if (!supabaseClient) throw new Error("Supabase client is not available");
      try {
        const updatedItem = await api.update<T>(supabaseClient, table, id, updates);
        addToast('تم تحديث حالة الطلب.', 'success');
        return updatedItem;
      } catch (error: any) {
        console.error(`Failed to update item in ${table}:`, error);
        addToast(`فشل تحديث الطلب: ${error.message}`, 'error');
        throw error;
      }
  };

  // Leave Requests
  const submitLeaveRequest = async (formData: LeaveRequestFormData) => {
    if(!supabaseClient || !currentUser) return;
    try {
        await api.insert<LeaveRequest>(supabaseClient, 'leave_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
        addToast('تم إرسال طلب الإجازة.', 'success');
    } catch (error: any) {
        console.error("Failed to submit leave request:", error);
        addToast(`فشل إرسال الطلب: ${error.message}`, 'error');
        throw error;
    }
  };
  const cancelLeaveRequest = async (id: string) => {
    if(!supabaseClient) return;
    try {
        await api.deleteById(supabaseClient, 'leave_requests', id);
        addToast('تم إلغاء طلب الإجازة.', 'success');
    } catch (error: any) {
        console.error("Failed to cancel leave request:", error);
        addToast(`فشل إلغاء الطلب: ${error.message}`, 'error');
        throw error;
    }
  }
  const handleUpdateLeaveStatus = async (id: string, status: LeaveRequest['status'], managerNotes: string) => {
    await updateRequest<LeaveRequest>('leave_requests', id, { status, managerNotes });
  };

  // Overtime Requests
  const submitOvertimeRequest = async (formData: OvertimeRequestFormData) => {
    if(!supabaseClient || !currentUser) return;
    try {
        await api.insert<OvertimeRequest>(supabaseClient, 'overtime_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
        addToast('تم إرسال طلب الساعات الإضافية.', 'success');
    } catch (error: any) {
        console.error("Failed to submit overtime request:", error);
        addToast(`فشل إرسال الطلب: ${error.message}`, 'error');
        throw error;
    }
  }
  const cancelOvertimeRequest = async (id: string) => {
    if(!supabaseClient) return;
    try {
        await api.deleteById(supabaseClient, 'overtime_requests', id);
        addToast('تم إلغاء طلب الساعات الإضافية.', 'success');
    } catch (error: any) {
        console.error("Failed to cancel overtime request:", error);
        addToast(`فشل إلغاء الطلب: ${error.message}`, 'error');
        throw error;
    }
  }
  const handleUpdateOvertimeStatus = async (id: string, status: OvertimeRequest['status'], managerNotes: string) => {
      await updateRequest<OvertimeRequest>('overtime_requests', id, { status, managerNotes });
  };

  // Expense Claims
  const handleSubmitExpenseClaim = async (formData: Omit<ExpenseClaim, 'id' | 'status'>) => {
    if(!supabaseClient) return;
    try {
        await api.insert<ExpenseClaim>(supabaseClient, 'expense_claims', { ...formData, status: 'pending' });
        addToast('تم تقديم طلب الصرف.', 'success');
    } catch (error: any) {
        console.error("Failed to submit expense claim:", error);
        addToast(`فشل تقديم طلب الصرف: ${error.message}`, 'error');
        throw error;
    }
  }
  const handleUpdateExpenseClaimStatus = async (id: string, status: ExpenseClaim['status']) => {
      await updateRequest<ExpenseClaim>('expense_claims', id, { status });
  };

  // Work Contract Change Requests
  const submitWorkContractChangeRequest = async (formData: WorkContractChangeRequestFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const currentContract = { currentWeeklyHours: currentUser.weeklyHoursRequirement, currentSalary: currentUser.salary };
        const newRequestData = { ...formData, ...currentContract, teamMemberId: currentUser.id, status: 'pending' as WorkContractChangeStatus, createdAt: new Date().toISOString() };
        await api.insert<WorkContractChangeRequest>(supabaseClient, 'work_contract_change_requests', newRequestData);
        addToast('تم تقديم طلب تعديل العقد.', 'success');
    } catch (error: any) {
        console.error("Failed to submit work contract change request:", error);
        addToast(`فشل تقديم الطلب: ${error.message}`, 'error');
        throw error;
    }
  };

  const handleUpdateWorkContractChangeRequestStatus = async (id: string, status: WorkContractChangeRequest['status'], notes: string, modifications?: { hours: number, salary: number }) => {
      const request = workContractChangeRequests.find(r => r.id === id);
      if (!request) return;

      const updates: Partial<WorkContractChangeRequest> = { status, managerNotes: notes };
      let finalHours = request.requestedWeeklyHours;
      let finalSalary = request.requestedSalary;

      if (status === 'approved' && modifications) {
          updates.approvedWeeklyHours = modifications.hours;
          updates.approvedSalary = modifications.salary;
          finalHours = modifications.hours;
          finalSalary = modifications.salary;
      } else if (status === 'approved') {
          updates.approvedWeeklyHours = request.requestedWeeklyHours;
          updates.approvedSalary = request.requestedSalary;
      }
      
      await updateRequest<WorkContractChangeRequest>('work_contract_change_requests', id, updates);

      if (status === 'approved') {
          await handleUpdateMember(request.teamMemberId, {
              weeklyHoursRequirement: finalHours,
              salary: finalSalary,
          });
          addToast('تم تحديث بيانات عقد الموظف بنجاح.', 'success');
      }
  };
  
  // Penalties
  const handleIssuePenalty = async (formData: PenaltyFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const newPenaltyData: Omit<Penalty, 'id'|'createdAt'> = { ...formData, issuerId: currentUser.id, status: 'pending' };
        await api.insert<Penalty>(supabaseClient, 'penalties', newPenaltyData);
        addToast('تم إصدار الجزاء وهو الآن قيد المراجعة.', 'success');
    } catch (error: any) {
        console.error("Failed to issue penalty:", error);
        addToast(`فشل إصدار الجزاء: ${error.message}`, 'error');
        throw error;
    }
  };

  const handleAppealPenalty = async (id: string, appealReason: string) => {
      await updateRequest<Penalty>('penalties', id, { status: 'appealed', appealReason });
  };
  const handleUpdatePenaltyStatus = async (id: string, status: Penalty['status'], notes: string) => {
      await updateRequest<Penalty>('penalties', id, { status, managerNotes: notes });
  };


  const value = {
      leaveRequests, overtimeRequests, expenseClaims, workContractChangeRequests, penalties, isLoading,
      submitLeaveRequest, cancelLeaveRequest, handleUpdateLeaveStatus,
      submitOvertimeRequest, cancelOvertimeRequest, handleUpdateOvertimeStatus,
      handleSubmitExpenseClaim, handleUpdateExpenseClaimStatus,
      submitWorkContractChangeRequest, handleUpdateWorkContractChangeRequestStatus,
      handleIssuePenalty, handleAppealPenalty, handleUpdatePenaltyStatus
  };

  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>;
};

export const useRequestsContext = () => {
  const context = useContext(RequestsContext);
  if (context === undefined) {
    throw new Error('useRequestsContext must be used within a RequestsProvider');
  }
  return context;
};
