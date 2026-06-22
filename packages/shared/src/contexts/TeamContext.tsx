import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TeamMember, Role, Permission, TeamMemberFormData } from "../types";
import { useSupabase } from "./SupabaseContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import * as api from "../services/apiService";
import { useRealtime } from "./RealtimeContext";
import {
  createClient,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

export interface TeamContextType {
  teamMembers: TeamMember[];
  roles: Role[];
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  visibleMemberIds: Set<number>;
  currentUserRole?: Role | null;
  handleAddMember: (formData: TeamMemberFormData) => Promise<void>;
  handleUpdateMember: (
    memberId: number,
    updates: Partial<TeamMemberFormData>,
  ) => Promise<void>;
  handleDeleteMember: (memberId: number) => Promise<void>;
  handleAddRole: (roleData: { name: string }) => Promise<void>;
  handleUpdateRole: (roleId: string, updates: Partial<Role>) => Promise<void>;
  handleDeleteRole: (roleId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const useTeam = (): TeamContextType => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: teamMembers = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      if (!supabaseClient) return [];
      return api.getAll<TeamMember>(supabaseClient, "team_members");
    },
    enabled: !!supabaseClient,
  });

  const { data: roles = [], isLoading: isRolesLoading = false } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      if (!supabaseClient) return [];
      return api.getAll<Role>(supabaseClient, "roles");
    },
    enabled: !!supabaseClient,
  });

  const currentUserRole = useMemo(() => {
    if (!currentUser || !roles.length) return null;
    return roles.find((r) => r.id === currentUser.roleId) || null;
  }, [currentUser, roles]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentUser) return false;
    if (
      currentUser.roleId === "admin" ||
      currentUser.roleId === "gm" ||
      currentUser.roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    ) {
      return true;
    }
    return currentUserRole?.permissions?.includes(permission) || false;
  }, [currentUser, currentUserRole]);

  const visibleMemberIds = useMemo(() => {
    return new Set<number>(teamMembers.map((m) => m.id));
  }, [teamMembers]);

  const handleAddMember = async (formData: TeamMemberFormData) => {
    if (!supabaseClient) return;
    try {
      const snakeData = api.camelToSnakeCase(formData);
      await api.createTeamMemberAdmin(supabaseClient, snakeData);
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      addToast("تم إضافة عضو الفريق بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء إضافة عضو الفريق", "error");
      throw error;
    }
  };

  const handleUpdateMember = async (
    memberId: number,
    updates: Partial<TeamMemberFormData>
  ) => {
    if (!supabaseClient) return;
    try {
      const existingMember = teamMembers.find((m) => m.id === memberId);
      if (!existingMember) throw new Error("لم يتم العثور على عضو الفريق");
      
      const snakeData = api.camelToSnakeCase(updates);
      await api.updateTeamMemberWithPassword(supabaseClient, existingMember, snakeData);
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      addToast("تم تحديث بيانات عضو الفريق بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء تحديث بيانات عضو الفريق", "error");
      throw error;
    }
  };

  const handleDeleteMember = async (memberId: number) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, "team_members", memberId);
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      addToast("تم حذف عضو الفريق بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء حذف عضو الفريق", "error");
      throw error;
    }
  };

  const handleAddRole = async (roleData: { name: string }) => {
    if (!supabaseClient) return;
    try {
      const snakeData = api.camelToSnakeCase(roleData);
      await api.insert(supabaseClient, "roles", snakeData);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      addToast("تم إضافة الدور بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء إضافة الدور", "error");
      throw error;
    }
  };

  const handleUpdateRole = async (roleId: string, updates: Partial<Role>) => {
    if (!supabaseClient) return;
    try {
      const snakeData = api.camelToSnakeCase(updates);
      await api.updateRoleAdmin(supabaseClient, roleId, snakeData);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      addToast("تم تحديث الدور بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء تحديث الدور", "error");
      throw error;
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, "roles", roleId);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      addToast("تم حذف الدور بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء حذف الدور", "error");
      throw error;
    }
  };

  return {
    teamMembers,
    roles,
    isLoading: isMembersLoading || isRolesLoading,
    hasPermission,
    visibleMemberIds,
    currentUserRole,
    handleAddMember,
    handleUpdateMember,
    handleDeleteMember,
    handleAddRole,
    handleUpdateRole,
    handleDeleteRole,
  };
};

export const useTeamContext = useTeam;
