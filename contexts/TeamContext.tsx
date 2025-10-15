import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Role, TeamMember, TeamMemberFormData, PlanStatus } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { slugify } from '../utils/slugify';

export interface TeamContextType {
  teamMembers: TeamMember[];
  roles: Role[];
  isLoading: boolean;
  handleAddMember: (memberData: TeamMemberFormData) => Promise<void>;
  handleUpdateMember: (memberId: number, memberData: Partial<TeamMemberFormData>) => Promise<void>;
  handleAddRole: (roleData: { name: string }) => Promise<void>;
  handleUpdateRole: (role: Role) => Promise<void>;
  handleDeleteRole: (roleId: string) => Promise<void>;
  handleUpdatePlanStatus: (memberId: number, status: PlanStatus) => Promise<void>;
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
      
      const handleTeamMembersChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = api.snakeToCamel(newRecord);
        switch(eventType) {
          case 'INSERT': setTeamMembers(prev => prev.some(m => m.id === record.id) ? prev : [...prev, record]); break;
          case 'UPDATE': setTeamMembers(prev => prev.map(m => m.id === record.id ? record : m)); break;
          case 'DELETE': setTeamMembers(prev => prev.filter(m => m.id !== oldRecord.id)); break;
        }
      };

      const handleRolesChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = api.snakeToCamel(newRecord);
        switch(eventType) {
          case 'INSERT': setRoles(prev => prev.some(r => r.id === record.id) ? prev : [...prev, record]); break;
          case 'UPDATE': setRoles(prev => prev.map(r => r.id === record.id ? record : r)); break;
          case 'DELETE': setRoles(prev => prev.filter(r => r.id !== oldRecord.id)); break;
        }
      };
      
      const membersChannel = supabaseClient.channel('team_members_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, handleTeamMembersChange).subscribe();
      const rolesChannel = supabaseClient.channel('roles_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, handleRolesChange).subscribe();
      
      return () => {
        supabaseClient.removeChannel(membersChannel);
        supabaseClient.removeChannel(rolesChannel);
      };
    } else {
      setTeamMembers([]);
      setRoles([]);
    }
  }, [supabaseClient, currentUser, fetchData]);
  
  const handleAddMember = async (memberData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    try {
      const { password, ...profileData } = memberData;
      if (!password) throw new Error("Password is required for new members.");

      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: profileData.email!,
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User not created in auth.");
      
      const newMemberData = {
          ...profileData,
          authUserId: authData.user.id,
          weeklyPlan: { status: 'approved', hours: {} },
      };

      const createdMember = await api.insert<TeamMember>(supabaseClient, 'team_members', newMemberData as Omit<TeamMember, 'id'>);
      setTeamMembers(prev => [...prev, createdMember]);
      addToast('تمت إضافة العضو بنجاح.', 'success');
    } catch(e: any) {
      let message = `فشل إضافة العضو: ${e.message}`;
      if (e.message.includes('User already registered')) {
          message = 'فشل إضافة العضو: هذا البريد الإلكتروني مسجل بالفعل في نظام المصادقة. إذا كانت هذه محاولة فاشلة سابقة، يرجى حذف المستخدم من قسم "Authentication" في لوحة تحكم Supabase قبل المحاولة مرة أخرى.';
      } else if (e.message.includes('violates row-level security policy')) {
          message = 'فشل إنشاء ملف الفريق. تحقق من أن سياسات أمان قاعدة البيانات (RLS) تسمح للمدراء بإضافة أعضاء.';
      } else if (e.message.includes('duplicate key value violates unique constraint')) {
          message = 'فشل إضافة العضو: حدث خطأ في قاعدة البيانات أثناء إنشاء معرّف فريد. يرجى التأكد من تشغيل كود SQL Propvided.';
      }
      addToast(message, 'error');
      throw e;
    }
  };
  
  const handleUpdateMember = async (memberId: number, memberData: Partial<TeamMemberFormData>) => {
    if (!supabaseClient) return;
    try {
      const { password, ...updates } = memberData; // password is never updated here
      const updatedMember = await api.update<TeamMember>(supabaseClient, 'team_members', memberId, updates as any);
      setTeamMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
      addToast('تم تحديث بيانات العضو بنجاح.', 'success');
    } catch(e: any) {
      addToast(`فشل تحديث بيانات العضو: ${e.message}`, 'error'); throw e;
    }
  };

  const handleAddRole = async (roleData: { name: string }) => {
    if (!supabaseClient) return;
    try {
        const newRoleData = {
            ...roleData,
            id: `${slugify(roleData.name)}-${crypto.randomUUID().slice(0, 4)}`,
            permissions: []
        };
        const createdRole = await api.insert<Role>(supabaseClient, 'roles', newRoleData);
        setRoles(prev => [...prev, createdRole]);
        addToast('تمت إضافة الدور بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل إضافة الدور: ${e.message}`, 'error'); throw e;
    }
  };

  const handleUpdateRole = async (role: Role) => {
    if (!supabaseClient) return;
    try {
        const { id, ...updates } = role;
        const updatedRole = await api.update<Role>(supabaseClient, 'roles', id, updates);
        setRoles(prev => prev.map(r => r.id === id ? updatedRole : r));
        addToast('تم تحديث الدور بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل تحديث الدور: ${e.message}`, 'error'); throw e;
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!supabaseClient) return;
    try {
        const membersWithRole = teamMembers.filter(m => m.roleId === roleId);
        if (membersWithRole.length > 0) {
            throw new Error(`لا يمكن حذف هذا الدور لأنه مسند إلى ${membersWithRole.length} عضو.`);
        }
        await api.deleteById(supabaseClient, 'roles', roleId);
        setRoles(prev => prev.filter(r => r.id !== roleId));
        addToast('تم حذف الدور بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل حذف الدور: ${e.message}`, 'error'); throw e;
    }
  };
  
  const handleUpdatePlanStatus = async (memberId: number, status: PlanStatus) => {
    if (!supabaseClient) return;
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;
    
    try {
        const updatedPlan = { ...member.weeklyPlan, status };
        const updatedMember = await api.update<TeamMember>(supabaseClient, 'team_members', memberId, { weeklyPlan: updatedPlan } as any);
        setTeamMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
        addToast(`تم ${status === 'approved' ? 'اعتماد' : 'رفض'} الخطة بنجاح.`, 'success');
    } catch(e: any) {
        addToast(`فشل تحديث حالة الخطة: ${e.message}`, 'error'); throw e;
    }
  };

  const value = { teamMembers, roles, isLoading, handleAddMember, handleUpdateMember, handleAddRole, handleUpdateRole, handleDeleteRole, handleUpdatePlanStatus, fetchData };

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
