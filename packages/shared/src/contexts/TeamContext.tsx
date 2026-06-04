import React, { createContext, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TeamMember, Role, Permission, TeamMemberFormData } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { useRealtime } from './RealtimeContext';
import { createClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface TeamContextType {
  teamMembers: TeamMember[];
  roles: Role[];
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  visibleMemberIds: Set<number>;
  handleAddMember: (formData: TeamMemberFormData) => Promise<void>;
  handleUpdateMember: (memberId: number, updates: Partial<TeamMemberFormData>) => Promise<void>;
  handleDeleteMember: (memberId: number) => Promise<void>;
  handleAddRole: (roleData: { name: string }) => Promise<void>;
  handleUpdateRole: (roleId: string, updates: Partial<Role>) => Promise<void>;
  handleDeleteRole: (roleId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { subscribe } = useRealtime();
  const queryClient = useQueryClient();

  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery<TeamMember[]>({
    queryKey: ['team_members'],
    queryFn: () => api.getAll(supabaseClient!, 'team_members'),
    enabled: !!supabaseClient && !!currentUser,
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => api.getAll(supabaseClient!, 'roles'),
    enabled: !!supabaseClient && !!currentUser,
  });
  
  const isLoading = isLoadingMembers || isLoadingRoles;

  useEffect(() => {
    const handleTableChange = <T extends {id: string | number}>(queryKey: string) => (payload: RealtimePostgresChangesPayload<T>) => {
        queryClient.setQueryData([queryKey], (oldData: T[] | undefined) => {
            if (oldData === undefined) return [];
            
            const newItem = api.keysToCamel(payload.new) as T;

            if (payload.eventType === 'INSERT') {
                if (oldData.some(item => item.id === newItem.id)) return oldData;
                return [newItem, ...oldData];
            }
            if (payload.eventType === 'UPDATE') {
                return oldData.map(item => item.id === newItem.id ? newItem : item);
            }
            if (payload.eventType === 'DELETE') {
                const oldId = (payload.old as { id: string | number }).id;
                return oldData.filter(item => item.id !== oldId);
            }
            return oldData;
        });
    };

    const unsubMembers = subscribe('team_members', handleTableChange<TeamMember>('team_members'));
    const unsubRoles = subscribe('roles', handleTableChange<Role>('roles'));
    return () => {
        unsubMembers();
        unsubRoles();
    };
  }, [subscribe, queryClient]);

  const currentUserRole = useMemo(() => {
    if (!currentUser || !roles.length) return null;
    return roles.find(r => r.id === currentUser.roleId);
  }, [currentUser, roles]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentUserRole) return false;
    if (currentUserRole.name.includes('(GM)')) return true;
    if (currentUserRole.name.includes('(Manager)') && permission === 'manage_team') return true; // Allow Managers to manage the team as well
    return currentUserRole.permissions.includes(permission);
  }, [currentUserRole]);

  const getReportIdsRecursive = useCallback((managerId: number, allMembers: TeamMember[]): Set<number> => {
    const reportIds = new Set<number>();
    const directReports = allMembers.filter(m => m.reportsTo === managerId);
    for (const report of directReports) {
      reportIds.add(report.id);
      const subReportIds = getReportIdsRecursive(report.id, allMembers);
      subReportIds.forEach(id => reportIds.add(id));
    }
    return reportIds;
  }, []);

  const visibleMemberIds = useMemo((): Set<number> => {
    if (!currentUser || !roles) return new Set();
    const role = roles.find(r => r.id === currentUser.roleId);
    
    // GM sees everyone
    if (role?.name.includes('(GM)')) {
      return new Set(teamMembers.map(m => m.id));
    }
    
    // People with manage_team can see everyone
    if (role?.permissions.includes('manage_team')) {
      return new Set(teamMembers.map(m => m.id));
    }

    // Manager sees everyone for now based on user feedback
    if (role?.name.includes('(Manager)')) {
      return new Set(teamMembers.map(m => m.id));
    }
    return new Set([currentUser.id]);
  }, [currentUser, teamMembers, getReportIdsRecursive, roles]);

  const handleAddMember = useCallback(async (formData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    try {
      const { email, password, ...restOfData } = formData;
      if (!password) {
        throw new Error("Password is required for new members.");
      }
      
      const memberData = { ...restOfData, email };
      // Insert into team_members first
      await api.insert<TeamMember>(supabaseClient, 'team_members', memberData as unknown as Omit<TeamMember, 'id' | 'weeklyPlan' | 'daysOff'>);
      
      // Secondary client to avoid mutating the current authenticated session
      const secondaryClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );
      
      const { error: signUpError } = await secondaryClient.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        console.warn('Signup error inside handleAddMember, user may already exist or rate limited', signUpError);
        // We don't throw here to avoid failing since the team_member record was created
      }

      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      addToast('Team member added successfully.', 'success');
    } catch (error: any) {
      addToast(`Failed to add team member: ${error.message}`, 'error');
      console.error(error);
      throw error;
    }
  }, [supabaseClient, addToast, queryClient]);

  const handleUpdateMember = useCallback(async (memberId: number, updates: Partial<TeamMemberFormData>) => {
    if (!supabaseClient) return;
    try {
        const member = teamMembers.find(m => m.id === memberId);
        if (!member) throw new Error("Member not found");
        await api.updateTeamMemberWithPassword(supabaseClient, member, updates);
        queryClient.invalidateQueries({ queryKey: ['team_members'] });
        addToast('Team member updated successfully.', 'success');
    } catch (error: any) {
        addToast(`Failed to update team member: ${error.message}`, 'error');
        console.error(error);
        throw error;
    }
  }, [supabaseClient, addToast, teamMembers, queryClient]);
  
  const handleDeleteMember = useCallback(async (memberId: number) => {
    if (!supabaseClient) return;
    try {
      const member = teamMembers.find(m => m.id === memberId);
      if (!member) throw new Error("Member not found");
      await api.deleteById(supabaseClient, 'team_members', memberId);
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      addToast('Team member deleted successfully.', 'success');
    } catch (error: any) {
      addToast(`Failed to delete team member: ${error.message}`, 'error');
      console.error(error);
      throw error;
    }
  }, [supabaseClient, addToast, teamMembers, queryClient]);

  const handleAddRole = useCallback(async (roleData: { name: string }) => {
    if (!supabaseClient) return;
    try {
      await api.insert<Role>(supabaseClient, 'roles', { ...roleData, permissions: [] });
      addToast('Role added successfully.', 'success');
    } catch (error: any) {
      addToast(`Failed to add role: ${error.message}`, 'error');
      throw error;
    }
  }, [supabaseClient, addToast]);

  const handleUpdateRole = useCallback(async (roleId: string, updates: Partial<Role>) => {
    if (!supabaseClient) return;
    try {
      await api.update<Role>(supabaseClient, 'roles', roleId, updates);
      addToast('Role updated successfully.', 'success');
    } catch (error: any) {
      addToast(`Failed to update role: ${error.message}`, 'error');
      throw error;
    }
  }, [supabaseClient, addToast]);
  
  const handleDeleteRole = useCallback(async (roleId: string) => {
    if (!supabaseClient) return;
    try {
      const membersWithRole = teamMembers.filter(m => m.roleId === roleId);
      if (membersWithRole.length > 0) {
        throw new Error("Cannot delete role as it is assigned to one or more team members.");
      }
      await api.deleteById(supabaseClient, 'roles', roleId);
      addToast('Role deleted successfully.', 'success');
    } catch (error: any) {
      addToast(`Failed to delete role: ${error.message}`, 'error');
      throw error;
    }
  }, [supabaseClient, addToast, teamMembers]);

  const value = {
    teamMembers,
    roles,
    isLoading,
    hasPermission,
    visibleMemberIds,
    handleAddMember,
    handleUpdateMember,
    handleDeleteMember,
    handleAddRole,
    handleUpdateRole,
    handleDeleteRole
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeamContext = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeamContext must be used within a TeamProvider');
  }
  return context;
};
