import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { TeamMember, Role, Permission, TeamMemberFormData, PlanStatus } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import * as api from '../services/apiService';
import { useToast } from './ToastContext';
import { slugify } from '../utils/slugify';

// Helper to get all direct and indirect report IDs recursively
const getReportIds = (managerId: number, allMembers: TeamMember[]): number[] => {
    const reportIds: number[] = [];
    const queue: number[] = [managerId];
    const visited = new Set<number>();

    while (queue.length > 0) {
        const currentManagerId = queue.shift()!;
        if (visited.has(currentManagerId)) continue;
        visited.add(currentManagerId);

        const directReports = allMembers.filter(m => m.reportsTo === currentManagerId);
        directReports.forEach(r => {
            if (!visited.has(r.id)) {
                reportIds.push(r.id);
                queue.push(r.id);
            }
        });
    }
    return Array.from(new Set(reportIds)); // Return unique IDs
};

type TeamMemberUpdateData = Partial<TeamMember & { password?: string }>;

export interface TeamContextType {
  teamMembers: TeamMember[];
  roles: Role[];
  visibleMemberIds: Set<number>;
  hasPermission: (permission: Permission) => boolean;
  handleUpdateMember: (memberId: number, data: TeamMemberUpdateData) => Promise<void>;
  handleAddMember: (formData: TeamMemberFormData) => Promise<void>;
  handleDeleteMember: (memberId: number) => Promise<void>;
  handleUpdatePlanStatus: (memberId: number, status: 'approved' | 'rejected' | 'needs-adjustment') => Promise<void>;
  handleAddRole: (roleData: { name: string }) => Promise<void>;
  handleUpdateRole: (roleId: string, updates: Partial<Role>) => Promise<void>;
  handleDeleteRole: (roleId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabaseClient || !currentUser) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedMembers, fetchedRoles] = await Promise.all([
          api.getAll<TeamMember>(supabaseClient, 'team_members'),
          api.getAll<Role>(supabaseClient, 'roles'),
        ]);
        setTeamMembers(fetchedMembers);
        setRoles(fetchedRoles);
      } catch (error: any) {
        addToast(`Failed to fetch team data: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [supabaseClient, currentUser, addToast]);

  const visibleMemberIds = useMemo(() => {
    if (!currentUser) return new Set<number>();
    
    if (currentUser.roleId === 'gm') {
      return new Set(teamMembers.map(m => m.id));
    }

    const ids = new Set([currentUser.id]);
    const reportIds = getReportIds(currentUser.id, teamMembers);
    reportIds.forEach(id => ids.add(id));
    
    return ids;
  }, [currentUser, teamMembers]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentUser) return false;
    if (currentUser.roleId === 'gm') return true; // General Manager has all permissions
    const userRole = roles.find(r => r.id === currentUser.roleId);
    return userRole?.permissions?.includes(permission) || false;
  }, [currentUser, roles]);
  
 const handleUpdateMember = useCallback(async (memberId: number, data: TeamMemberUpdateData) => {
    if (!supabaseClient) return;

    const { password, ...memberData } = data;
    const memberToUpdate = teamMembers.find(m => m.id === memberId);
    if (!memberToUpdate) {
        throw new Error("لم يتم العثور على العضو");
    }

    try {
        let passwordUpdated = false;
        if (password) {
            const { error: authError } = await supabaseClient.auth.admin.updateUserById(
                memberToUpdate.authUserId,
                { password: password }
            );
            if (authError) throw authError;
            passwordUpdated = true;
        }

        let otherDataUpdated = false;
        if (Object.keys(memberData).length > 0) {
            // Use the new RPC function to bypass PostgREST cache issues
            const updatedMember = await api.callRpcSingle<TeamMember>(
                supabaseClient,
                'team_members_update',
                { member_id: memberId, updates: memberData }
            );
            setTeamMembers(prev => prev.map(m => (m.id === memberId ? updatedMember : m)));
            otherDataUpdated = true;
        }
        
        if (otherDataUpdated || passwordUpdated) {
            addToast('تم تحديث بيانات العضو بنجاح.', 'success');
        }

    } catch (error: any) {
        console.error("Failed to update member:", error);
        const message = (error?.message && typeof error.message === 'string') ? error.message : JSON.stringify(error);
        addToast(`فشل تحديث بيانات العضو: ${message}`, 'error');
        throw error;
    }
}, [supabaseClient, addToast, teamMembers]);


  const handleUpdatePlanStatus = useCallback(async (memberId: number, status: 'approved' | 'rejected' | 'needs-adjustment') => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;
    const updatedPlan = { ...member.weeklyPlan, status };
    await handleUpdateMember(memberId, { weeklyPlan: updatedPlan });
  }, [teamMembers, handleUpdateMember]);
  
  const handleAddMember = useCallback(async (formData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    try {
        // Supabase Auth requires a password for user creation via admin API
        const { data: { user }, error: authError } = await supabaseClient.auth.admin.createUser({
            email: formData.email,
            password: formData.password,
            email_confirm: true, // Auto-confirm user
        });
        
        if (authError || !user) throw authError || new Error("User creation failed.");

        const newMemberData = {
            ...formData,
            authUserId: user.id,
            weeklyPlan: { status: 'approved' as PlanStatus, hours: {} },
        };
        delete newMemberData.password;
        const newMember = await api.insert<TeamMember>(supabaseClient, 'team_members', newMemberData);
        setTeamMembers(prev => [...prev, newMember]);
        addToast("تمت إضافة العضو بنجاح", "success");
    } catch (error: any) {
        console.error("Failed to add member:", error);
        const message = (error?.message && typeof error.message === 'string') ? error.message : JSON.stringify(error);
        addToast(`فشل إضافة العضو: ${message}`, 'error');
        throw error;
    }
  }, [supabaseClient, addToast]);

  const handleDeleteMember = useCallback(async (memberId: number) => {
    if (!supabaseClient) return;

    const memberToDelete = teamMembers.find(m => m.id === memberId);
    if (!memberToDelete) {
        addToast('لم يتم العثور على العضو للحذف.', 'error');
        return;
    }

    const subordinates = teamMembers.filter(m => m.reportsTo === memberId);
    if (subordinates.length > 0) {
        addToast('لا يمكن حذف هذا العضو لأنه مدير لأعضاء آخرين. يرجى إعادة تعيينهم أولاً.', 'error');
        return;
    }

    try {
        const { error: authError } = await supabaseClient.auth.admin.deleteUser(memberToDelete.authUserId);
        if (authError) {
            throw authError;
        }

        await api.deleteById(supabaseClient, 'team_members', memberId);
        
        setTeamMembers(prev => prev.filter(m => m.id !== memberId));
        addToast("تم حذف العضو بنجاح", "success");
    } catch (error: any) {
        console.error("Failed to delete member:", error);
        const message = (error?.message && typeof error.message === 'string') ? error.message : JSON.stringify(error);
        addToast(`فشل حذف العضو: ${message}`, 'error');
        throw error;
    }
  }, [supabaseClient, addToast, teamMembers]);

  const handleAddRole = useCallback(async (roleData: { name: string }) => {
    if (!supabaseClient) return;
    const newRoleId = slugify(roleData.name);
    
    if (roles.some(r => r.id === newRoleId)) {
        const error = new Error('A role with this name already exists.');
        addToast('فشل إضافة الدور: اسم الدور موجود بالفعل.', 'error');
        throw error;
    }

    try {
      const newRole = await api.insert<Role>(supabaseClient, 'roles', { name: roleData.name, id: newRoleId, permissions: [] });
      setRoles(prev => [...prev, newRole]);
      addToast('تم إضافة الدور بنجاح.', 'success');
    } catch (error: any) {
        console.error("Failed to add role:", error);
        if (error.message?.includes('duplicate key')) {
           addToast('فشل إضافة الدور: اسم الدور موجود بالفعل.', 'error');
        } else {
           addToast(`فشل إضافة الدور: ${error.message}`, 'error');
        }
        throw error;
    }
  }, [supabaseClient, addToast, roles]);
  
  const handleUpdateRole = useCallback(async (roleId: string, updates: Partial<Role>) => {
    if (!supabaseClient) return;
    try {
      const updatedRole = await api.update<Role>(supabaseClient, 'roles', roleId, updates);
      setRoles(prev => prev.map(r => r.id === roleId ? updatedRole : r));
      addToast('تم تحديث الدور بنجاح.', 'success');
    } catch (error: any) {
      console.error("Failed to update role:", error);
      addToast(`فشل تحديث الدور: ${error.message}`, 'error');
      throw error;
    }
  }, [supabaseClient, addToast]);
  
  const handleDeleteRole = useCallback(async (roleId: string) => {
    if (!supabaseClient) return;

    const isRoleInUse = teamMembers.some(member => member.roleId === roleId);
    if (isRoleInUse) {
      addToast('لا يمكن حذف هذا الدور لأنه مُسند حالياً لبعض أعضاء الفريق.', 'error');
      return;
    }

    try {
      await api.deleteById(supabaseClient, 'roles', roleId);
      setRoles(prev => prev.filter(r => r.id !== roleId));
      addToast('تم حذف الدور بنجاح.', 'success');
    } catch (error: any) {
      addToast(`فشل حذف الدور: ${error.message}`, 'error');
      console.error("Failed to delete role:", error);
    }
  }, [supabaseClient, teamMembers, addToast]);

  const value = { teamMembers, roles, hasPermission, visibleMemberIds, handleUpdateMember, handleAddMember, handleDeleteMember, handleUpdatePlanStatus, handleAddRole, handleUpdateRole, handleDeleteRole };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeamContext = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeamContext must be used within a TeamProvider');
  }
  return context;
};