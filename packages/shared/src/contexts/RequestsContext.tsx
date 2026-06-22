import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LeaveRequest,
  OvertimeRequest,
  ExpenseClaim,
  WorkContractChangeRequest,
  Penalty,
  LeaveRequestFormData,
  OvertimeRequestFormData,
  ExpenseClaimFormData,
  WorkContractChangeRequestFormData,
  PenaltyFormData,
  WorkContractChangeStatus,
} from "../types";
import { useSupabase } from "./SupabaseContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import * as api from "../services/apiService";
import { createNotification } from "../services/notificationService";
import { useTeamContext } from "./TeamContext";
import { useRealtime } from "./RealtimeContext";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface RequestsContextType {
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  expenseClaims: ExpenseClaim[];
  workContractChangeRequests: WorkContractChangeRequest[];
  penalties: Penalty[];
  isLoading: boolean;
  submitLeaveRequest: (formData: LeaveRequestFormData) => Promise<void>;
  cancelLeaveRequest: (id: string) => Promise<void>;
  handleUpdateLeaveStatus: (
    id: string,
    status: LeaveRequest["status"],
    managerNotes: string,
  ) => Promise<void>;
  submitOvertimeRequest: (formData: OvertimeRequestFormData) => Promise<void>;
  cancelOvertimeRequest: (id: string) => Promise<void>;
  handleUpdateOvertimeStatus: (
    id: string,
    status: OvertimeRequest["status"],
    managerNotes: string,
  ) => Promise<void>;
  handleSubmitExpenseClaim: (
    formData: Omit<ExpenseClaim, "id" | "status">,
  ) => Promise<void>;
  handleUpdateExpenseClaimStatus: (
    id: string,
    status: ExpenseClaim["status"],
  ) => Promise<void>;
  submitWorkContractChangeRequest: (
    formData: WorkContractChangeRequestFormData,
  ) => Promise<void>;
  handleUpdateWorkContractChangeRequestStatus: (
    id: string,
    status: WorkContractChangeRequest["status"],
    notes: string,
    modifications?: { hours: number; salary: number },
  ) => Promise<void>;
  handleIssuePenalty: (formData: PenaltyFormData) => Promise<void>;
  handleAppealPenalty: (id: string, appealReason: string) => Promise<void>;
  handleUpdatePenaltyStatus: (
    id: string,
    status: Penalty["status"],
    notes: string,
  ) => Promise<void>;
}

const RequestsContext = createContext<RequestsContextType | undefined>(
  undefined,
);

const tableToQueryKey: Record<string, string> = {
  leave_requests: "leave_requests",
  overtime_requests: "overtime_requests",
  expense_claims: "expense_claims",
  work_contract_change_requests: "work_contract_change_requests",
  penalties: "penalties",
};

export const useRequests = (): RequestsContextType => { 
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaveRequests = [], isLoading: isLeaveLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["leave_requests"],
    queryFn: async () => {
      if (!supabaseClient) return [];
      return api.getAll<LeaveRequest>(supabaseClient, "leave_requests");
    },
    enabled: !!supabaseClient,
  });

  const { data: overtimeRequests = [], isLoading: isOvertimeLoading } = useQuery<OvertimeRequest[]>({
    queryKey: ["overtime_requests"],
    queryFn: async () => {
      if (!supabaseClient) return [];
      return api.getAll<OvertimeRequest>(supabaseClient, "overtime_requests");
    },
    enabled: !!supabaseClient,
  });

  const { data: expenseClaims = [], isLoading: isExpenseLoading } = useQuery<ExpenseClaim[]>({
    queryKey: ["expense_claims"],
    queryFn: async () => {
      if (!supabaseClient) return [];
      return api.getAll<ExpenseClaim>(supabaseClient, "expense_claims");
    },
    enabled: !!supabaseClient,
  });

  const { data: workContractChangeRequests = [], isLoading: isWorkLoading } = useQuery<WorkContractChangeRequest[]>({
    queryKey: ["work_contract_change_requests"],
    queryFn: async () => {
      if (!supabaseClient) return [];
      return api.getAll<WorkContractChangeRequest>(supabaseClient, "work_contract_change_requests");
    },
    enabled: !!supabaseClient,
  });

  const { data: penalties = [], isLoading: isPenaltyLoading } = useQuery<Penalty[]>({
    queryKey: ["penalties"],
    queryFn: async () => {
      if (!supabaseClient) return [];
      return api.getAll<Penalty>(supabaseClient, "penalties");
    },
    enabled: !!supabaseClient,
  });

  const isLoading = isLeaveLoading || isOvertimeLoading || isExpenseLoading || isWorkLoading || isPenaltyLoading;

  const submitLeaveRequest = useCallback(async (formData: LeaveRequestFormData) => {
    if (!supabaseClient) return;
    try {
      await api.insert(supabaseClient, "leave_requests", api.camelToSnakeCase(formData));
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      addToast("تم تقديم طلب الإجازة بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل تقديم طلب الإجازة", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const cancelLeaveRequest = useCallback(async (id: string) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, "leave_requests", id);
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      addToast("تم إلغاء طلب الإجازة بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل إلغاء طلب الإجازة", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleUpdateLeaveStatus = useCallback(async (id: string, status: LeaveRequest["status"], managerNotes: string) => {
    if (!supabaseClient) return;
    try {
      await api.update(supabaseClient, "leave_requests", id, { status, manager_notes: managerNotes });
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      addToast("تم تحديث حالة طلب الإجازة بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل تحديث حالة طلب الإجازة", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const submitOvertimeRequest = useCallback(async (formData: OvertimeRequestFormData) => {
    if (!supabaseClient) return;
    try {
      await api.insert(supabaseClient, "overtime_requests", api.camelToSnakeCase(formData));
      queryClient.invalidateQueries({ queryKey: ["overtime_requests"] });
      addToast("تم تقديم طلب الساعات الإضافية بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل تقديم طلب الساعات الإضافية", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const cancelOvertimeRequest = useCallback(async (id: string) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, "overtime_requests", id);
      queryClient.invalidateQueries({ queryKey: ["overtime_requests"] });
      addToast("تم إلغاء طلب الساعات الإضافية", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل إلغاء الطلب", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleUpdateOvertimeStatus = useCallback(async (id: string, status: OvertimeRequest["status"], managerNotes: string) => {
    if (!supabaseClient) return;
    try {
      await api.update(supabaseClient, "overtime_requests", id, { status, manager_notes: managerNotes });
      queryClient.invalidateQueries({ queryKey: ["overtime_requests"] });
      addToast("تم تحديث حالة طلب الساعات الإضافية", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل التحديث", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleSubmitExpenseClaim = useCallback(async (formData: Omit<ExpenseClaim, "id" | "status">) => {
    if (!supabaseClient) return;
    try {
      await api.insert(supabaseClient, "expense_claims", api.camelToSnakeCase(formData));
      queryClient.invalidateQueries({ queryKey: ["expense_claims"] });
      addToast("تم تقديم طلب الصرف بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل تقديم طلب الصرف", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleUpdateExpenseClaimStatus = useCallback(async (id: string, status: ExpenseClaim["status"]) => {
    if (!supabaseClient) return;
    try {
      await api.update(supabaseClient, "expense_claims", id, { status });
      queryClient.invalidateQueries({ queryKey: ["expense_claims"] });
      addToast("تم تحديث حالة طلب الصرف بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل تحديث حالة الطلب", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const submitWorkContractChangeRequest = useCallback(async (formData: WorkContractChangeRequestFormData) => {
    if (!supabaseClient) return;
    try {
      await api.insert(supabaseClient, "work_contract_change_requests", api.camelToSnakeCase(formData));
      queryClient.invalidateQueries({ queryKey: ["work_contract_change_requests"] });
      addToast("تم تقديم طلب تعديل عقد العمل بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل تقديم الطلب", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleUpdateWorkContractChangeRequestStatus = useCallback(async (
    id: string,
    status: WorkContractChangeRequest["status"],
    notes: string,
    modifications?: { hours: number; salary: number },
  ) => {
    if (!supabaseClient) return;
    try {
      await api.update(supabaseClient, "work_contract_change_requests", id, { status, notes, ...api.camelToSnakeCase(modifications || {}) });
      queryClient.invalidateQueries({ queryKey: ["work_contract_change_requests"] });
      addToast("تم تحديث حالة طلب تعديل عقد العمل بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل التحديث", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleIssuePenalty = useCallback(async (formData: PenaltyFormData) => {
    if (!supabaseClient) return;
    try {
      await api.insert(supabaseClient, "penalties", api.camelToSnakeCase(formData));
      queryClient.invalidateQueries({ queryKey: ["penalties"] });
      addToast("تم إصدار الجزاء بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل إصدار الجزاء", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleAppealPenalty = useCallback(async (id: string, appealReason: string) => {
    if (!supabaseClient) return;
    try {
      await api.update(supabaseClient, "penalties", id, { status: "appealed", appeal_reason: appealReason });
      queryClient.invalidateQueries({ queryKey: ["penalties"] });
      addToast("تم تقديم التظلم بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل تقديم التظلم", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const handleUpdatePenaltyStatus = useCallback(async (
    id: string,
    status: Penalty["status"],
    notes: string,
  ) => {
    if (!supabaseClient) return;
    try {
      await api.update(supabaseClient, "penalties", id, { status, manager_notes: notes });
      queryClient.invalidateQueries({ queryKey: ["penalties"] });
      addToast("تم تحديث حالة الجزاء بنجاح", "success");
    } catch (err: any) {
      addToast(err?.message || "فشل التحديث", "error");
      throw err;
    }
  }, [supabaseClient, queryClient, addToast]);

  const { subscribe } = useRealtime();
  useEffect(() => {
    if (!supabaseClient) return;
    const unsubscribes = [
      subscribe("leave_requests", () => {
        queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      }),
      subscribe("overtime_requests", () => {
        queryClient.invalidateQueries({ queryKey: ["overtime_requests"] });
      }),
      subscribe("expense_claims", () => {
        queryClient.invalidateQueries({ queryKey: ["expense_claims"] });
      }),
      subscribe("work_contract_change_requests", () => {
        queryClient.invalidateQueries({ queryKey: ["work_contract_change_requests"] });
      }),
      subscribe("penalties", () => {
        queryClient.invalidateQueries({ queryKey: ["penalties"] });
      }),
    ];
    return () => {
      unsubscribes.forEach((unsub) => {
        if (unsub) unsub();
      });
    };
  }, [supabaseClient, subscribe, queryClient]);

  return {
    leaveRequests,
    overtimeRequests,
    expenseClaims,
    workContractChangeRequests,
    penalties,
    isLoading,
    submitLeaveRequest,
    cancelLeaveRequest,
    handleUpdateLeaveStatus,
    submitOvertimeRequest,
    cancelOvertimeRequest,
    handleUpdateOvertimeStatus,
    handleSubmitExpenseClaim,
    handleUpdateExpenseClaimStatus,
    submitWorkContractChangeRequest,
    handleUpdateWorkContractChangeRequestStatus,
    handleIssuePenalty,
    handleAppealPenalty,
    handleUpdatePenaltyStatus,
  };
};

export const useRequestsContext = useRequests;
