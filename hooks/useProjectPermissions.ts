import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeamContext } from '../contexts/TeamContext';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../contexts/SupabaseContext';
import * as api from '../services/apiService';
import { Project } from '../types';

export const useProjectPermissions = (projectId?: string) => {
    const { currentUser } = useAuth();
    const { hasPermission: hasGlobalPermission } = useTeamContext();
    const { supabaseClient } = useSupabase();

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: () => api.getAll(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });

    const permissions = useMemo(() => {
        const canGloballyManageProjects = hasGlobalPermission('manage_projects');
        
        const defaultPermissions = {
            canEditProjectSettings: canGloballyManageProjects || hasGlobalPermission('edit_projects'),
            canManageTasks: canGloballyManageProjects || hasGlobalPermission('create_tasks') || hasGlobalPermission('edit_tasks') || hasGlobalPermission('delete_tasks'),
            canManageMembers: canGloballyManageProjects,
        };

        if (!currentUser || !projectId) {
            return defaultPermissions;
        }

        if (canGloballyManageProjects) {
            return { canEditProjectSettings: true, canManageTasks: true, canManageMembers: true };
        }

        const project = projects.find(p => p.id === projectId);
        if (!project?.members) {
            return defaultPermissions;
        }

        const projectMemberInfo = project.members.find(m => m.teamMemberId === currentUser.id);

        if (!projectMemberInfo) {
            return defaultPermissions;
        }

        if (projectMemberInfo.projectRole === 'Manager') {
            return {
                canEditProjectSettings: true,
                canManageTasks: true,
                canManageMembers: true,
            };
        }
        
        if (projectMemberInfo.projectRole === 'Member') {
             return {
                ...defaultPermissions,
                canManageTasks: true,
            };
        }

        return defaultPermissions;

    }, [currentUser, projectId, projects, hasGlobalPermission]);

    return permissions;
};
