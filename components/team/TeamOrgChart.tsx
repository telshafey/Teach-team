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
  isLast: boolean;
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
  isLast,
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
    <div className="relative">
      <div className="flex items-center my-4">
        {/* Horizontal connector line */}
        <div className="w-8 h-px bg-slate-300 dark:bg-slate-600 shrink-0"></div>

        {/* The Card */}
        <div
          className={`org-card p-2 rounded-lg border-2 w-48 text-center shadow-md relative transition-all ${
            isSelected
              ? "border-sky-500 bg-sky-50 dark:bg-sky-900/50"
              : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
          } ${canManage ? "cursor-grab" : "cursor-pointer"} ${isDragOver ? "ring-2 ring-offset-2 ring-sky-500" : ""}`}
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
            className="w-16 h-16 rounded-full mx-auto mb-2 ring-2 ring-white dark:ring-slate-700"
          />
          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
            {member.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {role?.name || "Unknown Role"}
          </p>
        </div>
      </div>

      {/* Vertical connector from parent */}
      <div
        className={`absolute top-0 right-4 rtl:left-4 w-px bg-slate-300 dark:bg-slate-600 ${isLast ? "h-10" : "h-full"}`}
      ></div>

      {/* Children container */}
      {reports.length > 0 && (
        <div className="pr-12 rtl:pl-12 rtl:pr-0 relative">
          {/* Vertical line for children */}
          <div className="absolute top-0 right-4 rtl:left-4 h-full w-px bg-slate-300 dark:bg-slate-600"></div>
          {reports.map((report, idx) => (
            <TreeNode
              key={report.id}
              member={report}
              allMembers={allMembers}
              onMemberClick={onMemberClick}
              selectedMemberId={selectedMemberId}
              onMoveMember={onMoveMember}
              canManage={canManage}
              roles={roles}
              isLast={idx === reports.length - 1}
              visitedIds={currentVisited}
            />
          ))}
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

  const topLevelMembers = useMemo(() => {
    const memberIdsInChart = new Set(members.map((m) => m.id));
    const tops = members.filter(
      (m) => !m.reportsTo || !memberIdsInChart.has(m.reportsTo),
    );

    // Add missing root nodes to handle circular dependencies
    const reachable = new Set<number>();
    const dfs = (id: number) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      const children = members.filter((m) => m.reportsTo === id);
      children.forEach((c) => dfs(c.id));
    };

    tops.forEach((t) => dfs(t.id));

    const unreached = members.filter((m) => !reachable.has(m.id));
    const newTops = [...tops];

    for (const u of unreached) {
      if (!reachable.has(u.id)) {
        newTops.push(u);
        dfs(u.id);
      }
    }

    return newTops.length > 0
      ? newTops
      : members.length > 0
        ? [members[0]]
        : [];
  }, [members]);

  if (members.length === 0) {
    return (
      <p className="text-center text-slate-500 py-4">
        لا يوجد أعضاء في الفريق لعرضهم.
      </p>
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
      className="org-chart p-4 overflow-auto min-h-[60vh]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleRootDrop}
    >
      <div className="flex flex-col items-start">
        {topLevelMembers.map((member) => {
          const reports = members.filter((m) => m.reportsTo === member.id);
          const role = roles.find((r) => r.id === member.roleId);
          const isSelected = selectedMemberId === member.id;
          return (
            <div key={member.id} className="my-4">
              {/* Card for root node */}
              <div
                className={`org-card p-2 rounded-lg border-2 w-48 text-center shadow-md relative transition-all ${
                  isSelected
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-900/50"
                    : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                } ${canManage ? "cursor-grab" : "cursor-pointer"}`}
                onClick={() => onMemberClick(member.id)}
                draggable={canManage}
                onDragStart={(e) => {
                  if (!canManage) return;
                  e.dataTransfer.setData("memberId", member.id.toString());
                  e.dataTransfer.effectAllowed = "move";
                  e.stopPropagation();
                }}
              >
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-16 h-16 rounded-full mx-auto mb-2 ring-2 ring-white dark:ring-slate-700"
                />
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                  {member.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {role?.name || "Unknown Role"}
                </p>
              </div>

              {/* Children container */}
              {reports.length > 0 && (
                <div className="pr-12 rtl:pr-0 rtl:pl-12 relative">
                  {/* Vertical connector line for children */}
                  <div className="absolute top-0 right-4 rtl:left-4 h-full w-px bg-slate-300 dark:bg-slate-600"></div>
                  {reports.map((report, reportIdx) => (
                    <TreeNode
                      key={report.id}
                      member={report}
                      allMembers={members}
                      onMemberClick={onMemberClick}
                      selectedMemberId={selectedMemberId}
                      onMoveMember={onMoveMember}
                      canManage={canManage}
                      roles={roles}
                      isLast={reportIdx === reports.length - 1}
                      visitedIds={new Set([member.id])}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
