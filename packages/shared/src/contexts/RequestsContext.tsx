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
        return new Proxy({}, { 
            get: (target, prop) => { 
                if (prop === 'isLoading') return false;
                if (prop === 'hasPermission') return () => true;
                if (prop === 'visibleMemberIds') return new Set();
                return typeof prop === 'string' && prop.startsWith('handle') ? async () => {} : []; 
            } 
        }) as RequestsContextType; 
    };

export const useRequestsContext = useRequests;
