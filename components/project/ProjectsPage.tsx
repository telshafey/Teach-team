import React, { useState, useMemo } from 'react';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Project, ProjectFormData, ProjectStatus, SuggestedTask } from '../../types';
import { PlusIcon, SearchIcon, FolderIcon } from '../ui/Icons';
import { ProjectFormModal } from '../modals/ProjectFormModal';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { ProjectCardSkeleton } from './ProjectCardSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { useNavigation } from '../../contexts/NavigationContext';
import { ProjectCard } from './ProjectCard';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';

interface ProjectsPageProps {
  initialState?: { statusFilter: ProjectStatus };
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ initialState }) => {
    const { onNavigate } = useNavigation();
    const { projects: allProjects, tasks, handleAddProject, isLoading } = useProjectContext();
    const { hasPermission, visibleMemberIds } = useTeamContext();
    const { currentUser } = useAuth();
    const { currency } = useSettingsContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>(initialState?.statusFilter || 'all');

    const visibleProjects = useMemo(() => {
        if (currentUser?.roleId === 'gm') {
            return allProjects;
        }

        const projectIdsFromTasks = new Set<string>();
        tasks.forEach(task => {
            if (task.assignedTo && visibleMemberIds.has(task.assignedTo) && task.projectId) {
                projectIdsFromTasks.add(task.projectId);
            }
        });

        return allProjects.filter(p => {
            if (projectIdsFromTasks.has(p.id)) return true;
            if (p.members?.some(m => visibleMemberIds.has(m.teamMemberId))) return true;
            return false;
        });

    }, [allProjects, tasks, visibleMemberIds, currentUser]);
    
    const filteredProjects = useMemo(() => {
        return visibleProjects.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [visibleProjects, searchTerm, statusFilter]);

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
                    <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 text-sm rounded-full ${statusFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{`الكل (${visibleProjects.length})`}</button>
                    {projectStatuses.map(status => {
                        const count = visibleProjects.filter(p => p.status === status).length;
                        return (
                           <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 text-sm rounded-full ${statusFilter === status ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{`${status} (${count})`}</button>
                        )
                    })}
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
