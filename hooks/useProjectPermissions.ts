import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProjectContext } from '../contexts/ProjectContext';
import { useTeamContext } from '../contexts/TeamContext';

export const useProjectPermissions = (projectId?: string) => {
    const { currentUser } = useAuth();
    const { hasPermission: hasGlobalPermission } = useTeamContext();
    const { projects } = useProjectContext();

    const permissions = useMemo(() => {
        const canGloballyManageProjects = hasGlobalPermission('manage_projects');
        
        // Default permissions based on global roles (excluding project-specific ones for now)
        const defaultPermissions = {
            canEditProjectSettings: canGloballyManageProjects || hasGlobalPermission('edit_projects'),
            canManageTasks: canGloballyManageProjects || hasGlobalPermission('create_tasks') || hasGlobalPermission('edit_tasks') || hasGlobalPermission('delete_tasks'),
            canManageMembers: canGloballyManageProjects,
        };

        if (!currentUser || !projectId) {
            return defaultPermissions;
        }

        // If user is already a full project admin globally, no need to check further.
        if (canGloballyManageProjects) {
            return { canEditProjectSettings: true, canManageTasks: true, canManageMembers: true };
        }

        const project = projects.find(p => p.id === projectId);
        if (!project?.members) {
            // No project or no members array, return permissions based on global roles.
            return defaultPermissions;
        }

        const projectMemberInfo = project.members.find(m => m.teamMemberId === currentUser.id);

        if (!projectMemberInfo) {
            // Not a member of the project, return permissions based on global roles.
            return defaultPermissions;
        }

        // Project-specific role permissions (these are additive to global permissions)
        if (projectMemberInfo.projectRole === 'Manager') {
            return {
                canEditProjectSettings: true, // Overrides global
                canManageTasks: true,       // Overrides global
                canManageMembers: true,     // Overrides global
            };
        }
        
        if (projectMemberInfo.projectRole === 'Member') {
             return {
                ...defaultPermissions, // Start with global permissions
                canManageTasks: true, // And grant specific member permissions
            };
        }

        return defaultPermissions;

    }, [currentUser, projectId, projects, hasGlobalPermission]);

    return permissions;
};