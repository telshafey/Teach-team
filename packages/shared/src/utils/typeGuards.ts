import {
  DecisionItem,
  ExpenseClaim,
  LeaveRequest,
  OvertimeRequest,
  Penalty,
  Project,
  Task,
  TeamMember,
  WorkContractChangeRequest,
} from "../types";

export function isTeamMember(item: DecisionItem): item is TeamMember {
  return (
    (item as TeamMember).weeklyPlan !== undefined &&
    (item as TeamMember).weeklyPlan !== null &&
    (item as TeamMember).name !== undefined
  );
}

export function isTask(item: DecisionItem): item is Task {
  return (item as Task).approvalStatus !== undefined;
}

export function isProject(item: DecisionItem): item is Project {
  // Check for a property unique to Project, like the members array.
  return (
    (item as Project).members !== undefined &&
    (item as Project).description !== undefined
  );
}

export function isOvertimeRequest(item: DecisionItem): item is OvertimeRequest {
  return (item as OvertimeRequest).requestedHours !== undefined;
}

export function isLeaveRequest(item: DecisionItem): item is LeaveRequest {
  return (
    (item as LeaveRequest).startDate !== undefined &&
    (item as LeaveRequest).endDate !== undefined
  );
}

export function isWorkContractChangeRequest(
  item: DecisionItem,
): item is WorkContractChangeRequest {
  return (item as WorkContractChangeRequest).requestedWeeklyHours !== undefined;
}

export function isPenalty(item: DecisionItem): item is Penalty {
  return (item as Penalty).issuerId !== undefined;
}

export function isExpenseClaim(item: DecisionItem): item is ExpenseClaim {
  // Check for properties unique to ExpenseClaim to differentiate from other types that might have 'amount'
  return "amount" in item && "description" in item && !("issuerId" in item);
}
