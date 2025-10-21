import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { TeamMember, Role, Permission, TeamMemberFormData, PlanStatus } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import * as api from '../services/apiService';
import { useToast } from './ToastContext';
import { slugify } from '../utils/slugify';
import { useRealtime } from './RealtimeContext';

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
  const { subscribe } = useRealtime();
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

  useEffect(() => {
    const handleMembersChange = (payload: any) => {
        if (payload.eventType === 'INSERT') {
            setTeamMembers(prev => [...prev.filter(m => m.id !== payload.new.id), payload.new]);
        } else if (payload.eventType === 'UPDATE') {
            setTeamMembers(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        } else if (payload.eventType === 'DELETE') {
            setTeamMembers(prev => prev.filter(m => m.id !== payload.old.id));
        }
    };

    const handleRolesChange = (payload: any) => {
        if (payload.eventType === 'INSERT') {
            setRoles(prev => [...prev.filter(r => r.id !== payload.new.id), payload.new]);
        } else if (payload.eventType === 'UPDATE') {
            setRoles(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        } else if (payload.eventType === 'DELETE') {
            setRoles(prev => prev.filter(r => r.id !== payload.old.id));
        }
    };

    const unsubMembers = subscribe('team_members', handleMembersChange);
    const unsubRoles = subscribe('roles', handleRolesChange);

    return () => {
        unsubMembers();
        unsubRoles();
    };
  }, [subscribe]);

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

    const memberToUpdate = teamMembers.find(m => m.id === memberId);
    if (!memberToUpdate) {
        const error = new Error("لم يتم العثور على العضو");
        addToast(error.message, 'error');
        throw error;
    }

    const dataToUpdate = { ...data };
    // Sanitize numeric fields to prevent sending NaN, which becomes 'null' string
    if (dataToUpdate.salary !== undefined && isNaN(Number(dataToUpdate.salary))) dataToUpdate.salary = undefined;
    if (dataToUpdate.hourlyRate !== undefined && isNaN(Number(dataToUpdate.hourlyRate))) dataToUpdate.hourlyRate = undefined;
    if (dataToUpdate.weeklyHoursRequirement !== undefined && isNaN(Number(dataToUpdate.weeklyHoursRequirement))) dataToUpdate.weeklyHoursRequirement = undefined;


    const originalMembers = [...teamMembers];

    // Optimistic UI update for non-password data
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...dataToUpdate } as TeamMember : m));
    
    try {
        await api.updateTeamMemberWithPassword(supabaseClient, memberToUpdate, dataToUpdate);
        if (Object.keys(dataToUpdate).length > 0) {
            addToast('تم تحديث بيانات العضو بنجاح.', 'success');
        }
    } catch (error: any) {
        setTeamMembers(originalMembers); // Revert on failure
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
        if (!formData.password) {
            throw new Error("Password is required for new members.");
        }

        const { password, ...metaData } = formData;

        // Sanitize numeric fields to prevent sending NaN, which becomes 'null' string
        if (metaData.salary !== undefined && isNaN(Number(metaData.salary))) metaData.salary = undefined;
        if (metaData.hourlyRate !== undefined && isNaN(Number(metaData.hourlyRate))) metaData.hourlyRate = undefined;
        if (metaData.weeklyHoursRequirement !== undefined && isNaN(Number(metaData.weeklyHoursRequirement))) metaData.weeklyHoursRequirement = undefined;
        
        if (metaData.daysOff && metaData.daysOff.length === 0) {
            delete (metaData as any).daysOff;
        }
        
        const { error: authError } = await supabaseClient.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: metaData
            }
        });
        
        if (authError) throw authError;

        addToast("تمت إضافة العضو بنجاح. يجب على العضو الجديد تأكيد بريده الإلكتروني.", "success");
    } catch (error: any) {
        console.error("Failed to add member:", error);
        let message = error?.message || JSON.stringify(error);
        if (message.includes('User already registered')) {
            message = 'هذا البريد الإلكتروني مسجل بالفعل.';
        }
        addToast(`فشل إضافة العضو: ${message}`, 'error');
        throw error; // Re-throw to indicate failure to the form
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
        // If user is not found in auth, we can still proceed to delete the profile
        if (authError && authError.message !== 'User not found') {
            throw authError;
        }
        
        await api.deleteById(supabaseClient, 'team_members', memberId);

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
    
    if (!newRoleId) {
        const error = new Error('Role name must contain valid characters (letters, numbers).');
        addToast('فشل إضافة الدور: يجب أن يحتوي اسم الدور على حروف أو أرقام صالحة.', 'error');
        throw error;
    }

    if (roles.some(r => r.id === newRoleId)) {
        const error = new Error('A role with this name already exists.');
        addToast('فشل إضافة الدور: اسم الدور موجود بالفعل.', 'error');
        throw error;
    }

    try {
      await api.insert<Role>(supabaseClient, 'roles', { name: roleData.name, id: newRoleId, permissions: [] });
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
      await api.update<Role>(supabaseClient, 'roles', roleId, updates);
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