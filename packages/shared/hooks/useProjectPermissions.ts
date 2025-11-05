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

    const { data: project } = useQuery<Project | null>({
        queryKey: ['project', projectId],
        queryFn: () => api.getById<Project>(supabaseClient!, 'projects', projectId!),
        enabled: !!supabaseClient && !!projectId,
    });

    const permissions = useMemo(() => {
        const canGloballyManageProjects = hasGlobalPermission('manage_projects');
        
        const defaultPermissions = {
            canEditProjectSettings: canGloballyManageProjects || hasGlobalPermission('edit_projects'),
            canManageTasks: canGloballyManageProjects || hasGlobalPermission('create_tasks') || hasGlobalPermission('edit_tasks') || hasGlobalPermission('delete_tasks'),
            canManageMembers: canGloballyManageProjects,
        };

        if (!currentUser || !project) {
            return defaultPermissions;
        }

        if (canGloballyManageProjects) {
            return { canEditProjectSettings: true, canManageTasks: true, canManageMembers: true };
        }

        const projectMemberInfo = project.members?.find(m => m.teamMemberId === currentUser.id);
        const isCreator = project.creatorId === currentUser.id;

        if (isCreator || projectMemberInfo?.projectRole === 'Manager') {
            return {
                canEditProjectSettings: true,
                canManageTasks: true,
                canManageMembers: true,
            };
        }
        
        if (projectMemberInfo?.projectRole === 'Member') {
             return {
                ...defaultPermissions,
                canEditProjectSettings: false,
                canManageMembers: false,
                canManageTasks: true, // As per original logic, members can manage tasks in their projects
             };
        }

        return defaultPermissions;

    }, [currentUser, project, hasGlobalPermission]);

    return permissions;
};