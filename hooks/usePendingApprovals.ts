import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeamContext } from '../contexts/TeamContext';
import { useProjectContext } from '../contexts/ProjectContext';
import { useRequestsContext } from '../contexts/RequestsContext';
import { DecisionItem } from '../types';

export const usePendingApprovals = () => {
    const { currentUser } = useAuth();
    const { teamMembers } = useTeamContext();
    const { projects, tasks } = useProjectContext();
    const { overtimeRequests, leaveRequests, workContractChangeRequests, penalties } = useRequestsContext();

    const { myTeam, myTeamIds, myTeamTasks, isManager } = useMemo(() => {
        if (!currentUser) return { myTeam: [], myTeamIds: [], myTeamTasks: [], isManager: false };

        const isManagerRole = currentUser.roleId === 'manager';

        if (!isManagerRole) {
            return { myTeam: [], myTeamIds: [], myTeamTasks: [], isManager: false };
        }
        
        // A manager's team includes direct reports
        const team = teamMembers.filter(m => m.reportsTo === currentUser.id);
        const teamIds = team.map(m => m.id);
        const teamTasks = tasks.filter(t => t.assignedTo && teamIds.includes(t.assignedTo));

        return { myTeam: team, myTeamIds: teamIds, myTeamTasks: teamTasks, isManager: true };
    }, [currentUser, teamMembers, tasks]);

    const pendingItems = useMemo((): DecisionItem[] => {
        if (!currentUser) return [];

        // All pending items
        const allPendingTasks = tasks.filter(t => t.approvalStatus === 'pending');
        const allPendingPlans = teamMembers.filter(m => m.weeklyPlan.status === 'pending');
        const allPendingContracts = projects.filter(p => p.freelancerContract?.status === 'pending');
        const allPendingOvertime = overtimeRequests.filter(r => r.status === 'pending');
        const allPendingLeave = leaveRequests.filter(r => r.status === 'pending');
        const allPendingContractChanges = workContractChangeRequests.filter(r => r.status === 'pending');
        const allPendingPenalties = penalties.filter(p => p.status === 'pending');
        
        if (currentUser.roleId === 'gm') {
            return [
                ...allPendingTasks,
                ...allPendingPlans,
                ...allPendingContracts,
                ...allPendingOvertime,
                ...allPendingLeave,
                ...allPendingContractChanges,
                ...allPendingPenalties,
            ].filter(Boolean);
        }

        if (isManager) {
             const managerPendingTasks = allPendingTasks.filter(t => t.assignedTo && myTeamIds.includes(t.assignedTo));
             const managerPendingPlans = allPendingPlans.filter(m => myTeamIds.includes(m.id));
             
             // Managers approve things for their direct reports
             const managerPendingOvertime = allPendingOvertime.filter(r => myTeamIds.includes(r.teamMemberId));
             const managerPendingLeave = allPendingLeave.filter(r => myTeamIds.includes(r.teamMemberId));
             const managerPendingContractChanges = allPendingContractChanges.filter(r => myTeamIds.includes(r.teamMemberId));
             const managerPendingPenalties = allPendingPenalties.filter(p => myTeamIds.includes(p.teamMemberId));

            return [
                ...managerPendingTasks,
                ...managerPendingPlans,
                // Freelancer contracts are handled by GM, not managers in this logic
                ...managerPendingOvertime,
                ...managerPendingLeave,
                ...managerPendingContractChanges,
                ...managerPendingPenalties,
            ].filter(Boolean);
        }

        return [];
    }, [currentUser, isManager, myTeamIds, projects, tasks, teamMembers, overtimeRequests, leaveRequests, workContractChangeRequests, penalties]);

    return { pendingItems, count: pendingItems.length };
};
