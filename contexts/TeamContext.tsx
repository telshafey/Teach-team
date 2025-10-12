import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { TeamMember, Role, PlanStatus, TeamMemberFormData } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

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
  const { supabaseClient, siteSettings } = useSupabase();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabaseClient || !currentUser) {
        setTeamMembers([]);
        setRoles([]);
        setIsLoading(false);
        return;
    }
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
  }, [supabaseClient, addToast, currentUser]);

  useEffect(() => {
    if (supabaseClient && currentUser) {
      fetchData();

      const handleMembersChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = api.snakeToCamel(newRecord);
        switch (eventType) {
          case 'INSERT': setTeamMembers(prev => [...prev, record]); break;
          case 'UPDATE': setTeamMembers(prev => prev.map(m => m.id === record.id ? record : m)); break;
          case 'DELETE': setTeamMembers(prev => prev.filter(m => m.id !== oldRecord.id)); break;
        }
      };

      const handleRolesChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = api.snakeToCamel(newRecord);
        switch (eventType) {
          case 'INSERT': setRoles(prev => [...prev, record]); break;
          case 'UPDATE': setRoles(prev => prev.map(r => r.id === record.id ? record : r)); break;
          case 'DELETE': setRoles(prev => prev.filter(r => r.id !== oldRecord.id)); break;
        }
      };

      const membersChannel = supabaseClient.channel('public:team_members').on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, handleMembersChange).subscribe();
      const rolesChannel = supabaseClient.channel('public:roles').on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, handleRolesChange).subscribe();
      
      return () => {
        supabaseClient.removeChannel(membersChannel);
        supabaseClient.removeChannel(rolesChannel);
      };
    } else {
        setTeamMembers([]);
        setRoles([]);
    }
  }, [supabaseClient, currentUser, fetchData]);

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
    if (!supabaseClient || !memberData.email || !memberData.password || !siteSettings?.databaseSettings) {
        const message = 'بيانات الإضافة غير مكتملة أو إعدادات قاعدة البيانات غير متاحة.';
        addToast(message, 'error');
        throw new Error(message);
    }

    try {
        const { supabaseUrl, supabaseAnonKey } = siteSettings.databaseSettings;
        // Create a temporary client that doesn't persist sessions to avoid overwriting the admin's session
        const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            }
        });

        const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
            email: memberData.email,
            password: memberData.password,
        });

        if (authError) throw authError;

        if (authData.user) {
            try {
                // Use the main client (which is still authenticated as the admin) to insert the profile
                const newMember = {
                    authUserId: authData.user.id,
                    name: memberData.name!,
                    email: memberData.email,
                    roleId: memberData.roleId!,
                    avatarUrl: memberData.avatarUrl,
                    reportsTo: memberData.reportsTo,
                    salary: memberData.salary,
                    hourlyRate: memberData.hourlyRate,
                    weeklyHoursRequirement: memberData.weeklyHoursRequirement,
                    daysOff: memberData.daysOff,
                    // FIX: Explicitly cast status to PlanStatus to avoid type widening to string.
                    weeklyPlan: { status: 'approved' as PlanStatus, hours: {} },
                };
                const createdMember = await api.insert<TeamMember>(supabaseClient, 'team_members', newMember);
                setTeamMembers(prev => [...prev, createdMember]);
                addToast('تمت إضافة العضو الجديد بنجاح.', 'success');
            } catch (profileError: any) {
                console.error("Failed to create team member profile after sign up:", profileError);
                addToast('فشل إنشاء ملف الفريق. تحقق من أن سياسات أمان قاعدة البيانات (RLS) تسمح للمدراء بإضافة أعضاء.', 'error');
                throw new Error('Profile creation failed after auth user was created.');
            }
        } else {
             throw new Error("Sign up completed but no user data was returned.");
        }
    } catch (error: any) {
        let errorMessage = error.message;
        if (error.message.includes('User already registered')) {
            errorMessage = 'هذا البريد الإلكتروني مسجل بالفعل في نظام المصادقة. قد تحتاج لحذفه يدوياً من لوحة تحكم Supabase.';
        }
        
        const finalMessage = `فشل إضافة العضو: ${errorMessage}`;
        addToast(finalMessage, 'error');
        console.error(finalMessage, error);
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
      addToast(`فشل تحديث الدور: ${error.message}`, 'error');
      throw error;
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
