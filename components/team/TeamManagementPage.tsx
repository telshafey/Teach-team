import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import { TeamMember, Role, TeamMemberFormData } from "@shared/types";
import { Card } from "../ui/Card";
import { TeamOrgChart } from "./TeamOrgChart";
import { TeamMemberDetailPage } from "./TeamMemberDetailPage";
import { TeamMemberForm } from "./TeamMemberForm";
import { PlusIcon, UserIcon, UsersIcon } from "../ui/Icons";
import { EmptyState } from "../ui/EmptyState";
import { LoadingSpinner } from "../ui/LoadingSpinner";
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
  const { supabaseClient } = useSupabase();

  const visibleTeamMembers = useMemo(() => {
    return allTeamMembers.filter((m) => visibleMemberIds.has(m.id));
  }, [allTeamMembers, visibleMemberIds]);

  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(
    initialMemberId || null,
  );
  const [viewMode, setViewMode] = useState<"list" | "form" | "orgchart" | "invites">(
    "list",
  );
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Invitation-specific states
  const [invites, setInvites] = useState<any[]>([]);
  const [isInvitesLoading, setIsInvitesLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const canManageTeam = hasPermission("manage_team");
  const canEditMembers = hasPermission("edit_team_members");

  const fetchInvites = useCallback(async () => {
    if (!supabaseClient) return;
    setIsInvitesLoading(true);
    try {
      const session = (await supabaseClient.auth.getSession()).data.session;
      const response = await fetch("/api/admin/invites", {
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setInvites(data.invites);
      } else {
        console.error("Failed to load invites:", data.error);
      }
    } catch (err) {
      console.error("Failed to fetch invites:", err);
    } finally {
      setIsInvitesLoading(false);
    }
  }, [supabaseClient]);

  useEffect(() => {
    if (viewMode === "invites" && canManageTeam) {
      fetchInvites();
    }
  }, [viewMode, canManageTeam, fetchInvites]);

  const handleCreateInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRoleId) {
      addToast("يرجى إدخال البريد الإلكتروني واختيار المسمى الوظيفي المطلوب.", "error");
      return;
    }
    setIsCreatingInvite(true);
    try {
      const session = (await supabaseClient.auth.getSession()).data.session;
      const response = await fetch("/api/admin/invites/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ email: inviteEmail, roleId: inviteRoleId }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        addToast("تم إصدار دعوة الانضمام بنجاح! يمكنك الآن نسخ الرابط ومشاركته.", "success");
        setInviteEmail("");
        setInviteRoleId("");
        fetchInvites();
      } else {
        addToast(data.error || "فشل إصدار نظام الدعوة لعضو جديد.", "error");
      }
    } catch (err) {
      addToast("عذراً، حدث خطأ أثناء الاتصال بالخادم.", "error");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في إلغاء وثيقة هذه الدعوة؟ لن يتمكن المستلم من تفعيل حسابه بعد ذلك.")) {
      return;
    }
    try {
      const session = (await supabaseClient.auth.getSession()).data.session;
      const response = await fetch(`/api/admin/invites/${inviteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      if (response.ok) {
        addToast("تم سحب وإلغاء الدعوة بنجاح من النظام.", "success");
        fetchInvites();
      } else {
        addToast("فشلت عملية الإلغاء.", "error");
      }
    } catch (err) {
      addToast("تعذر إلغاء الدعوة بسبب خطأ اتصال.", "error");
    }
  };

  const handleCopyLink = (token: string, inviteId: string) => {
    const inviteLink = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedInviteId(inviteId);
      addToast("تم نسخ رابط تفعيل العضوية وتأكيد الدعوة بنجاح!", "success");
      setTimeout(() => setCopiedInviteId(null), 3500);
    }).catch(() => {
      addToast("عذراً، فشل نسخ الرابط تلقائياً.", "error");
    });
  };

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
            {canManageTeam && (
              <button
                onClick={() => setViewMode("invites")}
                className={`py-1.5 px-4 text-sm font-medium rounded-md transition-all ${
                  viewMode === "invites"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  <span>الدعوات</span>
                </div>
              </button>
            )}
          </div>
          {canManageTeam && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 dark:bg-sky-600 rounded-lg hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors shadow-sm animate-in fade-in"
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
      ) : viewMode === "invites" ? (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
          {/* Create Invite Form */}
          <div className="w-full lg:w-96 shrink-0 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm h-fit">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              إصدار دعوة جديدة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              قم بإصدار رابط دعوة لتسجيل موظف أو شريك عمل جديد في المنظومة بمسمى وظيفي وصلاحيات محددة.
            </p>
            <form onSubmit={handleCreateInviteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  البريد الإلكتروني للمدعو
                </label>
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  الدور / المسمى الوظيفي المطلوب
                </label>
                <select
                  required
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 transition-colors"
                >
                  <option value="">-- اختر دوراً --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isCreatingInvite}
                className="w-full flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 dark:bg-sky-600 rounded-lg hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {isCreatingInvite ? <LoadingSpinner /> : "توليد كود الدعوة ورابط التسجيل"}
              </button>
            </form>
          </div>

          {/* Active Invites List Table */}
          <div className="flex-1 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 flex justify-between items-center whitespace-nowrap">
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">الدعوات الحالية والنشطة</span>
              <button 
                onClick={fetchInvites}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline transition-colors focus:outline-none"
              >
                تحديث القائمة ↺
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {isInvitesLoading ? (
                <div className="flex justify-center items-center h-48">
                  <LoadingSpinner />
                </div>
              ) : invites.length > 0 ? (
                <table className="w-full min-w-[650px] text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-6 py-4">البريد الإلكتروني للضيف</th>
                      <th className="px-6 py-4">المسمى الوظيفي</th>
                      <th className="px-6 py-4">تاريخ الانتهاء</th>
                      <th className="px-6 py-4">حالة الدعوة</th>
                      <th className="px-6 py-4 text-center">أدوات التحكم بالدعوة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invites.map((invite) => {
                      const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
                      const statusLabel = invite.used 
                        ? { label: "تم تفعيلها", style: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" }
                        : isExpired 
                          ? { label: "منتهية الصلاحية", style: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30" }
                          : { label: "نشطة (جاهزة)", style: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" };

                      return (
                        <tr key={invite.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <td className="px-6 py-4 font-medium text-slate-950 dark:text-slate-100">
                            {invite.email}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                            {invite.roles?.name || "بدون مسمى"}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                            {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString("ar-EG") : "لا تنتهي"}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusLabel.style}`}>
                              {statusLabel.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center gap-2">
                              {!invite.used && !isExpired && (
                                <button
                                  onClick={() => handleCopyLink(invite.token, invite.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                  {copiedInviteId === invite.id ? "✓ تم نسخ الرابط" : "نسخ رابط الدعوة"}
                                </button>
                              )}
                              <button
                                onClick={() => handleRevokeInvite(invite.id)}
                                className="inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              >
                                {invite.used ? "حذف السجل" : "إلغاء الدعوة"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-slate-500 dark:text-slate-400">لا يوجد دعوات صادرة حالياً.</p>
                </div>
              )}
            </div>
          </div>
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
