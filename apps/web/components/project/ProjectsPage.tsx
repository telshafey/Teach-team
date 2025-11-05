import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useProjectContext } from '@shared/contexts/ProjectContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { Project, ProjectFormData, ProjectStatus, SuggestedTask } from '@shared/types';
import { ProjectCard } from './ProjectCard';
import { ProjectFormModal } from '../modals/ProjectFormModal';
import { PlusIcon, FolderIcon } from '../ui/Icons';
import { useNavigation } from '../../contexts/NavigationContext';
import { ProjectCardSkeleton } from './ProjectCardSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';

interface ProjectsPageProps {
    isModalOpen?: boolean;
    initialState?: {
        statusFilter?: ProjectStatus;
    };
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ isModalOpen: openModal, initialState }) => {
    const { onNavigate } = useNavigation();
    const { handleAddProject } = useProjectContext();
    const { currency } = useSettingsContext();
    const { hasPermission } = useTeamContext();
    const { supabaseClient } = useSupabase();

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>(initialState?.statusFilter || 'all');

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.getAll<Project>(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });
    
    useEffect(() => {
        if(openModal) {
            setIsFormModalOpen(true);
        }
    }, [openModal]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            if (!p.name) return false; // Guard against incomplete cached data
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [projects, searchTerm, statusFilter]);

    const statusFilters: { label: string; value: ProjectStatus | 'all' }[] = [
        { label: 'الكل', value: 'all' },
        { label: 'نشط', value: 'نشط' },
        { label: 'مكتمل', value: 'مكتمل' },
        { label: 'معلق', value: 'معلق' },
    ];
    
    const canManageProjects = hasPermission('manage_projects');

    const handleSaveNewProject = useCallback((projectData: ProjectFormData, projectToUpdate: Project | null, suggestedTasks?: SuggestedTask[]) => {
        return handleAddProject(projectData, suggestedTasks);
    }, [handleAddProject]);

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">المشاريع</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">تصفح وإدارة جميع المشاريع.</p>
                </div>
                {canManageProjects && (
                    <button onClick={() => setIsFormModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                        <PlusIcon className="w-5 h-5"/><span>مشروع جديد</span>
                    </button>
                )}
            </div>
            
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="ابحث عن مشروع..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 p-2 border border-slate-300 dark:border-slate-600 rounded-md"
                />
                <div className="flex items-center space-x-2 rtl:space-x-reverse bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
                    {statusFilters.map(filter => (
                        <button key={filter.value} onClick={() => setStatusFilter(filter.value)} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${statusFilter === filter.value ? 'bg-white dark:bg-slate-700 shadow text-sky-600' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                            {filter.label}
                        </button>
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
                        <ProjectCard key={project.id} project={project} onSelect={(id) => onNavigate('projectDetail', { projectId: id })} currency={currency} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<FolderIcon className="w-12 h-12" />}
                    title="لا توجد مشاريع"
                    message="لم يتم العثور على مشاريع تطابق بحثك أو الفلتر المطبق."
                    action={canManageProjects && <button onClick={() => setIsFormModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">إنشاء مشروع جديد</button>}
                />
            )}

            {isFormModalOpen && canManageProjects && (
                <ProjectFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
                    onSave={handleSaveNewProject}
                    project={null}
                />
            )}
        </div>
    );
};