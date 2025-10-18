import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { Task, TaskStatus } from '../../types';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { ClipboardDocumentListIcon, PlusIcon, SearchIcon, PencilIcon, TrashIcon, ChevronUpDownIcon, ArrowUpIcon, ArrowDownIcon } from '../ui/Icons';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { StatusBadge } from '../ui/StatusBadge';
import { useTeamContext } from '../../contexts/TeamContext';
import { ConfirmationModal } from '../modals/ConfirmationModal';

type SortableKeys = 'title' | 'projectId' | 'assignedTo' | 'dueDate' | 'status';

const SortableHeader: React.FC<{ 
    sortKey: SortableKeys;
    sortConfig: { key: SortableKeys; direction: 'ascending' | 'descending' };
    requestSort: (key: SortableKeys) => void;
    children: React.ReactNode; 
}> = ({ sortKey, sortConfig, requestSort, children }) => {
    const isSorted = sortConfig?.key === sortKey;
    const Icon = isSorted ? (sortConfig.direction === 'ascending' ? ArrowUpIcon : ArrowDownIcon) : ChevronUpDownIcon;

    return (
        <th className="px-6 py-3 cursor-pointer select-none" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <span>{children}</span>
                <Icon className={`w-4 h-4 ${isSorted ? '' : 'text-slate-400'}`} />
            </div>
        </th>
    );
};

export const AllTasksPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { projects, tasks, isLoading, handleAddTask, handleUpdateTask, handleDeleteTask } = useProjectContext();
    const { teamMembers, hasPermission } = useTeamContext();

    const [modalState, setModalState] = useState<{ task: Task | 'new' | null, mode: 'view' | 'edit' }>({ task: null, mode: 'view' });
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

    const [filters, setFilters] = useState({
        status: 'all' as 'all' | TaskStatus,
        projectId: 'all',
        assigneeId: currentUser?.roleId === 'gm' || currentUser?.roleId === 'manager' ? 'all' : currentUser?.id.toString() || 'all',
        searchTerm: ''
    });

    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'dueDate', direction: 'ascending' });

    const canEdit = hasPermission('edit_tasks');
    const canDelete = hasPermission('delete_tasks');

    const visibleAssignees = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.roleId === 'gm') return teamMembers;
        if (currentUser.roleId === 'manager') {
            const myTeamIds = teamMembers.filter(m => m.reportsTo === currentUser.id).map(m => m.id);
            return [currentUser, ...teamMembers.filter(m => myTeamIds.includes(m.id))];
        }
        return [currentUser];
    }, [currentUser, teamMembers]);

    const projectsMap = useMemo(() =>
        projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>),
        [projects]
    );
    const membersMap = useMemo(() =>
        teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<string, {name: string}>),
        [teamMembers]
    );

    const sortedTasks = useMemo(() => {
        if (!currentUser) return [];
        let filtered = tasks.filter(task => {
            const statusMatch = filters.status === 'all' || task.status === filters.status;
            const projectMatch = filters.projectId === 'all' || (filters.projectId === 'none' && !task.projectId) || task.projectId === filters.projectId;
            const assigneeMatch = filters.assigneeId === 'all' || (filters.assigneeId === 'unassigned' && !task.assignedTo) || task.assignedTo?.toString() === filters.assigneeId;
            const searchMatch = !filters.searchTerm || task.title.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const permissionMatch = currentUser.roleId === 'gm' || currentUser.roleId === 'manager' || task.assignedTo === currentUser.id;
            return statusMatch && projectMatch && assigneeMatch && searchMatch && permissionMatch;
        });

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];
                
                if (sortConfig.key === 'projectId') {
                    aValue = a.projectId ? projectsMap[a.projectId] || '' : 'zz';
                    bValue = b.projectId ? projectsMap[b.projectId] || '' : 'zz';
                } else if (sortConfig.key === 'assignedTo') {
                    aValue = a.assignedTo ? membersMap[a.assignedTo]?.name || '' : 'zz';
                    bValue = b.assignedTo ? membersMap[b.assignedTo]?.name || '' : 'zz';
                } else if (sortConfig.key === 'dueDate') {
                    aValue = a.dueDate ? parseISO(a.dueDate).getTime() : Infinity;
                    bValue = b.dueDate ? parseISO(b.dueDate).getTime() : Infinity;
                }

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [tasks, currentUser, filters, sortConfig, projectsMap, membersMap]);
    
    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleSaveTask = async (taskData: Partial<Task>, isNew: boolean) => {
        if (isNew) {
            await handleAddTask(taskData as any);
        } else if (modalState.task && modalState.task !== 'new') {
            await handleUpdateTask({ ...modalState.task as Task, ...taskData });
        }
    };

    const handleOpenModal = (task: Task | 'new', mode: 'view' | 'edit' = 'view') => {
        setModalState({ task, mode });
    };
    
    const confirmDelete = async () => {
        if(taskToDelete) {
            await handleDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
        }
    }
    
    const statusFilterButtons: { label: string, value: 'all' | TaskStatus }[] = [
        { label: 'الكل', value: 'all' },
        { label: 'لم تبدأ', value: 'todo' },
        { label: 'قيد التنفيذ', value: 'inprogress' },
        { label: 'مكتملة', value: 'done' },
    ];
    
    const showAssigneeFilter = currentUser?.roleId === 'gm' || currentUser?.roleId === 'manager';

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">المهام</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">عرض وتصفية جميع المهام في النظام.</p>
                </div>
                <button onClick={() => handleOpenModal('new', 'edit')} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                    <PlusIcon className="w-5 h-5" /><span>إضافة مهمة جديدة</span>
                </button>
            </div>

            <Card>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="relative">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-400" /></div>
                            <input type="text" placeholder="ابحث بالاسم..." value={filters.searchTerm} onChange={e => setFilters(f => ({...f, searchTerm: e.target.value}))} className="w-full p-2 pr-10 border rounded-md" />
                        </div>
                        <select value={filters.projectId} onChange={e => setFilters(f => ({...f, projectId: e.target.value}))} className="w-full p-2 border rounded-md">
                            <option value="all">كل المشاريع</option>
                            <option value="none">مهام خاصة (بدون مشروع)</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                       {showAssigneeFilter && (
                             <select value={filters.assigneeId} onChange={e => setFilters(f => ({...f, assigneeId: e.target.value}))} className="w-full p-2 border rounded-md">
                                <option value="all">كل الأعضاء</option>
                                <option value="unassigned">غير مسندة</option>
                                {visibleAssignees.map(m => <option key={m.id} value={m.id.toString()}>{m.name}</option>)}
                            </select>
                       )}
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        {statusFilterButtons.map(btn => (
                            <button key={btn.value} onClick={() => setFilters(f => ({...f, status: btn.value}))} className={`px-3 py-1.5 text-sm rounded-full ${filters.status === btn.value ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>{btn.label}</button>
                        ))}
                    </div>
                </div>
                {isLoading ? (
                    <div className="flex justify-center p-8"><LoadingSpinner /></div>
                ) : sortedTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50"><tr>
                                <SortableHeader sortKey="title" sortConfig={sortConfig} requestSort={requestSort}>المهمة</SortableHeader>
                                <SortableHeader sortKey="projectId" sortConfig={sortConfig} requestSort={requestSort}>المشروع</SortableHeader>
                                <SortableHeader sortKey="assignedTo" sortConfig={sortConfig} requestSort={requestSort}>مسندة إلى</SortableHeader>
                                <SortableHeader sortKey="dueDate" sortConfig={sortConfig} requestSort={requestSort}>تاريخ الاستحقاق</SortableHeader>
                                <SortableHeader sortKey="status" sortConfig={sortConfig} requestSort={requestSort}>الحالة</SortableHeader>
                                {(canEdit || canDelete) && <th className="px-6 py-3">الإجراءات</th>}
                            </tr></thead>
                            <tbody>
                                {sortedTasks.map(task => (
                                    <tr key={task.id} onClick={() => handleOpenModal(task, 'view')} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer">
                                        <td className="px-6 py-4 font-medium">{task.title}</td>
                                        <td className="px-6 py-4">{task.projectId ? projectsMap[task.projectId] : 'مهمة خاصة'}</td>
                                        <td className="px-6 py-4">{task.assignedTo ? membersMap[task.assignedTo]?.name : '-'}</td>
                                        <td className="px-6 py-4">{task.dueDate ? format(parseISO(task.dueDate), 'd MMM yyyy', { locale: arSA }) : '-'}</td>
                                        <td className="px-6 py-4"><StatusBadge status={task.status} type="task" /></td>
                                        {(canEdit || canDelete) && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                                    {canEdit && <button onClick={(e) => {e.stopPropagation(); handleOpenModal(task, 'edit')}} className="p-1 text-slate-500 hover:text-sky-600"><PencilIcon className="w-4 h-4" /></button>}
                                                    {canDelete && <button onClick={(e) => {e.stopPropagation(); setTaskToDelete(task)}} className="p-1 text-slate-500 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState icon={<ClipboardDocumentListIcon className="w-12 h-12" />} title="لا توجد مهام" message="لم يتم العثور على مهام تطابق معايير البحث." />
                )}
            </Card>

            {modalState.task !== null && (
                <TaskDetailModal
                    isOpen={modalState.task !== null}
                    onClose={() => setModalState({ task: null, mode: 'view' })}
                    task={modalState.task === 'new' ? null : modalState.task}
                    onSave={handleSaveTask}
                    initialMode={modalState.task === 'new' ? 'edit' : modalState.mode}
                />
            )}
            
            {taskToDelete && (
                 <ConfirmationModal
                    isOpen={!!taskToDelete}
                    onClose={() => setTaskToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد حذف المهمة"
                    message={`هل أنت متأكد من رغبتك في حذف مهمة "${taskToDelete?.title}"؟`}
                    isDestructive
                />
            )}
        </div>
    );
};