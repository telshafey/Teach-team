import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeamContext } from '../contexts/TeamContext';
import { useRequestsContext } from '../contexts/RequestsContext';
import { DecisionItem, TeamMember, Project, Task } from '../types';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../contexts/SupabaseContext';
import * as api from '../services/apiService';


// Helper to get all direct and indirect report IDs recursively
const getReportIds = (managerId: number, allMembers: TeamMember[]): number[] => {
    const reportIds: number[] = [];
    const queue: number[] = [managerId];
    const visited = new Set<number>();

    while (queue.length > 0) {
        const currentManagerId = queue.shift()!;
        if (visited.has(currentManagerId)) continue;
        visited.add(currentManagerId);

        const directReports = allMembers.filter(m => m.reportsTo === currentManagerId);
        directReports.forEach(r => {
            if (!visited.has(r.id)) {
                reportIds.push(r.id);
                queue.push(r.id);
            }
        });
    }
    return Array.from(new Set(reportIds)); // Return unique IDs
};


export const usePendingApprovals = () => {
    const { currentUser } = useAuth();
    const { teamMembers } = useTeamContext();
    const { overtimeRequests, leaveRequests, workContractChangeRequests, penalties, expenseClaims } = useRequestsContext();
    const { supabaseClient } = useSupabase();

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: () => api.getAll(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });
    const { data: tasks = [] } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient,
    });


    const { myTeamIds, isManager } = useMemo(() => {
        if (!currentUser) return { myTeamIds: new Set<number>(), isManager: false };

        const isManagerRole = currentUser.roleId === 'manager';
        if (!isManagerRole) return { myTeamIds: new Set<number>(), isManager: false };
        
        const reportIds = getReportIds(currentUser.id, teamMembers);
        
        return { myTeamIds: new Set(reportIds), isManager: true };
    }, [currentUser, teamMembers]);

    const pendingItems = useMemo((): DecisionItem[] => {
        if (!currentUser) return [];

        // All pending items
        const allPendingTasks = tasks.filter(t => t.approvalStatus === 'pending');
        const allPendingPlans = teamMembers.filter(m => m.weeklyPlan.status === 'pending');
        const allPendingContracts = projects.filter(p => p.freelancerContract?.status === 'pending');
        const allPendingOvertime = overtimeRequests.filter(r => r.status === 'pending');
        const allPendingLeave = leaveRequests.filter(r => r.status === 'pending');
        const allPendingExpenseClaims = expenseClaims.filter(r => r.status === 'pending');
        const allPendingContractChanges = workContractChangeRequests.filter(r => r.status === 'pending');
        const allPendingPenalties = penalties.filter(p => p.status === 'pending');
        
        if (currentUser.roleId === 'gm') {
            return [
                ...allPendingTasks,
                ...allPendingPlans,
                ...allPendingContracts,
                ...allPendingOvertime,
                ...allPendingLeave,
                ...allPendingExpenseClaims,
                ...allPendingContractChanges,
                ...allPendingPenalties,
            ].filter(Boolean);
        }

        if (isManager) {
             const managerPendingTasks = allPendingTasks.filter(t => t.assignedTo && myTeamIds.has(t.assignedTo));
             const managerPendingPlans = allPendingPlans.filter(m => myTeamIds.has(m.id));
             
             // Managers approve things for their reports
             const managerPendingOvertime = allPendingOvertime.filter(r => myTeamIds.has(r.teamMemberId));
             const managerPendingLeave = allPendingLeave.filter(r => myTeamIds.has(r.teamMemberId));
             const managerPendingExpenseClaims = allPendingExpenseClaims.filter(r => myTeamIds.has(r.teamMemberId));
             const managerPendingContractChanges = allPendingContractChanges.filter(r => myTeamIds.has(r.teamMemberId));
             const managerPendingPenalties = allPendingPenalties.filter(p => myTeamIds.has(p.teamMemberId));

            return [
                ...managerPendingTasks,
                ...managerPendingPlans,
                ...managerPendingOvertime,
                ...managerPendingLeave,
                ...managerPendingExpenseClaims,
                ...managerPendingContractChanges,
                ...managerPendingPenalties,
            ].filter(Boolean);
        }

        return [];
    }, [currentUser, isManager, myTeamIds, projects, tasks, teamMembers, overtimeRequests, leaveRequests, expenseClaims, workContractChangeRequests, penalties]);

    return { pendingItems, count: pendingItems.length };
};