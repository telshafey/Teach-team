import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { LeaveRequest, OvertimeRequest, ExpenseClaim, WorkContractChangeRequest, Penalty, LeaveRequestFormData, OvertimeRequestFormData, ExpenseClaimFormData, WorkContractChangeRequestFormData, PenaltyFormData, WorkContractChangeStatus } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { createNotification } from '../services/notificationService';
import { useTeamContext } from './TeamContext';

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

export const RequestsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { teamMembers, handleUpdateMember } = useTeamContext();
  const { addToast } = useToast();
  
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [workContractChangeRequests, setWorkContractChangeRequests] = useState<WorkContractChangeRequest[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabaseClient || !currentUser) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [lr, or, ec, wcr, p] = await Promise.all([
          api.getAll<LeaveRequest>(supabaseClient, 'leave_requests'),
          api.getAll<OvertimeRequest>(supabaseClient, 'overtime_requests'),
          api.getAll<ExpenseClaim>(supabaseClient, 'expense_claims'),
          api.getAll<WorkContractChangeRequest>(supabaseClient, 'work_contract_change_requests'),
          api.getAll<Penalty>(supabaseClient, 'penalties'),
        ]);
        setLeaveRequests(lr);
        setOvertimeRequests(or);
        setExpenseClaims(ec);
        setWorkContractChangeRequests(wcr);
        setPenalties(p);
      } catch (error: any) {
        addToast(`Failed to fetch requests data: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [supabaseClient, currentUser, addToast]);
  
 const updateRequest = async <T extends {id: string}>(
      setState: React.Dispatch<React.SetStateAction<T[]>>,
      table: string,
      id: string,
      updates: Partial<T>
  ): Promise<T> => {
      if (!supabaseClient) throw new Error("Supabase client is not available");
      try {
        const updatedItem = await api.update<T>(supabaseClient, table, id, updates);
        setState(prev => prev.map(item => item.id === id ? updatedItem : item));
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
        const newRequest = await api.insert<LeaveRequest>(supabaseClient, 'leave_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
        setLeaveRequests(prev => [...prev, newRequest]);
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
        setLeaveRequests(prev => prev.filter(r => r.id !== id));
        addToast('تم إلغاء طلب الإجازة.', 'success');
    } catch (error: any) {
        console.error("Failed to cancel leave request:", error);
        addToast(`فشل إلغاء الطلب: ${error.message}`, 'error');
        throw error;
    }
  }
  const handleUpdateLeaveStatus = async (id: string, status: LeaveRequest['status'], managerNotes: string) => {
    await updateRequest<LeaveRequest>(setLeaveRequests, 'leave_requests', id, { status, managerNotes });
  };

  // Overtime Requests
  const submitOvertimeRequest = async (formData: OvertimeRequestFormData) => {
    if(!supabaseClient || !currentUser) return;
    try {
        const newRequest = await api.insert<OvertimeRequest>(supabaseClient, 'overtime_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
        setOvertimeRequests(prev => [...prev, newRequest]);
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
        setOvertimeRequests(prev => prev.filter(r => r.id !== id));
        addToast('تم إلغاء طلب الساعات الإضافية.', 'success');
    } catch (error: any) {
        console.error("Failed to cancel overtime request:", error);
        addToast(`فشل إلغاء الطلب: ${error.message}`, 'error');
        throw error;
    }
  }
  const handleUpdateOvertimeStatus = async (id: string, status: OvertimeRequest['status'], managerNotes: string) => {
      await updateRequest<OvertimeRequest>(setOvertimeRequests, 'overtime_requests', id, { status, managerNotes });
  };

  // Expense Claims
  const handleSubmitExpenseClaim = async (formData: Omit<ExpenseClaim, 'id' | 'status'>) => {
    if(!supabaseClient) return;
    try {
        const newClaim = await api.insert<ExpenseClaim>(supabaseClient, 'expense_claims', { ...formData, status: 'pending' });
        setExpenseClaims(prev => [...prev, newClaim]);
        addToast('تم تقديم طلب الصرف.', 'success');
    } catch (error: any) {
        console.error("Failed to submit expense claim:", error);
        addToast(`فشل تقديم طلب الصرف: ${error.message}`, 'error');
        throw error;
    }
  }
  const handleUpdateExpenseClaimStatus = async (id: string, status: ExpenseClaim['status']) => {
      await updateRequest<ExpenseClaim>(setExpenseClaims, 'expense_claims', id, { status });
  };

  // Work Contract Change Requests
  const submitWorkContractChangeRequest = async (formData: WorkContractChangeRequestFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const currentContract = { currentWeeklyHours: currentUser.weeklyHoursRequirement, currentSalary: currentUser.salary };
        const newRequestData = { ...formData, ...currentContract, teamMemberId: currentUser.id, status: 'pending' as WorkContractChangeStatus, createdAt: new Date().toISOString() };
        const newRequest = await api.insert<WorkContractChangeRequest>(supabaseClient, 'work_contract_change_requests', newRequestData);
        setWorkContractChangeRequests(prev => [...prev, newRequest]);
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
      
      await updateRequest<WorkContractChangeRequest>(setWorkContractChangeRequests, 'work_contract_change_requests', id, updates);

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
        const newPenalty = await api.insert<Penalty>(supabaseClient, 'penalties', newPenaltyData);
        setPenalties(prev => [...prev, newPenalty]);
        addToast('تم إصدار الجزاء وهو الآن قيد المراجعة.', 'success');
    } catch (error: any) {
        console.error("Failed to issue penalty:", error);
        addToast(`فشل إصدار الجزاء: ${error.message}`, 'error');
        throw error;
    }
  };

  const handleAppealPenalty = async (id: string, appealReason: string) => {
      await updateRequest<Penalty>(setPenalties, 'penalties', id, { status: 'appealed', appealReason });
  };
  const handleUpdatePenaltyStatus = async (id: string, status: Penalty['status'], notes: string) => {
      await updateRequest<Penalty>(setPenalties, 'penalties', id, { status, managerNotes: notes });
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