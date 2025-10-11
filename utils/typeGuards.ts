import { TeamMember, Task, Project, OvertimeRequest, LeaveRequest, WorkContractChangeRequest, Penalty, DecisionItem } from '../types';

// This file centralizes type guard functions used across the application.

export function isTask(item: any): item is Task {
  return item && typeof item.title === 'string' && 'approvalStatus' in item;
}
export function isProject(item: any): item is Project {
    return item && typeof item.name === 'string' && 'freelancerContract' in item;
}
export function isOvertimeRequest(item: any): item is OvertimeRequest {
    return item && typeof item.requestedHours === 'number' && typeof item.weekStartDate === 'string';
}
export function isLeaveRequest(item: any): item is LeaveRequest {
    return item && typeof item.reason === 'string' && typeof item.startDate === 'string';
}
export function isWorkContractChangeRequest(item: any): item is WorkContractChangeRequest {
    return item && typeof item.requestedWeeklyHours === 'number' && typeof item.requestedSalary === 'number' && 'reason' in item;
}
export function isPenalty(item: any): item is Penalty {
    return item && typeof item.reason === 'string' && typeof item.amount === 'number' && 'issuerId' in item;
}
export function isTeamMember(item: any): item is TeamMember {
    return item && typeof item.name === 'string' && 'weeklyPlan' in item;
}
