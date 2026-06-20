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

export const TeamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { subscribe } = useRealtime();
  const queryClient = useQueryClient();

  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery<
    TeamMember[]
  >({
    queryKey: ["team_members"],
    queryFn: () => api.getAll(supabaseClient!, "team_members"),
    enabled: !!supabaseClient && !!currentUser,
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => api.getAll(supabaseClient!, "roles"),
    enabled: !!supabaseClient && !!currentUser,
  });

  const isLoading = isLoadingMembers || isLoadingRoles;

  useEffect(() => {
    const handleTableChange =
      <T extends { id: string | number }>(queryKey: string) =>
      (payload: RealtimePostgresChangesPayload<T>) => {
        queryClient.setQueryData([queryKey], (oldData: T[] | undefined) => {
          if (oldData === undefined) return [];

          const newItem = api.keysToCamel(payload.new) as T;

          if (payload.eventType === "INSERT") {
            if (oldData.some((item) => item.id === newItem.id)) return oldData;
            return [newItem, ...oldData];
          }
          if (payload.eventType === "UPDATE") {
            return oldData.map((item) =>
              item.id === newItem.id ? newItem : item,
            );
          }
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string | number }).id;
            return oldData.filter((item) => item.id !== oldId);
          }
          return oldData;
        });
      };

    const unsubMembers = subscribe(
      "team_members",
      handleTableChange<TeamMember>("team_members"),
    );
    const unsubRoles = subscribe("roles", handleTableChange<Role>("roles"));
    return () => {
      unsubMembers();
      unsubRoles();
    };
  }, [subscribe, queryClient]);

  const currentUserRole = useMemo(() => {
    if (!currentUser || !roles.length) return null;
    return roles.find((r) => r.id === currentUser.roleId);
  }, [currentUser, roles]);

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      // If the user is assigned the 'gm' roleId directly, grant all permissions
      if (
        currentUser?.roleId === "gm" ||
        currentUser?.roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
      )
        return true;
      if (!currentUserRole) return false;
      if (currentUserRole.name?.includes("(GM)")) return true;
      return currentUserRole.permissions?.includes(permission) || false;
    },
    [currentUserRole, currentUser],
  );

  const getReportIdsRecursive = useCallback(
    (
      managerId: number,
      allMembers: TeamMember[],
      visited = new Set<number>(),
    ): Set<number> => {
      const reportIds = new Set<number>();
      if (visited.has(managerId)) return reportIds;
      visited.add(managerId);

      const directReports = allMembers.filter((m) => m.reportsTo === managerId);
      for (const report of directReports) {
        if (!visited.has(report.id)) {
          reportIds.add(report.id);
          const subReportIds = getReportIdsRecursive(
            report.id,
            allMembers,
            visited,
          );
          subReportIds.forEach((id) => reportIds.add(id));
        }
      }
      return reportIds;
    },
    [],
  );

  const visibleMemberIds = useMemo((): Set<number> => {
    if (!currentUser) return new Set();

    // If they have full access, they can see all
    if (hasPermission("manage_team") || currentUserRole?.name?.includes("(GM)") || currentUserRole?.name?.includes("(Manager)")) {
       return new Set(teamMembers.map((m) => m.id));
    }

    const reportIds = getReportIdsRecursive(currentUser.id, teamMembers);
    reportIds.add(currentUser.id);
    return reportIds;
  }, [currentUser, teamMembers, getReportIdsRecursive, hasPermission, currentUserRole]);

  const handleAddMember = useCallback(
    async (formData: TeamMemberFormData) => {
      if (!supabaseClient) return;
      try {
        const { email, password, ...restOfData } = formData;
        if (!password) {
          throw new Error("كلمة المرور مطلوبة للموظفين الجدد.");
        }

        const memberData = { ...restOfData, email, password };

        await api.createTeamMemberAdmin(supabaseClient, memberData);

        queryClient.invalidateQueries({ queryKey: ["team_members"] });
        addToast("تمت إضافة الموظف بنجاح.", "success");
      } catch (error: any) {
        addToast(`${error.message}`, "error");
        console.error(error);
        throw error;
      }
    },
    [supabaseClient, addToast, queryClient],
  );

  const handleUpdateMember = useCallback(
    async (memberId: number, updates: Partial<TeamMemberFormData>) => {
      if (!supabaseClient) return;
      try {
        const member = teamMembers.find((m) => m.id === memberId);
        if (!member) throw new Error("Member not found");
        await api.updateTeamMemberWithPassword(supabaseClient, member, updates);
        queryClient.invalidateQueries({ queryKey: ["team_members"] });
        addToast("تم تحديث بيانات الموظف بنجاح.", "success");
      } catch (error: any) {
        addToast(`${error.message}`, "error");
        console.error(error);
        throw error;
      }
    },
    [supabaseClient, addToast, teamMembers, queryClient],
  );

  const handleDeleteMember = useCallback(
    async (memberId: number) => {
      if (!supabaseClient) return;
      try {
        const member = teamMembers.find((m) => m.id === memberId);
        if (!member) throw new Error("Member not found");
        await api.deleteById(supabaseClient, "team_members", memberId);
        queryClient.invalidateQueries({ queryKey: ["team_members"] });
        addToast("تم حذف الموظف بنجاح.", "success");
      } catch (error: any) {
        addToast(`فشل الحذف: ${error.message}`, "error");
        console.error(error);
        throw error;
      }
    },
    [supabaseClient, addToast, teamMembers, queryClient],
  );

  const handleAddRole = useCallback(
    async (roleData: { name: string }) => {
      if (!supabaseClient) return;
      try {
        await api.insert<Role>(supabaseClient, "roles", {
          ...roleData,
          permissions: [],
        });
        addToast("Role added successfully.", "success");
      } catch (error: any) {
        addToast(`Failed to add role: ${error.message}`, "error");
        throw error;
      }
    },
    [supabaseClient, addToast],
  );

  const handleUpdateRole = useCallback(
    async (roleId: string, updates: Partial<Role>) => {
      if (!supabaseClient) return;
      try {
        await api.updateRoleAdmin<Role>(supabaseClient, roleId, updates);
        addToast("Role updated successfully.", "success");
      } catch (error: any) {
        addToast(`Failed to update role: ${error.message}`, "error");
        throw error;
      }
    },
    [supabaseClient, addToast],
  );

  const handleDeleteRole = useCallback(
    async (roleId: string) => {
      if (!supabaseClient) return;
      try {
        const membersWithRole = teamMembers.filter((m) => m.roleId === roleId);
        if (membersWithRole.length > 0) {
          throw new Error(
            "Cannot delete role as it is assigned to one or more team members.",
          );
        }
        await api.deleteById(supabaseClient, "roles", roleId);
        addToast("Role deleted successfully.", "success");
      } catch (error: any) {
        addToast(`Failed to delete role: ${error.message}`, "error");
        throw error;
      }
    },
    [supabaseClient, addToast, teamMembers],
  );

  const value = {
    teamMembers,
    roles,
    isLoading,
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

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeamContext = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }
  return context;
};
