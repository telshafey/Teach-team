import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { Task, TaskStatus, ApprovalStatus } from '../../types';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { ClipboardDocumentListIcon } from '../ui/Icons';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { StatusBadge } from '../ui/StatusBadge';

export const MyTasksPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { projects, tasks, isLoading } = useProjectContext();
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');

    const myTasks = useMemo(() => {
        if (!currentUser) return [];
        const filtered = tasks.filter(task => task.assignedTo === currentUser.id);
        if (statusFilter !== 'all') {
            return filtered.filter(task => task.status === statusFilter);
        }
        return filtered.sort((a,b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
    }, [tasks, currentUser, statusFilter]);

    const projectsMap = useMemo(() => 
        projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>), 
        [projects]
    );

    const filterButtons: {label: string, value: 'all' | TaskStatus}[] = [
        {label: 'الكل', value: 'all'},
        {label: 'لم تبدأ', value: 'todo'},
        {label: 'قيد التنفيذ', value: 'inprogress'},
        {label: 'مكتملة', value: 'done'},
    ]

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">مهامي</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">جميع المهام المسندة إليك.</p>
            </div>

            <Card>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                         {filterButtons.map(btn => (
                            <button key={btn.value} onClick={() => setStatusFilter(btn.value)} className={`px-3 py-1.5 text-sm rounded-full ${statusFilter === btn.value ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>
                 {isLoading ? (
                    <div className="flex justify-center p-8"><LoadingSpinner /></div>
                 ) : myTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300">
                                <tr>
                                    <th className="px-6 py-3">المهمة</th>
                                    <th className="px-6 py-3">المشروع</th>
                                    <th className="px-6 py-3">تاريخ الاستحقاق</th>
                                    <th className="px-6 py-3">الحالة</th>
                                    <th className="px-6 py-3">حالة الموافقة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myTasks.map(task => (
                                    <tr key={task.id} onClick={() => setViewingTask(task)} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{task.title}</td>
                                        <td className="px-6 py-4">{projectsMap[task.projectId]}</td>
                                        <td className="px-6 py-4">{task.dueDate ? format(parseISO(task.dueDate), 'd MMM yyyy', { locale: arSA }) : '-'}</td>
                                        <td className="px-6 py-4"><StatusBadge status={task.status} type="task" /></td>
                                        <td className="px-6 py-4"><StatusBadge status={task.approvalStatus} type="approval" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 ) : (
                    <EmptyState
                        icon={<ClipboardDocumentListIcon className="w-12 h-12"/>}
                        title="لا توجد مهام"
                        message="لا توجد مهام مسندة إليك تطابق هذه الفئة."
                    />
                 )}
            </Card>

            {viewingTask && (
                <TaskDetailModal
                    isOpen={!!viewingTask}
                    onClose={() => setViewingTask(null)}
                    task={viewingTask}
                />
            )}
        </div>
    );
};

export default MyTasksPage;
