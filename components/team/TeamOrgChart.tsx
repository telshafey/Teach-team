import React, { useState, useMemo } from "react";
import { TeamMember, Role } from "@shared/types";
import { useTeamContext } from "@shared/contexts/TeamContext";

interface TreeNodeProps {
  member: TeamMember;
  allMembers: TeamMember[];
  onMemberClick: (memberId: number) => void;
  selectedMemberId: number | null;
  onMoveMember: (memberId: number, newManagerId: number | null) => void;
  canManage: boolean;
  roles: Role[];
  visitedIds?: Set<number>;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  member,
  allMembers,
  onMemberClick,
  selectedMemberId,
  onMoveMember,
  canManage,
  roles,
  visitedIds = new Set(),
}) => {
  const currentVisited = useMemo(
    () => new Set([...visitedIds, member.id]),
    [visitedIds, member.id],
  );

  const reports = allMembers.filter(
    (m) => m.reportsTo === member.id && !currentVisited.has(m.id),
  );

  const isSelected = selectedMemberId === member.id;
  const role = roles.find((r) => r.id === member.roleId);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canManage) return;
    e.dataTransfer.setData("memberId", member.id.toString());
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!canManage) return;

    const draggedMemberId = parseInt(e.dataTransfer.getData("memberId"), 10);
    if (draggedMemberId === member.id) return;

    const isDescendant = (
      managerId: number,
      subordinateId: number,
      visited = new Set<number>(),
    ): boolean => {
      if (visited.has(managerId)) return false;
      visited.add(managerId);
      const directReports = allMembers.filter((m) => m.reportsTo === managerId);
      if (directReports.some((r) => r.id === subordinateId)) return true;
      return directReports.some((r) =>
        isDescendant(r.id, subordinateId, visited),
      );
    };

    if (isDescendant(draggedMemberId, member.id)) {
      console.warn("Cannot move a manager under their own subordinate.");
      return;
    }

    onMoveMember(draggedMemberId, member.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (canManage) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = "move";
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* The Node Card */}
      <div className="relative z-10 px-2 lg:px-4">
        <div
          className={`org-card p-3 rounded-lg border w-36 text-center shadow-sm relative transition-all ${
            isSelected
              ? "border-sky-500 bg-sky-50 dark:bg-sky-900/40 ring-1 ring-sky-500"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          } ${canManage ? "cursor-grab active:cursor-grabbing hover:border-sky-300 dark:hover:border-sky-600" : "cursor-pointer hover:border-slate-300 dark:hover:border-slate-600"} ${
            isDragOver ? "ring-2 ring-sky-400 bg-sky-50 dark:bg-sky-900" : ""
          }`}
          onClick={() => onMemberClick(member.id)}
          draggable={canManage}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragOver(false)}
        >
          <img
            src={member.avatarUrl}
            alt={member.name}
            className={`w-10 h-10 rounded-full mx-auto mb-2 object-cover ${isSelected ? "ring-2 ring-sky-500" : "ring-1 ring-slate-200 dark:ring-slate-700"}`}
          />
          <p className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
            {member.name}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {role?.name || "بدون دور"}
          </p>
        </div>
      </div>

      {/* Children Branches */}
      {reports.length > 0 && (
        <div className="flex flex-col items-center w-full">
          {/* Stem downwards from parent */}
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>

          <div className="relative flex flex-row justify-center">
            {reports.map((report, i) => (
              <div
                key={report.id}
                className="relative flex flex-col items-center flex-1 min-w-[150px]"
              >
                {/* Horizontal branchline */}
                {reports.length > 1 && (
                  <div
                    className={`absolute top-0 h-px bg-slate-300 dark:bg-slate-600 ${
                      i === 0
                        ? "right-1/2 left-0"
                        : i === reports.length - 1
                          ? "left-1/2 right-0"
                          : "left-0 right-0"
                    }`}
                  ></div>
                )}
                {/* Vertical drop line to child card */}
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>

                {/* Recursion */}
                <TreeNode
                  member={report}
                  allMembers={allMembers}
                  onMemberClick={onMemberClick}
                  selectedMemberId={selectedMemberId}
                  onMoveMember={onMoveMember}
                  canManage={canManage}
                  roles={roles}
                  visitedIds={currentVisited}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface TeamOrgChartProps {
  members: TeamMember[];
  onMemberClick: (memberId: number) => void;
  selectedMemberId: number | null;
  onMoveMember: (memberId: number, newManagerId: number | null) => void;
  canManage: boolean;
}

export const TeamOrgChart: React.FC<TeamOrgChartProps> = ({
  members,
  onMemberClick,
  selectedMemberId,
  onMoveMember,
  canManage,
}) => {
  const { roles } = useTeamContext();

  const renderedTops = useMemo(() => {
    // 1. Identify "true" requested roots (people who have reportsTo == null, or reportsTo an ID not in chart)
    const memberIdsInChart = new Set(members.map((m) => m.id));
    let roots = members.filter(
      (m) => !m.reportsTo || !memberIdsInChart.has(m.reportsTo),
    );

    // 2. Resolve circular references for missed nodes
    const reachable = new Set<number>();
    const dfs = (id: number) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      const children = members.filter((m) => m.reportsTo === id);
      children.forEach((c) => dfs(c.id));
    };

    roots.forEach((t) => dfs(t.id));

    const unreached = members.filter((m) => !reachable.has(m.id));
    for (const u of unreached) {
      if (!reachable.has(u.id)) {
        roots.push(u);
        dfs(u.id);
      }
    }

    // --- UX Fixes ---
    // If there is more than 1 root, find if one of them is the GM (المدير العام)
    // To prevent freelancers from popping up at the very top forming dual roots
    const gmRole = roles.find(
      (r) => r.name?.includes("GM") || r.name?.includes("المدير العام"),
    );
    if (gmRole && roots.length > 1) {
      const actualGM = roots.find((r) => r.roleId === gmRole.id);
      if (actualGM) {
        // We will only render actualGM as the top root.
        // Everyone else who thinks they are a root will implicitly "report" to GM visually.
        // We can do this by tricking the allMembers list.
      }
    }

    return roots.length > 0 ? roots : members.length > 0 ? [members[0]] : [];
  }, [members, roles]);

  // Transform members so that loose roots visually attach to the GM if present.
  const visualMembers = useMemo(() => {
    if (renderedTops.length <= 1) return members;

    // Find the primary GM
    const gmRole = roles.find(
      (r) =>
        r.permissions?.includes("manage_roles") ||
        r.name?.includes("GM") ||
        r.name?.includes("المدير العام"),
    );
    let gmId: number | null = null;

    if (gmRole) {
      const gmNode = renderedTops.find((t) => t.roleId === gmRole.id);
      if (gmNode) gmId = gmNode.id;
    }

    // If no explicit GM found in roots, just pick the first root as the main visual root
    if (!gmId) {
      gmId = renderedTops[0].id;
    }

    return members.map((m) => {
      // If this member is one of the roots but NOT the main GM, force their visual reportsTo to be GM
      if (
        m.id !== gmId &&
        (!m.reportsTo || renderedTops.some((t) => t.id === m.id))
      ) {
        return { ...m, reportsTo: gmId };
      }
      return m;
    });
  }, [members, renderedTops, roles]);

  const finalRoots = useMemo(() => {
    const gmRole = roles.find(
      (r) =>
        r.permissions?.includes("manage_roles") ||
        r.name?.includes("GM") ||
        r.name?.includes("المدير العام"),
    );
    const gmNode = members.find((m) => m.roleId === gmRole?.id);

    if (gmNode) {
      return [visualMembers.find((m) => m.id === gmNode.id)!];
    }

    if (visualMembers.length > 0) {
      // Find people with reportsTo null
      const realRoots = visualMembers.filter((m) => !m.reportsTo);
      return realRoots.length > 0 ? realRoots : [visualMembers[0]];
    }
    return [];
  }, [visualMembers, members, roles]);

  if (members.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">
          لا يوجد أعضاء في الفريق لعرضهم.
        </p>
      </div>
    );
  }

  const handleRootDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canManage) return;
    const draggedMemberId = parseInt(e.dataTransfer.getData("memberId"), 10);
    const member = members.find((m) => m.id === draggedMemberId);
    if (member && member.reportsTo !== null) {
      onMoveMember(draggedMemberId, null);
    }
  };

  return (
    <div
      className="org-chart p-8 overflow-auto h-full w-full bg-slate-50 dark:bg-slate-900/20"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleRootDrop}
    >
      <div className="min-w-fit flex justify-center pb-12">
        <div className="flex flex-row items-start justify-center gap-12">
          {finalRoots.map((member) => (
            <TreeNode
              key={`root-${member.id}`}
              member={member}
              allMembers={visualMembers}
              onMemberClick={onMemberClick}
              selectedMemberId={selectedMemberId}
              onMoveMember={onMoveMember}
              canManage={canManage}
              roles={roles}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
