import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { TeamMember, Role, TeamMemberFormData } from "@shared/types";
import { Card } from "../ui/Card";
import { TeamOrgChart } from "./TeamOrgChart";
import { TeamMemberDetailPage } from "./TeamMemberDetailPage";
import { TeamMemberForm } from "./TeamMemberForm";
import { PlusIcon, UserIcon, UsersIcon } from "../ui/Icons";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "@shared/contexts/ToastContext";

interface TeamManagementPageProps {
  initialMemberId?: number;
}

export const TeamManagementPage: React.FC<TeamManagementPageProps> = ({
  initialMemberId,
}) => {
  const {
    teamMembers: allTeamMembers,
    roles,
    handleAddMember,
    handleUpdateMember,
    handleDeleteMember,
    hasPermission,
    visibleMemberIds,
  } = useTeamContext();
  const { addToast } = useToast();

  const visibleTeamMembers = useMemo(() => {
    return allTeamMembers.filter((m) => visibleMemberIds.has(m.id));
  }, [allTeamMembers, visibleMemberIds]);

  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(
    initialMemberId || null,
  );
  const [viewMode, setViewMode] = useState<"list" | "form" | "orgchart">(
    "list",
  );
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canManageTeam = hasPermission("manage_team");
  const canEditMembers = hasPermission("edit_team_members");

  const selectedMember = useMemo(() => {
    return allTeamMembers.find((m) => m.id === selectedMemberId);
  }, [allTeamMembers, selectedMemberId]);

  const selectedMemberRole = useMemo(() => {
    if (!selectedMember) return undefined;
    return roles.find((r) => r.id === selectedMember.roleId);
  }, [roles, selectedMember]);

  const selectedMemberManager = useMemo(() => {
    if (!selectedMember || !selectedMember.reportsTo) return undefined;
    return allTeamMembers.find((m) => m.id === selectedMember.reportsTo);
  }, [allTeamMembers, selectedMember]);

  const handleSaveMember = useCallback(
    async (formData: TeamMemberFormData, memberToUpdate: TeamMember | null) => {
      if (memberToUpdate) {
        await handleUpdateMember(memberToUpdate.id, formData);
      } else {
        await handleAddMember(formData);
      }
      setViewMode("list");
    },
    [handleAddMember, handleUpdateMember],
  );

  const handleOpenEditModal = useCallback((member: TeamMember) => {
    setEditingMember(member);
    setViewMode("form");
  }, []);

  const handleDeleteMemberClick = useCallback(
    async (memberId: number) => {
      await handleDeleteMember(memberId);
      if (selectedMemberId === memberId) {
        setSelectedMemberId(null);
      }
    },
    [handleDeleteMember, selectedMemberId],
  );

  const openAddModal = useCallback(() => {
    setEditingMember(null);
    setViewMode("form");
  }, []);

  const handleMoveMember = useCallback(
    async (memberId: number, newManagerId: number | null) => {
      await handleUpdateMember(memberId, { reportsTo: newManagerId });
      addToast("تم تحديث الهيكل التنظيمي بنجاح.", "success");
    },
    [handleUpdateMember, addToast],
  );

  const filteredMembers = useMemo(() => {
    return visibleTeamMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [visibleTeamMembers, searchQuery]);

  if (viewMode === "form") {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <TeamMemberForm
          member={editingMember}
          onSave={handleSaveMember}
          onCancel={() => setViewMode("list")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-[max(calc(100vh-80px),800px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            الفريق
          </h2>
          <p className="text-md text-slate-500 dark:text-slate-400 mt-1">
            إدارة أعضاء الفريق، الأدوار، والهيكل التنظيمي للمؤسسة
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center shadow-sm border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("list")}
              className={`py-1.5 px-4 text-sm font-medium rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                <span>الأعضاء</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode("orgchart")}
              className={`py-1.5 px-4 text-sm font-medium rounded-md transition-all ${
                viewMode === "orgchart"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                <span>الهيكل</span>
              </div>
            </button>
          </div>
          {canManageTeam && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 dark:bg-sky-600 rounded-lg hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              <span>إضافة عضو</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === "orgchart" ? (
        <div className="flex-1 min-h-0 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden animate-in fade-in duration-500">
          <TeamOrgChart
            members={visibleTeamMembers}
            onMemberClick={(id) => {
              setSelectedMemberId(id);
              setViewMode("list");
            }}
            selectedMemberId={selectedMemberId}
            onMoveMember={handleMoveMember}
            canManage={canManageTeam}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
          {/* Sidebar Directory */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
              <input
                type="text"
                placeholder="بحث عن عضو..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 transition-shadow transition-colors"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {filteredMembers.length > 0 ? (
                <div className="space-y-1">
                  {filteredMembers.map((m) => {
                    const isSelected = selectedMemberId === m.id;
                    const r = roles.find((role) => role.id === m.roleId);
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMemberId(m.id)}
                        className={`w-full text-right p-3 rounded-lg transition-all flex items-center gap-3 ${
                          isSelected
                            ? "bg-slate-900 dark:bg-sky-900/40 text-white dark:text-sky-50"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <img
                          src={m.avatarUrl}
                          alt={m.name}
                          className={`w-10 h-10 rounded-full shrink-0 border-2 object-cover ${
                            isSelected
                              ? "border-slate-700 dark:border-sky-500/50"
                              : "border-white dark:border-slate-800"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {m.name}
                          </div>
                          <div
                            className={`text-xs truncate ${isSelected ? "text-slate-400 dark:text-sky-200/70" : "text-slate-500 dark:text-slate-400"}`}
                          >
                            {r?.name || "بدون دور"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 mx-2 mt-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    لم يتم العثور على نتائج
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-y-auto animate-in fade-in slide-in-from-left-4 duration-500">
            {selectedMember ? (
              <TeamMemberDetailPage
                member={selectedMember}
                role={selectedMemberRole}
                manager={selectedMemberManager}
                onEdit={handleOpenEditModal}
                onDelete={canManageTeam ? handleDeleteMemberClick : undefined}
                canEdit={canManageTeam || canEditMembers}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <EmptyState
                  icon={
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 mx-auto">
                      <UsersIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                    </div>
                  }
                  title="اختر عضو فريق"
                  message="اختر عضوًا من القائمة الجانبية لعرض المهام، النشاطات، وسجل الأداء."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
