import { DecisionItem, LeaveRequest, OvertimeRequest, Penalty, Project, Task, TeamMember, WorkContractChangeRequest } from '../types';

export function isTeamMember(item: DecisionItem): item is TeamMember {
  return (item as TeamMember).weeklyPlan !== undefined;
}

export function isTask(item: DecisionItem): item is Task {
  return (item as Task).approvalStatus !== undefined;
}

export function isProject(item: DecisionItem): item is Project {
  const status = (item as Project).status;
  return status === 'نشط' || status === 'مكتمل' || status === 'معلق';
}

export function isOvertimeRequest(item: DecisionItem): item is OvertimeRequest {
  return (item as OvertimeRequest).requestedHours !== undefined;
}

export function isLeaveRequest(item: DecisionItem): item is LeaveRequest {
  return (item as LeaveRequest).startDate !== undefined && (item as LeaveRequest).endDate !== undefined;
}

export function isWorkContractChangeRequest(item: DecisionItem): item is WorkContractChangeRequest {
  return (item as WorkContractChangeRequest).requestedWeeklyHours !== undefined;
}

export function isPenalty(item: DecisionItem): item is Penalty {
  return (item as Penalty).issuerId !== undefined;
}
