import React, { useState, useMemo, useEffect } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { FolderIcon, PlusIcon, ClockIcon, SearchIcon } from '../ui/Icons';
import { Project, ProjectStatus, SuggestedTask } from '../../types';
import { ProjectFormModal } from '../modals/ProjectFormModal';
import { EmptyState } from '../ui/EmptyState';

// Helper to determine if text should be light or dark based on background color
const getTextColorForBackground = (hexColor: string): 'text-white' | 'text-slate-800' => {
    try {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        // Using the luminance formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? 'text-slate-800' : 'text-white';
    } catch (e) {
        return 'text-slate-800'; // Default to dark text on error
    }
};

interface ProjectCardProps {
    project: Project;
    onSelect: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect }) => {
    const { dailyLogs } = useAppDataContext();
    const { tasks } = useProjectContext();
    
    const projectTasks = useMemo(() => tasks.filter(t => t.projectId === project.id), [tasks, project.id]);
    const loggedHours = useMemo(() => dailyLogs.filter(l => l.projectId === project.id).reduce((sum, l) => sum + l.hours, 0), [dailyLogs, project.id]);
    
    const completedTasks = projectTasks.filter(t => t.status === 'done').length;
    const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

    const renderStatusBadge = () => {
        if (project.status === 'custom' && project.customStatusName && project.customStatusColor) {
            const textColorClass = getTextColorForBackground(project.customStatusColor);
            return (
                <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${textColorClass}`}
                    style={{ backgroundColor: project.customStatusColor }}
                >
                    {project.customStatusName}
                </span>
            );
        }

        const statusStyles: { [key: string]: string } = {
            'نشط': 'bg-sky-100 text-sky-800 dark:bg-sky-900/70 dark:text-sky-200',
            'مكتمل': 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-200',
            'معلق': 'bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-200',
        };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyles[project.status]}`}>{project.status}</span>;
    };


    return (
        <div onClick={() => onSelect(project.id)} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3 cursor-pointer hover:shadow-md hover:border-sky-300 dark:hover:border-sky-500 transition-all">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{project.name}</h3>
                {renderStatusBadge()}
            </div>
            
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">التقدم</span>
                    <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <ClockIcon className="w-4 h-4 text-slate-400" />
                    <span>{loggedHours.toFixed(1)} / {project.budgetHours || 'N/A'} ساعة</span>
                </div>
                <span>{completedTasks} / {projectTasks.length} مهام</span>
            </div>
        </div>
    );
};


interface ProjectsPageProps {
    onSelectProject: (projectId: string) => void;
    initialState?: { statusFilter?: ProjectStatus };
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectProject, initialState }) => {
    const { projects, handleAddProject, handleUpdateProject, handleAddTask } = useProjectContext();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>(initialState?.statusFilter || 'all');

    useEffect(() => {
        if (initialState?.statusFilter) {
            setStatusFilter(initialState.statusFilter);
        }
    }, [initialState]);

    const handleOpenModal = (project: Project | null) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    const handleSaveProject = async (projectData: any, tasksToAdd: SuggestedTask[] = []) => {
        if (editingProject) {
            await handleUpdateProject({ ...editingProject, ...projectData });
        } else {
            const newProject = await handleAddProject(projectData);
            // After creating the project, add the AI-suggested tasks
            for (const task of tasksToAdd) {
                await handleAddTask({
                    title: task.title,
                    projectId: newProject.id,
                    status: 'todo'
                });
            }
        }
    };
    
    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [projects, searchTerm, statusFilter]);

    return (
        <div className="p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">المشاريع</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">استعرض وأدر جميع المشاريع.</p>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                    <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-slate-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="ابحث بالاسم..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-56 py-2 pr-10 pl-4 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 dark:text-white"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
                        className="py-2 pr-3 pl-8 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 dark:text-white"
                        aria-label="تصفية حسب الحالة"
                    >
                        <option value="all">كل الحالات</option>
                        <option value="نشط">نشط</option>
                        <option value="مكتمل">مكتمل</option>
                        <option value="معلق">معلق</option>
                    </select>

                    {hasPermission('manage_projects') && (
                        <button onClick={() => handleOpenModal(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                            <PlusIcon className="w-5 h-5"/><span>إضافة مشروع</span>
                        </button>
                    )}
                </div>
            </div>
            
            {projects.length === 0 ? (
                 <Card>
                    <EmptyState
                        icon={<FolderIcon className="w-10 h-10" />}
                        title="لا توجد مشاريع بعد"
                        message="ابدأ بإضافة مشروعك الأول لتنظيم مهامك."
                        action={hasPermission('manage_projects') && (
                            <button onClick={() => handleOpenModal(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                                <PlusIcon className="w-5 h-5"/><span>إضافة مشروع</span>
                            </button>
                        )}
                    />
                </Card>
            ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProjects.map(project => (
                        <ProjectCard key={project.id} project={project} onSelect={onSelectProject} />
                    ))}
                </div>
            ) : (
                 <Card>
                    <EmptyState
                        icon={<SearchIcon className="w-10 h-10" />}
                        title="لا توجد مشاريع تطابق بحثك"
                        message="حاول تغيير كلمات البحث أو الفلاتر المستخدمة."
                    />
                </Card>
            )}

            {isModalOpen && (
                <ProjectFormModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveProject}
                    project={editingProject}
                />
            )}
        </div>
    );
};