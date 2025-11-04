import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { ClockIcon, CheckCircleIcon, SparklesIcon } from '../ui/Icons';
import { generatePerformanceNotes } from '../../services/geminiService';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../contexts/SupabaseContext';
import * as api from '../../services/apiService';
import { Task } from '../../types';

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
    const { addToast } = useToast();
    const { dailyLogs } = useTimeLogContext();
    const { supabaseClient } = useSupabase();
    
    const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
    const [performanceNotes, setPerformanceNotes] = useState('');

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

    const handleGenerateNotes = async () => {
        if (!currentUser) return;
        setIsGeneratingNotes(true);
        setPerformanceNotes('');
        try {
            const notes = await generatePerformanceNotes(
              currentUser.name,
              myData.userTasks.map(t => ({ title: t.title, status: t.status })),
              myData.logs.slice(-20).map(l => ({ hours: l.hours, description: l.description }))
            );
            setPerformanceNotes(notes);
        } catch (error) {
            addToast("حدث خطأ أثناء إنشاء ملخص الأداء.", "error");
        } finally {
            setIsGeneratingNotes(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card title="مؤشرات الأداء">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatCard icon={<ClockIcon className="w-6 h-6"/>} label="إجمالي الساعات المسجلة" value={myData.logs.reduce((sum, l) => sum + l.hours, 0).toFixed(1)} />
                    <StatCard icon={<CheckCircleIcon className="w-6 h-6"/>} label="المهام المكتملة" value={myData.userTasks.filter(t => t.status === 'done').length} />
                </div>
            </Card>
            <Card title="ملخص الأداء (AI)" icon={<SparklesIcon className="w-5 h-5"/>}>
                <div className="space-y-3">
                    <button onClick={handleGenerateNotes} disabled={isGeneratingNotes} className="w-full px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400 flex justify-center items-center">
                    {isGeneratingNotes ? <LoadingSpinner /> : 'إنشاء ملخص الأداء'}
                    </button>
                    {performanceNotes && <div className="p-3 border rounded-md bg-slate-50 dark:bg-slate-700/50 text-sm whitespace-pre-wrap">{performanceNotes}</div>}
                </div>
            </Card>
         </div>
    );
};