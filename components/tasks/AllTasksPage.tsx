import React, { useState, useMemo, useEffect } from "react";
import { useProjectContext } from "@shared/contexts/ProjectContext";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { Task, TaskStatus, TeamMember, Project } from "@shared/types";
import { Card } from "../ui/Card";
import { TaskTableRow } from "./TaskTableRow";
import { TaskDetailInline } from "./TaskDetailInline";
import { TaskKanbanBoard } from "./TaskKanbanBoard";
import { ConfirmationModal } from "../modals/ConfirmationModal";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { EmptyState } from "../ui/EmptyState";
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  ListBulletIcon,
  Squares2X2Icon,
} from "../ui/Icons";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import * as api from "@shared/services/apiService";
import { Pagination } from "../ui/Pagination";

const ITEMS_PER_PAGE = 30;

type SortKey = "title" | "projectName" | "assigneeName" | "dueDate" | "status";

export const AllTasksPage: React.FC = () => {
  const { handleUpdateTask, handleDeleteTask, handleAddTask } =
    useProjectContext();
  const { teamMembers, hasPermission } = useTeamContext();
  const { currentUser } = useAuth();
  const { supabaseClient } = useSupabase();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    assignee: "all", // 'me', 'all', or memberId
    status: "open", // 'open', 'all', or TaskStatus
  });
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  } | null>({ key: "dueDate", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.getAll<Project>(supabaseClient!, "projects"),
    enabled: !!supabaseClient,
  });
  const { data: tasks = [], isLoading: areTasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.getAll<Task>(supabaseClient!, "tasks"),
    enabled: !!supabaseClient,
  });
  const isLoading = isProjectsLoading || areTasksLoading;

  const canCreateTasks = hasPermission("create_tasks");
  const canEditTasks = hasPermission("edit_tasks");
  const canDeleteTasks = hasPermission("delete_tasks");

  const membersMap = useMemo(
    () =>
      teamMembers.reduce(
        (acc, m) => ({ ...acc, [m.id]: m.name }),
        {} as Record<number, string>,
      ),
    [teamMembers],
  );
  const projectsMap = useMemo(
    () =>
      projects.reduce(
        (acc, p) => ({ ...acc, [p.id]: p.name }),
        {} as Record<string, string>,
      ),
    [projects],
  );

  const { roles } = useTeamContext();
  const currentUserRole = roles?.find((r) => r.id === currentUser?.roleId);
  const isGM =
    currentUser?.roleId === "gm" ||
    currentUser?.roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" ||
    currentUserRole?.name.includes("(GM)");

  const filteredAndSortedTasks = useMemo(() => {
    if (!currentUser) return [];

    let filtered = tasks.filter((task) => {
      // Visibility Check
      if (!isGM) {
        if (task.projectId) {
          const project = projects.find((p) => p.id === task.projectId);
          if (project) {
            const isMember = project.members?.some(
              (m) => m.teamMemberId === currentUser.id,
            );
            if (!isMember) return false;
          } else {
            // If project is not found for some reason, we could hide it or show it. Let's hide it to be safe.
            return false;
          }
        } else {
          // Task without project: only visible if assigned to me or created by me
          if (
            task.assignedTo !== currentUser.id &&
            task.creatorId !== currentUser.id
          ) {
            return false;
          }
        }
      }

      const matchesSearch = task.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      let matchesAssignee = false;
      if (filters.assignee === "me") {
        matchesAssignee = task.assignedTo === currentUser.id;
      } else if (filters.assignee === "all") {
        matchesAssignee = true;
      } else {
        matchesAssignee = task.assignedTo === parseInt(filters.assignee, 10);
      }

      let matchesStatus = false;
      if (filters.status === "all") {
        matchesStatus = true;
      } else if (filters.status === "open") {
        matchesStatus = task.status !== "done";
      } else {
        matchesStatus = task.status === filters.status;
      }

      return matchesSearch && matchesAssignee && matchesStatus;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = getSortValue(a, sortConfig.key);
        const bVal = getSortValue(b, sortConfig.key);
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [
    tasks,
    searchTerm,
    filters,
    sortConfig,
    currentUser,
    membersMap,
    projectsMap,
  ]);

  function getSortValue(task: Task, key: SortKey): string | number {
    switch (key) {
      case "title":
        return task.title.toLowerCase();
      case "projectName":
        return task.projectId
          ? projectsMap[task.projectId]?.toLowerCase() || "zzzz"
          : "zzzz";
      case "assigneeName":
        return task.assignedTo
          ? membersMap[task.assignedTo]?.toLowerCase() || "zzzz"
          : "zzzz";
      case "dueDate":
        return task.dueDate ? new Date(task.dueDate).getTime() : Infinity;
      case "status":
        return task.status;
    }
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, sortConfig, viewMode]);

  const totalPages = Math.ceil(filteredAndSortedTasks.length / ITEMS_PER_PAGE);
  const currentTasks = filteredAndSortedTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSaveTask = async (taskData: Partial<Task>, isNew: boolean) => {
    if (isNew) {
      await handleAddTask(
        taskData as Omit<Task, "id" | "approvalStatus" | "creatorId">,
        taskData.projectId,
      );
    } else if (selectedTask) {
      await handleUpdateTask({ ...taskData, id: selectedTask.id });
    }
    setIsFormOpen(false);
    setSelectedTask(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (isFormOpen || selectedTask) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex flex-col h-[max(calc(100vh-80px),800px)] w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <TaskDetailInline
          onClose={() => {
            setIsFormOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onSave={handleSaveTask}
          initialMode={isFormOpen && !selectedTask ? "edit" : "view"}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            جميع المهام
          </h2>
          <p className="text-md text-slate-500 dark:text-slate-400 mt-1">
            عرض وتصفية جميع المهام الخاصة بك وبفريقك
          </p>
        </div>
        {canCreateTasks && (
          <button
            onClick={() => {
              setSelectedTask(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 dark:bg-sky-600 rounded-lg hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors shadow-sm w-full md:w-auto"
          >
            <PlusIcon className="w-4 h-4" />
            <span>مهمة جديدة</span>
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-500">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <input
            type="text"
            placeholder="ابحث في المهام..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-auto flex-grow px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow"
          />
          <div className="flex gap-3">
            <select
              value={filters.assignee}
              onChange={(e) =>
                setFilters({ ...filters, assignee: e.target.value })
              }
              className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="me">المهام الخاصة بي</option>
              <option value="all">الكل</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="open">المفتوحة</option>
              <option value="all">الكل</option>
              <option value="todo">لم تبدأ</option>
              <option value="inprogress">قيد التنفيذ</option>
              <option value="done">مكتملة</option>
            </select>
          </div>
          <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "kanban" ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50/30 dark:bg-slate-900/20">
          {filteredAndSortedTasks.length > 0 ? (
            <div className="h-full p-4 flex flex-col">
              {viewMode === "kanban" ? (
                <div className="flex-1 overflow-auto">
                  <TaskKanbanBoard
                    tasks={currentTasks}
                    onTaskClick={(task) => setSelectedTask(task)}
                    onUpdateTaskStatus={async (taskId, newStatus) => {
                      await handleUpdateTask({ id: taskId, status: newStatus });
                    }}
                    membersMap={membersMap}
                  />
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 overflow-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          المهمة
                        </th>
                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          المشروع
                        </th>
                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          المسؤول
                        </th>
                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          تاريخ الاستحقاق
                        </th>
                        <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                          الحالة
                        </th>
                        {(canEditTasks || canDeleteTasks) && (
                          <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                            الإجراءات
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {currentTasks.map((task) => (
                        <TaskTableRow
                          key={task.id}
                          task={task}
                          projectName={
                            task.projectId
                              ? projectsMap[task.projectId] || "-"
                              : "-"
                          }
                          assigneeName={
                            task.assignedTo
                              ? membersMap[task.assignedTo] || "غير معروف"
                              : "غير مسندة"
                          }
                          onEdit={() => {
                            setSelectedTask(task);
                            setIsFormOpen(true);
                          }}
                          onDelete={() => setTaskToDelete(task)}
                          onSelect={() => setSelectedTask(task)}
                          canEdit={canEditTasks}
                          canDelete={canDeleteTasks}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="mt-4 shrink-0">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredAndSortedTasks.length}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <EmptyState
                icon={
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 mx-auto">
                    <ClipboardDocumentListIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                  </div>
                }
                title="لا توجد مهام"
                message="لم يتم العثور على مهام تطابق الفلاتر المطبقة."
              />
            </div>
          )}
        </div>
      </div>

      {taskToDelete && (
        <ConfirmationModal
          isOpen={!!taskToDelete}
          onClose={() => setTaskToDelete(null)}
          onConfirm={async () => {
            if (taskToDelete) await handleDeleteTask(taskToDelete);
            setTaskToDelete(null);
          }}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف مهمة "${taskToDelete.title}"؟`}
          isDestructive
        />
      )}
    </div>
  );
};
