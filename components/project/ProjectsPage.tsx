import React, { useState, useMemo } from 'react';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Project, ProjectFormData, ProjectStatus, SuggestedTask } from '../../types';
import { PlusIcon, SearchIcon, ExclamationTriangleIcon, FolderIcon } from '../ui/Icons';
import { ProjectFormModal } from '../modals/ProjectFormModal';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { ProjectCardSkeleton } from './ProjectCardSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { useNavigation } from '../../contexts/NavigationContext';

interface ProjectCardProps {
  project: Project;
  onSelect: (projectId: string) => void;
  currency: string;
}

const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project, onSelect, currency }) => {
    const { dailyLogs } = useAppDataContext();
    const hoursLogged = useMemo(() => dailyLogs.filter(log => log.projectId === project.id).reduce((sum, log) => sum + log.hours, 0), [dailyLogs, project.id]);
    
    const budgetUsage = project.budgetHours ? (hoursLogged / project.budgetHours) * 100 : 0;
    
    const getStatusStyles = (status: ProjectStatus) => {
        switch (status) {
            case 'نشط': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300';
            case 'مكتمل': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'معلق': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
            default: return 'bg-slate-100 text-slate-800 dark:text-slate-800';
        }
    };

    return (
        <div onClick={() => onSelect(project.id)} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3 cursor-pointer hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 pr-2">{project.name}</h3>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getStatusStyles(project.status)}`}>{project.status}</span>
            </div>

            <div>
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>تقدم الميزانية (ساعات)</span>
                    <span>{budgetUsage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full ${budgetUsage > 90 ? 'bg-red-500' : 'bg-sky-500'}`}
                        style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                    ></div>
                </div>
                {project.budgetNotificationSent && (
                    <div className="flex items-center space-x-1 rtl:space-x-reverse text-amber-600 dark:text-amber-400 text-xs mt-2">
                        <ExclamationTriangleIcon className="w-4 h-4" title={`تم إرسال إشعار بتجاوز ${project.budgetNotificationSent}% من الميزانية`} />
                        <span>تجاوز الميزانية</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-3 text-slate-600 dark:text-slate-300">
                <div>
                    <span className="font-semibold">{hoursLogged.toFixed(1)}</span>
                    <span className="text-xs"> / {project.budgetHours || '∞'} ساعة</span>
                </div>
                {project.budgetAmount && (
                    <div>
                        <span className="font-semibold">{project.budgetAmount.toLocaleString()}</span>
                        <span className="text-xs"> {currency}</span>
                    </div>
                )}
            </div>
        </div>
    );
});

interface ProjectsPageProps {
  initialState?: { statusFilter: ProjectStatus };
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ initialState }) => {
    const { onNavigate } = useNavigation();
    const { projects, handleAddProject, isLoading } = useProjectContext();
    const { hasPermission } = useAuth();
    const { currency } = useAppDataContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>(initialState?.statusFilter || 'all');
    
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [projects, searchTerm, statusFilter]);

    const handleSaveProject = async (projectData: ProjectFormData, projectToUpdate: Project | null, suggestedTasks?: SuggestedTask[]) => {
        if (!projectToUpdate) {
            await handleAddProject(projectData, suggestedTasks);
        }
    };

    const handleProjectSelect = (projectId: string) => {
        onNavigate('projectDetail', { projectId });
    };

    const projectStatuses: ProjectStatus[] = ['نشط', 'مكتمل', 'معلق'];

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">المشاريع</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">تتبع وإدارة جميع مشاريعك من هنا.</p>
                </div>
                {hasPermission('manage_projects') && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                        <PlusIcon className="w-5 h-5"/><span>إضافة مشروع جديد</span>
                    </button>
                )}
            </div>

            <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <SearchIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="ابحث عن مشروع..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                    />
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 text-sm rounded-full ${statusFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>الكل</button>
                    {projectStatuses.map(status => (
                        <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 text-sm rounded-full ${statusFilter === status ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{status}</button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <ProjectCardSkeleton key={i} />)}
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <ProjectCard key={project.id} project={project} onSelect={handleProjectSelect} currency={currency} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<FolderIcon className="w-12 h-12" />}
                    title="لا توجد مشاريع"
                    message="لم يتم العثور على مشاريع تطابق معايير البحث أو التصفية."
                />
            )}

            {isModalOpen && (
                <ProjectFormModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveProject} 
                    project={null}
                />
            )}
        </div>
    );
};
