import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { LeaveRequest, OvertimeRequest, ExpenseClaim, WorkContractChangeRequest, Penalty, LeaveRequestFormData, OvertimeRequestFormData, WorkContractChangeRequestFormData, PenaltyFormData, LeaveStatus, OvertimeStatus, ExpenseClaimStatus, WorkContractChangeStatus, PenaltyStatus } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { createNotification } from '../services/notificationService';

export interface RequestsContextType {
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  expenseClaims: ExpenseClaim[];
  workContractChangeRequests: WorkContractChangeRequest[];
  penalties: Penalty[];
  isLoading: boolean;
  submitLeaveRequest: (formData: LeaveRequestFormData) => Promise<void>;
  cancelLeaveRequest: (requestId: string) => Promise<void>;
  handleUpdateLeaveStatus: (requestId: string, status: LeaveStatus, notes: string) => Promise<void>;
  submitOvertimeRequest: (formData: OvertimeRequestFormData) => Promise<void>;
  cancelOvertimeRequest: (requestId: string) => Promise<void>;
  handleUpdateOvertimeStatus: (requestId: string, status: OvertimeStatus, notes: string) => Promise<void>;
  handleSubmitExpenseClaim: (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
  handleUpdateExpenseClaimStatus: (claimId: string, status: ExpenseClaimStatus) => Promise<void>;
  submitWorkContractChangeRequest: (formData: WorkContractChangeRequestFormData) => Promise<void>;
  handleUpdateWorkContractChangeRequestStatus: (requestId: string, status: WorkContractChangeStatus, notes: string, modifiedValues?: { hours: number, salary: number }) => Promise<void>;
  handleIssuePenalty: (formData: PenaltyFormData) => Promise<void>;
  handleUpdatePenaltyStatus: (penaltyId: string, status: PenaltyStatus, notes: string) => Promise<void>;
  handleAppealPenalty: (penaltyId: string, appealReason: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

const RequestsContext = createContext<RequestsContextType | undefined>(undefined);

export const RequestsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [workContractChangeRequests, setWorkContractChangeRequests] = useState<WorkContractChangeRequest[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabaseClient || !currentUser) {
        setLeaveRequests([]);
        setOvertimeRequests([]);
        setExpenseClaims([]);
        setWorkContractChangeRequests([]);
        setPenalties([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const [leaves, overtimes, expenses, contracts, penaltiesData] = await Promise.all([
        api.fetchAll<LeaveRequest>(supabaseClient, 'leave_requests'),
        api.fetchAll<OvertimeRequest>(supabaseClient, 'overtime_requests'),
        api.fetchAll<ExpenseClaim>(supabaseClient, 'expense_claims'),
        api.fetchAll<WorkContractChangeRequest>(supabaseClient, 'work_contract_change_requests'),
        api.fetchAll<Penalty>(supabaseClient, 'penalties'),
      ]);
      setLeaveRequests(leaves);
      setOvertimeRequests(overtimes);
      setExpenseClaims(expenses);
      setWorkContractChangeRequests(contracts);
      setPenalties(penaltiesData);
    } catch (error: any) {
      console.error('Error fetching requests data:', error);
      addToast('فشل تحميل بيانات الطلبات.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, addToast, currentUser]);

  useEffect(() => {
    if (supabaseClient && currentUser) {
      fetchData();
      
      const createHandler = <T extends {id: any}>(setState: React.Dispatch<React.SetStateAction<T[]>>) => (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          const record = api.snakeToCamel(newRecord);
          switch (eventType) {
              case 'INSERT': setState(prev => [...prev, record]); break;
              case 'UPDATE': setState(prev => prev.map(item => item.id === record.id ? record : item)); break;
              case 'DELETE': setState(prev => prev.filter(item => item.id !== oldRecord.id)); break;
          }
      };

      const channels = [
        supabaseClient.channel('public:leave_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, createHandler(setLeaveRequests)).subscribe(),
        supabaseClient.channel('public:overtime_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'overtime_requests' }, createHandler(setOvertimeRequests)).subscribe(),
        supabaseClient.channel('public:expense_claims').on('postgres_changes', { event: '*', schema: 'public', table: 'expense_claims' }, createHandler(setExpenseClaims)).subscribe(),
        supabaseClient.channel('public:work_contract_change_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'work_contract_change_requests' }, createHandler(setWorkContractChangeRequests)).subscribe(),
        supabaseClient.channel('public:penalties').on('postgres_changes', { event: '*', schema: 'public', table: 'penalties' }, createHandler(setPenalties)).subscribe(),
      ];

      return () => {
        channels.forEach(channel => supabaseClient.removeChannel(channel));
      };
    } else {
        setLeaveRequests([]);
        setOvertimeRequests([]);
        setExpenseClaims([]);
        setWorkContractChangeRequests([]);
        setPenalties([]);
    }
  }, [supabaseClient, currentUser, fetchData]);

  const submitLeaveRequest = async (formData: LeaveRequestFormData) => {
    if (!supabaseClient || !currentUser) return;
    await api.insert(supabaseClient, 'leave_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
  };
  const cancelLeaveRequest = async (requestId: string) => {
    if (!supabaseClient) return;
    await api.deleteById(supabaseClient, 'leave_requests', requestId);
  };
  const handleUpdateLeaveStatus = async (requestId: string, status: LeaveStatus, notes: string) => {
     if (!supabaseClient) return;
     await api.update<LeaveRequest>(supabaseClient, 'leave_requests', requestId, { status, managerNotes: notes });
  };
  const submitOvertimeRequest = async (formData: OvertimeRequestFormData) => {
    if (!supabaseClient || !currentUser) return;
    await api.insert(supabaseClient, 'overtime_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
  };
  const cancelOvertimeRequest = async (requestId: string) => {
    if (!supabaseClient) return;
    await api.deleteById(supabaseClient, 'overtime_requests', requestId);
  };
  const handleUpdateOvertimeStatus = async (requestId: string, status: OvertimeStatus, notes: string) => {
     if (!supabaseClient || !currentUser) return;
     const request = overtimeRequests.find(r => r.id === requestId);
     if (!request) return;
     await api.update<OvertimeRequest>(supabaseClient, 'overtime_requests', requestId, { status, managerNotes: notes });
     await createNotification(supabaseClient, {
        recipientId: request.teamMemberId,
        type: 'overtime_request_resolved',
        message: `قام ${currentUser.name} ب${status === 'approved' ? 'قبول' : 'رفض'} طلب الساعات الإضافية الخاص بك.`,
     });
  };
  const handleSubmitExpenseClaim = async (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => {
    if (!supabaseClient) return;
    await api.insert(supabaseClient, 'expense_claims', { ...claimData, status: 'pending' });
  };
  const handleUpdateExpenseClaimStatus = async (claimId: string, status: ExpenseClaimStatus) => {
    if (!supabaseClient) return;
    await api.update<ExpenseClaim>(supabaseClient, 'expense_claims', claimId, { status });
  };
  const submitWorkContractChangeRequest = async (formData: WorkContractChangeRequestFormData) => {
     if (!supabaseClient || !currentUser) return;
     const reqData = { 
        ...formData, 
        teamMemberId: currentUser.id, 
        status: 'pending',
        currentSalary: currentUser.salary,
        currentWeeklyHours: currentUser.weeklyHoursRequirement,
        createdAt: new Date().toISOString()
     };
     await api.insert(supabaseClient, 'work_contract_change_requests', reqData);
  };
  const handleUpdateWorkContractChangeRequestStatus = async (requestId: string, status: WorkContractChangeStatus, notes: string, modifiedValues?: { hours: number, salary: number }) => {
    if (!supabaseClient) return;
    const updateData: any = { status, managerNotes: notes };
    if (status === 'approved' && modifiedValues) {
        updateData.approvedWeeklyHours = modifiedValues.hours;
        updateData.approvedSalary = modifiedValues.salary;
    }
    await api.update<WorkContractChangeRequest>(supabaseClient, 'work_contract_change_requests', requestId, updateData);
  };
  const handleIssuePenalty = async (formData: PenaltyFormData) => {
    if (!supabaseClient || !currentUser) return;
    const penaltyData = {
        ...formData,
        issuerId: currentUser.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
    await api.insert(supabaseClient, 'penalties', penaltyData);
  };
  const handleUpdatePenaltyStatus = async (penaltyId: string, status: PenaltyStatus, notes: string) => {
    if (!supabaseClient) return;
    await api.update<Penalty>(supabaseClient, 'penalties', penaltyId, { status, managerNotes: notes });
  };
    const handleAppealPenalty = async (penaltyId: string, appealReason: string) => {
    if (!supabaseClient || !currentUser) return;
    try {
      const penalty = penalties.find(p => p.id === penaltyId);
      if (penalty && penalty.teamMemberId === currentUser.id) {
        await api.update<Penalty>(supabaseClient, 'penalties', penaltyId, { status: 'appealed', appealReason });
        addToast('تم تقديم استئناف بنجاح.', 'success');
      } else {
        throw new Error('Penalty not found or you do not have permission to appeal.');
      }
    } catch (error: any) {
      addToast(`فشل تقديم الاستئناف: ${error.message}`, 'error');
      throw error;
    }
  };


  const value = { leaveRequests, overtimeRequests, expenseClaims, workContractChangeRequests, penalties, isLoading, submitLeaveRequest, cancelLeaveRequest, handleUpdateLeaveStatus, submitOvertimeRequest, cancelOvertimeRequest, handleUpdateOvertimeStatus, handleSubmitExpenseClaim, handleUpdateExpenseClaimStatus, submitWorkContractChangeRequest, handleUpdateWorkContractChangeRequestStatus, handleIssuePenalty, handleUpdatePenaltyStatus, handleAppealPenalty, fetchData };

  return (
    <RequestsContext.Provider value={value}>
      {children}
    </RequestsContext.Provider>
  );
};

export const useRequestsContext = () => {
  const context = useContext(RequestsContext);
  if (context === undefined) {
    throw new Error('useRequestsContext must be used within a RequestsProvider');
  }
  return context;
};