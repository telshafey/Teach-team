import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { TeamMember, Role, PlanStatus, TeamMemberFormData } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { createNotification } from '../services/notificationService';

export interface TeamContextType {
  teamMembers: TeamMember[];
  roles: Role[];
  isLoading: boolean;
  handleUpdatePlanStatus: (memberId: number, status: PlanStatus) => Promise<void>;
  handleAddMember: (memberData: TeamMemberFormData) => Promise<void>;
  handleUpdateMember: (memberId: number, memberData: TeamMemberFormData) => Promise<void>;
  handleAddRole: (roleData: { name: string }) => Promise<void>;
  handleUpdateRole: (role: Role) => Promise<void>;
  handleDeleteRole: (roleId: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabaseClient) return;
    setIsLoading(true);
    try {
      const [membersData, rolesData] = await Promise.all([
        api.fetchAll<TeamMember>(supabaseClient, 'team_members'),
        api.fetchAll<Role>(supabaseClient, 'roles'),
      ]);
      setTeamMembers(membersData);
      setRoles(rolesData);
    } catch (error: any) {
      console.error('Error fetching team data:', error);
      addToast('فشل تحميل بيانات الفريق.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, addToast]);

  useEffect(() => {
    if (supabaseClient) {
      fetchData();
      const membersChannel = supabaseClient.channel('public:team_members').on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => fetchData()).subscribe();
      const rolesChannel = supabaseClient.channel('public:roles').on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => fetchData()).subscribe();
      return () => {
        supabaseClient.removeChannel(membersChannel);
        supabaseClient.removeChannel(rolesChannel);
      };
    }
  }, [supabaseClient, fetchData]);

  const handleUpdatePlanStatus = async (memberId: number, status: PlanStatus) => {
    if (!supabaseClient || !currentUser) return;
    try {
      const member = teamMembers.find(m => m.id === memberId);
      if (member) {
        const updatedPlan = { ...member.weeklyPlan, status };
        await api.update<TeamMember>(supabaseClient, 'team_members', memberId, { weeklyPlan: updatedPlan });
        addToast('تم تحديث حالة الخطة.', 'success');
      }
    } catch (error: any) {
      addToast(`فشل تحديث الحالة: ${error.message}`, 'error');
    }
  };

  const handleAddMember = async (memberData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: memberData.email!,
            password: memberData.password!,
        });
        if (error) throw error;
        if (data.user) {
            const newMember = {
                authUserId: data.user.id,
                name: memberData.name!,
                email: memberData.email!,
                roleId: memberData.roleId!,
                avatarUrl: memberData.avatarUrl,
                reportsTo: memberData.reportsTo,
                salary: memberData.salary,
                hourlyRate: memberData.hourlyRate,
                weeklyHoursRequirement: memberData.weeklyHoursRequirement,
                daysOff: memberData.daysOff,
                weeklyPlan: { status: 'approved', hours: {} },
            };
            await api.insert(supabaseClient, 'team_members', newMember);
            addToast('تمت إضافة العضو بنجاح.', 'success');
        }
    } catch (error: any) {
        addToast(`فشل إضافة العضو: ${error.message}`, 'error');
        throw error;
    }
  };

  const handleUpdateMember = async (memberId: number, memberData: TeamMemberFormData) => {
     if (!supabaseClient) return;
     try {
        await api.update<TeamMember>(supabaseClient, 'team_members', memberId, memberData);
        addToast('تم تحديث بيانات العضو بنجاح.', 'success');
     } catch (error: any) {
        addToast(`فشل تحديث البيانات: ${error.message}`, 'error');
        throw error;
     }
  };
  
  const handleAddRole = async (roleData: { name: string }) => {
    if (!supabaseClient) return;
    try {
        await api.insert(supabaseClient, 'roles', { ...roleData, permissions: [] });
        addToast('تمت إضافة الدور بنجاح.', 'success');
    } catch (error: any) {
        addToast(`فشل إضافة الدور: ${error.message}`, 'error'); throw error;
    }
  };
  
  const handleUpdateRole = async (role: Role) => {
    if (!supabaseClient) return;
    try {
        const { id, ...updates } = role;
        await api.update<Role>(supabaseClient, 'roles', id, updates);
        addToast('تم تحديث الدور بنجاح.', 'success');
    } catch (error: any) {
        addToast(`فشل تحديث الدور: ${error.message}`, 'error'); throw error;
    }
  };
  
  const handleDeleteRole = async (roleId: string) => {
    if (!supabaseClient) return;
    if (teamMembers.some(m => m.roleId === roleId)) {
        addToast('لا يمكن حذف الدور لأنه مسند إلى عضو واحد على الأقل.', 'error');
        return;
    }
    try {
        await api.deleteById(supabaseClient, 'roles', roleId);
        addToast('تم حذف الدور بنجاح.', 'success');
    } catch (error: any) {
        addToast(`فشل حذف الدور: ${error.message}`, 'error'); throw error;
    }
  };


  const value = { teamMembers, roles, isLoading, handleUpdatePlanStatus, handleAddMember, handleUpdateMember, handleAddRole, handleUpdateRole, handleDeleteRole, fetchData };

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