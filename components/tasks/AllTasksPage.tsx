import React, { useState, useMemo } from 'react';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { Task, TaskStatus, TeamMember, Project } from '../../types';
import { Card } from '../ui/Card';
import { TaskTableRow } from './TaskTableRow';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { ClipboardDocumentListIcon, PlusIcon } from '../ui/Icons';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../contexts/SupabaseContext';
import * as api from '../../services/apiService';

type SortKey = 'title' | 'projectName' | 'assigneeName' | 'dueDate' | 'status';

export const AllTasksPage: React.FC = () => {
    const { handleUpdateTask, handleDeleteTask, handleAddTask } = useProjectContext();
    const { teamMembers, hasPermission } = useTeamContext();
    const { currentUser } = useAuth();
    const { supabaseClient } = useSupabase();

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        assignee: 'me', // 'me', 'all', or memberId
        status: 'open', // 'open', 'all', or TaskStatus
    });
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'dueDate', direction: 'asc' });

    const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.getAll<Project>(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });
    const { data: tasks = [], isLoading: areTasksLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => api.getAll<Task>(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient,
    });
    const isLoading = isProjectsLoading || areTasksLoading;

    const canCreateTasks = hasPermission('create_tasks');
    const canEditTasks = hasPermission('edit_tasks');
    const canDeleteTasks = hasPermission('delete_tasks');

    const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {} as Record<number, string>), [teamMembers]);
    const projectsMap = useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>), [projects]);

    const filteredAndSortedTasks = useMemo(() => {
        if (!currentUser) return [];

        let filtered = tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesAssignee = false;
            if (filters.assignee === 'me') {
                matchesAssignee = task.assignedTo === currentUser.id;
            } else if (filters.assignee === 'all') {
                matchesAssignee = true;
            } else {
                matchesAssignee = task.assignedTo === parseInt(filters.assignee, 10);
            }

            let matchesStatus = false;
            if (filters.status === 'all') {
                matchesStatus = true;
            } else if (filters.status === 'open') {
                matchesStatus = task.status !== 'done';
            } else {
                matchesStatus = task.status === filters.status;
            }

            return matchesSearch && matchesAssignee && matchesStatus;
        });

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aVal = getSortValue(a, sortConfig.key);
                const bVal = getSortValue(b, sortConfig.key);
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [tasks, searchTerm, filters, sortConfig, currentUser, membersMap, projectsMap]);

    function getSortValue(task: Task, key: SortKey): string | number {
        switch (key) {
            case 'title': return task.title.toLowerCase();
            case 'projectName': return task.projectId ? projectsMap[task.projectId]?.toLowerCase() || 'zzzz' : 'zzzz';
            case 'assigneeName': return task.assignedTo ? membersMap[task.assignedTo]?.toLowerCase() || 'zzzz' : 'zzzz';
            case 'dueDate': return task.dueDate ? new Date(task.dueDate).getTime() : Infinity;
            case 'status': return task.status;
        }
    }

    const handleSaveTask = async (taskData: Partial<Task>, isNew: boolean) => {
        if (isNew) {
            await handleAddTask(taskData as Omit<Task, 'id' | 'approvalStatus' | 'creatorId'>, taskData.projectId);
        } else if (selectedTask) {
            await handleUpdateTask({ ...taskData, id: selectedTask.id });
        }
        setIsFormOpen(false);
        setSelectedTask(null);
    };

    if (isLoading) {
        return <div className="p-6 flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">جميع المهام</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">عرض وتصفية جميع المهام المتاحة لك.</p>
                </div>
                {canCreateTasks && (
                    <button onClick={() => { setSelectedTask(null); setIsFormOpen(true); }} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                        <PlusIcon className="w-5 h-5"/><span>مهمة جديدة</span>
                    </button>
                )}
            </div>
            
            <Card>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4">
                    <input type="text" placeholder="ابحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-auto flex-grow p-2 border rounded-md" />
                    <select value={filters.assignee} onChange={e => setFilters({...filters, assignee: e.target.value})} className="p-2 border rounded-md">
                        <option value="me">الخاصة بي</option>
                        <option value="all">الكل</option>
                    </select>
                    <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="p-2 border rounded-md">
                        <option value="open">المفتوحة</option>
                        <option value="all">الكل</option>
                        <option value="todo">لم تبدأ</option>
                        <option value="inprogress">قيد التنفيذ</option>
                        <option value="done">مكتملة</option>
                    </select>
                </div>

                {filteredAndSortedTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                             <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-3">المهمة</th>
                                    <th className="px-6 py-3">المشروع</th>
                                    <th className="px-6 py-3">المسؤول</th>
                                    <th className="px-6 py-3">تاريخ الاستحقاق</th>
                                    <th className="px-6 py-3">الحالة</th>
                                    {(canEditTasks || canDeleteTasks) && <th className="px-6 py-3">الإجراءات</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedTasks.map(task => (
                                    <TaskTableRow 
                                        key={task.id}
                                        task={task}
                                        projectName={task.projectId ? projectsMap[task.projectId] || '-' : '-'}
                                        assigneeName={task.assignedTo ? membersMap[task.assignedTo] || 'غير معروف' : 'غير مسندة'}
                                        onEdit={() => { setSelectedTask(task); setIsFormOpen(true); }}
                                        onDelete={() => setTaskToDelete(task)}
                                        onSelect={() => setSelectedTask(task)}
                                        canEdit={canEditTasks}
                                        canDelete={canDeleteTasks}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState icon={<ClipboardDocumentListIcon className="w-12 h-12"/>} title="لا توجد مهام" message="لم يتم العثور على مهام تطابق الفلاتر المطبقة."/>
                )}
            </Card>

            {(isFormOpen || selectedTask) && <TaskDetailModal isOpen={isFormOpen || !!selectedTask} onClose={() => { setIsFormOpen(false); setSelectedTask(null); }} task={selectedTask} onSave={handleSaveTask} initialMode={isFormOpen && !selectedTask ? 'edit' : 'view'} />}
            {taskToDelete && <ConfirmationModal isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={async () => { if(taskToDelete) await handleDeleteTask(taskToDelete); setTaskToDelete(null); }} title="تأكيد الحذف" message={`هل أنت متأكد من حذف مهمة "${taskToDelete.title}"؟`} isDestructive />}
        </div>
    );
};
