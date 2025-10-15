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
              case 'INSERT': setState(prev => prev.some(item => item.id === record.id) ? prev : [...prev, record]); break;
              case 'UPDATE': setState(prev => prev.map(item => item.id === record.id ? record : item)); break;
              case 'DELETE': setState(prev => prev.filter(item => item.id !== oldRecord.id)); break;
          }
      };

      const channels = [
        supabaseClient.channel('leave_requests_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, createHandler(setLeaveRequests)).subscribe(),
        supabaseClient.channel('overtime_requests_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'overtime_requests' }, createHandler(setOvertimeRequests)).subscribe(),
        supabaseClient.channel('expense_claims_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'expense_claims' }, createHandler(setExpenseClaims)).subscribe(),
        supabaseClient.channel('work_contract_changes_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'work_contract_change_requests' }, createHandler(setWorkContractChangeRequests)).subscribe(),
        supabaseClient.channel('penalties_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'penalties' }, createHandler(setPenalties)).subscribe(),
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
    const newRequest = await api.insert<LeaveRequest>(supabaseClient, 'leave_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
    setLeaveRequests(prev => [...prev, newRequest]);
  };
  const cancelLeaveRequest = async (requestId: string) => {
    if (!supabaseClient) return;
    await api.deleteById(supabaseClient, 'leave_requests', requestId);
    setLeaveRequests(prev => prev.filter(r => r.id !== requestId));
  };
  const handleUpdateLeaveStatus = async (requestId: string, status: LeaveStatus, notes: string) => {
     if (!supabaseClient) return;
     const updatedRequest = await api.update<LeaveRequest>(supabaseClient, 'leave_requests', requestId, { status, managerNotes: notes });
     setLeaveRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
  };
  const submitOvertimeRequest = async (formData: OvertimeRequestFormData) => {
    if (!supabaseClient || !currentUser) return;
    const newRequest = await api.insert<OvertimeRequest>(supabaseClient, 'overtime_requests', { ...formData, teamMemberId: currentUser.id, status: 'pending' });
    setOvertimeRequests(prev => [...prev, newRequest]);
  };
  const cancelOvertimeRequest = async (requestId: string) => {
    if (!supabaseClient) return;
    await api.deleteById(supabaseClient, 'overtime_requests', requestId);
    setOvertimeRequests(prev => prev.filter(r => r.id !== requestId));
  };
  const handleUpdateOvertimeStatus = async (requestId: string, status: OvertimeStatus, notes: string) => {
     if (!supabaseClient || !currentUser) return;
     const request = overtimeRequests.find(r => r.id === requestId);
     if (!request) return;
     const updatedRequest = await api.update<OvertimeRequest>(supabaseClient, 'overtime_requests', requestId, { status, managerNotes: notes });
     setOvertimeRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
     await createNotification(supabaseClient, {
        recipientId: request.teamMemberId,
        type: 'overtime_request_resolved',
        message: `قام ${currentUser.name} ب${status === 'approved' ? 'قبول' : 'رفض'} طلب الساعات الإضافية الخاص بك.`,
     });
  };
  const handleSubmitExpenseClaim = async (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => {
    if (!supabaseClient) return;
    const newClaim = await api.insert<ExpenseClaim>(supabaseClient, 'expense_claims', { ...claimData, status: 'pending' });
    setExpenseClaims(prev => [...prev, newClaim]);
  };
  const handleUpdateExpenseClaimStatus = async (claimId: string, status: ExpenseClaimStatus) => {
    if (!supabaseClient) return;
    const updatedClaim = await api.update<ExpenseClaim>(supabaseClient, 'expense_claims', claimId, { status });
    setExpenseClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
  };
  const submitWorkContractChangeRequest = async (formData: WorkContractChangeRequestFormData) => {
     if (!supabaseClient || !currentUser) return;
     const reqData = { 
        ...formData, 
        teamMemberId: currentUser.id, 
        // Fix: Explicitly cast 'pending' to the correct type to resolve TypeScript error.
        status: 'pending' as WorkContractChangeStatus,
        currentSalary: currentUser.salary,
        currentWeeklyHours: currentUser.weeklyHoursRequirement,
        createdAt: new Date().toISOString()
     };
     const newRequest = await api.insert<WorkContractChangeRequest>(supabaseClient, 'work_contract_change_requests', reqData);
     setWorkContractChangeRequests(prev => [...prev, newRequest]);
  };
  const handleUpdateWorkContractChangeRequestStatus = async (requestId: string, status: WorkContractChangeStatus, notes: string, modifiedValues?: { hours: number, salary: number }) => {
    if (!supabaseClient) return;
    const updateData: any = { status, managerNotes: notes };
    if (status === 'approved' && modifiedValues) {
        updateData.approvedWeeklyHours = modifiedValues.hours;
        updateData.approvedSalary = modifiedValues.salary;
    }
    const updatedRequest = await api.update<WorkContractChangeRequest>(supabaseClient, 'work_contract_change_requests', requestId, updateData);
    setWorkContractChangeRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
  };
  const handleIssuePenalty = async (formData: PenaltyFormData) => {
    if (!supabaseClient || !currentUser) return;
    const penaltyData = {
        ...formData,
        issuerId: currentUser.id,
        // Fix: Explicitly cast 'pending' to the correct type to resolve TypeScript error.
        status: 'pending' as PenaltyStatus,
        createdAt: new Date().toISOString(),
    };
    const newPenalty = await api.insert<Penalty>(supabaseClient, 'penalties', penaltyData);
    setPenalties(prev => [...prev, newPenalty]);
  };
  const handleUpdatePenaltyStatus = async (penaltyId: string, status: PenaltyStatus, notes: string) => {
    if (!supabaseClient) return;
    const updatedPenalty = await api.update<Penalty>(supabaseClient, 'penalties', penaltyId, { status, managerNotes: notes });
    setPenalties(prev => prev.map(p => p.id === penaltyId ? updatedPenalty : p));
  };
    const handleAppealPenalty = async (penaltyId: string, appealReason: string) => {
    if (!supabaseClient || !currentUser) return;
    try {
      const penalty = penalties.find(p => p.id === penaltyId);
      if (penalty && penalty.teamMemberId === currentUser.id) {
        const updatedPenalty = await api.update<Penalty>(supabaseClient, 'penalties', penaltyId, { status: 'appealed', appealReason });
        setPenalties(prev => prev.map(p => p.id === penaltyId ? updatedPenalty : p));
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
