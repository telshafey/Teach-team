import React, { useMemo } from 'react';
import { TeamMember, Role, Task } from '@shared/types';
import { PerformanceSummaryCard } from '../dashboard/PerformanceSummaryCard';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { MemberInfoCard } from './MemberInfoCard';
import { MemberOpenTasksCard } from './MemberOpenTasksCard';
import { MemberRecentActivityCard } from './MemberRecentActivityCard';


interface TeamMemberDetailPageProps {
  member: TeamMember;
  role: Role | undefined;
  manager: TeamMember | undefined;
  onEdit: (member: TeamMember) => void;
  canEdit: boolean;
}

export const TeamMemberDetailPage: React.FC<TeamMemberDetailPageProps> = ({ member, role, manager, onEdit, canEdit }) => {
    const { dailyLogs } = useTimeLogContext();
    const { supabaseClient } = useSupabase();

    const { data: tasks = [] } = useQuery<Task[]>({
      queryKey: ['tasks'],
      queryFn: () => api.getAll(supabaseClient!, 'tasks'),
      enabled: !!supabaseClient,
    });

    const memberData = useMemo(() => {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));

        const memberLogs = dailyLogs.filter(log => log.teamMemberId === member.id);
        const memberTasks = tasks.filter(task => task.assignedTo === member.id);

        const currentMonthHours = memberLogs
            .filter(log => isWithinInterval(parseISO(log.date), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
            .reduce((sum, log) => sum + log.hours, 0);
        
        const lastMonthHours = memberLogs
            .filter(log => isWithinInterval(parseISO(log.date), { start: startOfLastMonth, end: endOfLastMonth }))
            .reduce((sum, log) => sum + log.hours, 0);
        
        const currentMonthTasks = memberTasks.filter(t => 
            t.status === 'done' && 
            t.dueDate && 
            isWithinInterval(parseISO(t.dueDate), { start: startOfCurrentMonth, end: endOfCurrentMonth })
        ).length;
        
        const lastMonthTasks = memberTasks.filter(t =>
            t.status === 'done' &&
            t.dueDate &&
            isWithinInterval(parseISO(t.dueDate), { start: startOfLastMonth, end: endOfLastMonth })
        ).length;

        return {
            currentMonthHours,
            lastMonthHours,
            currentMonthTasks,
            lastMonthTasks,
            recentLogs: memberLogs.slice(-5),
            openTasks: memberTasks.filter(t => t.status !== 'done'),
        };
    }, [member, dailyLogs, tasks]);
    
    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                     <MemberInfoCard 
                        member={member}
                        role={role}
                        manager={manager}
                        onEdit={onEdit}
                        canEdit={canEdit}
                     />
                </div>
                <div className="md:col-span-2">
                    <PerformanceSummaryCard 
                        currentMonthHours={memberData.currentMonthHours}
                        lastMonthHours={memberData.lastMonthHours}
                        currentMonthTasks={memberData.currentMonthTasks}
                        lastMonthTasks={memberData.lastMonthTasks}
                    />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MemberOpenTasksCard tasks={memberData.openTasks} />
                <MemberRecentActivityCard logs={memberData.recentLogs} />
            </div>
        </div>
    );
};
