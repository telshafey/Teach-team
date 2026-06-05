import React, { useMemo } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { Card } from '../ui/Card';
import { ClockIcon, CheckCircleIcon } from '../ui/Icons';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Task } from '@shared/types';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; }> = ({ icon, label, value }) => (
    <div className="flex items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-sky-100 dark:bg-sky-900/50 rounded-lg text-sky-600 dark:text-sky-400">
            {icon}
        </div>
        <div className="mr-4 rtl:mr-0 rtl:ml-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);


export const ProfilePerformance: React.FC = () => {
    const { currentUser } = useAuth();
    const { dailyLogs } = useTimeLogContext();
    const { supabaseClient } = useSupabase();

    const { data: tasks = [] } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient && !!currentUser,
    });

    const myData = useMemo(() => {
        if (!currentUser) return { logs: [], userTasks: [] };
        return {
            logs: dailyLogs.filter(l => l.teamMemberId === currentUser.id),
            userTasks: tasks.filter(t => t.assignedTo === currentUser.id),
        }
    }, [dailyLogs, tasks, currentUser]);

    return (
        <div className="space-y-6">
            <Card title="مؤشرات الأداء">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatCard icon={<ClockIcon className="w-6 h-6"/>} label="إجمالي الساعات المسجلة" value={myData.logs.reduce((sum, l) => sum + l.hours, 0).toFixed(1)} />
                    <StatCard icon={<CheckCircleIcon className="w-6 h-6"/>} label="المهام المكتملة" value={myData.userTasks.filter(t => t.status === 'done').length} />
                </div>
            </Card>
         </div>
    );
};