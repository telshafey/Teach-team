import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Project, Task, TaskStatus } from "@shared/types";
import { useProjectContext } from "@shared/contexts/ProjectContext";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { Card } from "../ui/Card";
import { KanbanBoard } from "./KanbanBoard";
import { ProjectTasksList } from "./ProjectTasksList";
import { TaskDetailInline } from "../tasks/TaskDetailInline";
import { ConfirmationModal } from "../modals/ConfirmationModal";
import { ProjectMembers } from "./ProjectMembers";
import { ProjectForm } from "./ProjectForm";
import { BulkAddTasksModal } from "../tasks/BulkAddTasksModal";
import { GanttChart } from "./GanttChart";
import { PencilIcon, TrashIcon, ArrowLeftIcon, PlusIcon, ListBulletIcon, Squares2X2Icon } from "../ui/Icons";
import { StatusBadge } from "../ui/StatusBadge";
import { useNavigation } from "@shared/contexts/NavigationContext";
import { useProjectPermissions } from "@shared/hooks/useProjectPermissions";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import * as api from "@shared/services/apiService";

import { useToast } from "@shared/contexts/ToastContext";

interface ProjectDetailPageProps {
  projectId?: string;
  initialTaskIdToOpen?: string;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  initialTaskIdToOpen,
}) => {
  const params = useParams<{ projectId: string }>();
  const resolvedProjectId = projectId || params.projectId || "";

  // --- HOOKS (ALL AT THE TOP) ---
  const { onNavigate } = useNavigation();
  const {
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    handleUpdateProject,
    handleDeleteProject,
  } = useProjectContext();
  const { teamMembers, hasPermission } = useTeamContext();
  const { supabaseClient } = useSupabase();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // State hooks
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"kanban" | "gantt" | "members">("kanban");
  const [taskViewMode, setTaskViewMode] = useState<"kanban" | "list">("kanban");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // Data fetching with react-query
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ["project", resolvedProjectId],
    queryFn: () => api.getById<Project>(supabaseClient!, "projects", resolvedProjectId),
    enabled: !!supabaseClient && !!resolvedProjectId,
  });

  const { data: tasksForProject = [], isLoading: areTasksLoading } = useQuery({
    queryKey: ["tasks", resolvedProjectId],
    queryFn: async () => {
      if (!supabaseClient) return [];
      const { data, error } = await supabaseClient
        .from("tasks")
        .select("*")
        .eq("project_id", resolvedProjectId);
      if (error) throw error;
      return api.keysToCamel(data) as Task[];
    },
    enabled: !!supabaseClient && !!resolvedProjectId,
  });

  const { canEditProjectSettings, canManageTasks, canManageMembers } =
    useProjectPermissions(project?.id);

  const filteredTasks = useMemo(() => {
    if (assigneeFilter === "all") return tasksForProject;
    if (assigneeFilter === "unassigned") return tasksForProject.filter(t => !t.assignedTo);
    return tasksForProject.filter(t => t.assignedTo?.toString() === assigneeFilter);
  }, [tasksForProject, assigneeFilter]);

  // Effect hooks
  useEffect(() => {
    if (initialTaskIdToOpen && tasksForProject.length > 0) {
      const taskToOpen = tasksForProject.find(
        (t) => t.id === initialTaskIdToOpen,
      );
      if (taskToOpen) {
        setSelectedTask(taskToOpen);
      }
    }
  }, [initialTaskIdToOpen, tasksForProject]);

  // Callback hooks
  const handleUpdateTaskStatus = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      await handleUpdateTask({ id: taskId, status: newStatus });
    },
    [handleUpdateTask],
  );

  const handleSaveTask = useCallback(
    async (taskData: Partial<Task>, isNew: boolean) => {
      if (!project) return;
      if (isNew) {
        await handleAddTask(
          taskData as Omit<Task, "id" | "approvalStatus" | "creatorId">,
          project.id,
        );
      } else if (selectedTask) {
        await handleUpdateTask({ ...selectedTask, ...taskData });
      }
      setSelectedTask(null);
      setIsNewTaskModalOpen(false);
    },
    [project, selectedTask, handleAddTask, handleUpdateTask],
  );

  const handleQuickAddTask = useCallback(
    async (title: string, status: TaskStatus) => {
      if (!project) return;
      await handleAddTask({ title, status }, project.id);
    },
    [project, handleAddTask],
  );

  const handleSaveBulkTasks = useCallback(
    async (tasksToCreate: { title: string; description?: string }[]) => {
      if (!project) return;
      setIsBulkSaving(true);
      try {
        for (const t of tasksToCreate) {
          await handleAddTask(
            { title: t.title, description: t.description, status: "todo" },
            project.id,
          );
        }
        addToast(`تمت إضافة ${tasksToCreate.length} مهمة بنجاح.`, "success");
        setIsBulkAddModalOpen(false);
      } catch (error: any) {
        addToast(`فشل إضافة المهام: ${error.message}`, "error");
      } finally {
        setIsBulkSaving(false);
      }
    },
    [project, handleAddTask, addToast],
  );

  const isLoading = isProjectLoading || areTasksLoading;

  // --- CONDITIONAL RENDERING (AFTER ALL HOOKS) ---
  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (!project) {
    return <div className="p-6 text-center">لم يتم العثور على المشروع.</div>;
  }

  if (isProjectFormOpen && canEditProjectSettings) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ProjectForm
          project={project}
          onCancel={() => setIsProjectFormOpen(false)}
          onSave={async (data, projToUpdate) => {
            await handleUpdateProject({ ...data, id: projToUpdate!.id });
            setIsProjectFormOpen(false);
          }}
        />
      </div>
    );
  }

  if (selectedTask || isNewTaskModalOpen) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex-1 h-[max(calc(100vh-80px),800px)] flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <TaskDetailInline
          onClose={() => {
            setSelectedTask(null);
            setIsNewTaskModalOpen(false);
          }}
          task={selectedTask}
          onSave={handleSaveTask}
          projectId={project.id}
          isProjectFixed={true}
          initialMode={isNewTaskModalOpen ? "edit" : "view"}
        />
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className="p-6 max-w-[1600px] mx-auto h-[max(calc(100vh-80px),800px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 shrink-0">
        <div>
          <button
            onClick={() => onNavigate("projects")}
            className="flex items-center space-x-2 rtl:space-x-reverse text-sm font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 transform rotate-180" />
            <span>العودة للمشاريع</span>
          </button>
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {project.name}
            </h2>
            <StatusBadge status={project.status} type="project" />
          </div>
          <p className="text-md text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {project.description}
          </p>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse pt-6">
          {canManageTasks && (
            <>
              <button
                onClick={() => setIsBulkAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>إضافة مهام متعددة</span>
              </button>
              <button
                onClick={() => setIsNewTaskModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 dark:bg-sky-600 rounded-lg hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>مهمة جديدة</span>
              </button>
            </>
          )}
          {canEditProjectSettings && (
            <button
              onClick={() => setIsProjectFormOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
          )}
          {hasPermission("manage_projects") && (
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="p-2 text-red-500 hover:text-white hover:bg-red-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div className="flex space-x-1 rtl:space-x-reverse bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("kanban")}
            className={`py-2 px-6 text-sm font-medium rounded-lg transition-all ${
              activeTab === "kanban"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            مهام المشروع
          </button>
          <button
            onClick={() => setActiveTab("gantt")}
            className={`py-2 px-6 text-sm font-medium rounded-lg transition-all ${
              activeTab === "gantt"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            مخطط زمني
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`py-2 px-6 text-sm font-medium rounded-lg transition-all ${
              activeTab === "members"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            أعضاء المشروع
          </button>
        </div>

        {activeTab === "kanban" && (
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">كل المهام</option>
              <option value="unassigned">غير مسندة</option>
              {teamMembers
                .filter(member => {
                  const isInProjectMembers = project?.members?.some((pm: any) => 
                    pm.teamMemberId === member.id || 
                    pm.team_member_id === member.id || 
                    pm === member.id
                  );
                  const isCreator = project?.creatorId === member.id;
                  const hasTask = tasksForProject.some(t => t.assignedTo === member.id);
                  return isInProjectMembers || isCreator || hasTask;
                })
                .map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            
            <div className="flex items-center space-x-1 rtl:space-x-reverse bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setTaskViewMode('kanban')}
                className={`p-1.5 rounded-md transition-colors ${taskViewMode === 'kanban' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="عرض كانبان"
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTaskViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${taskViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="عرض القائمة"
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 relative">
        {activeTab === "kanban" && (
          <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {taskViewMode === 'kanban' ? (
              <KanbanBoard
                tasks={filteredTasks}
                canManageTasks={canManageTasks}
                onTaskClick={setSelectedTask}
                onDeleteTask={setTaskToDelete}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onQuickAddTask={handleQuickAddTask}
              />
            ) : (
              <ProjectTasksList
                tasks={filteredTasks}
                canManageTasks={canManageTasks}
                onTaskClick={setSelectedTask}
                onDeleteTask={setTaskToDelete}
                onUpdateTaskStatus={handleUpdateTaskStatus}
              />
            )}
          </div>
        )}

        {activeTab === "gantt" && (
          <div className="h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-4 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                المخطط الزمني للمشروع
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                تتبع المهام وفقاً لجدولها الزمني
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <GanttChart project={project} tasks={tasksForProject} />
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="h-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProjectMembers
              project={project}
              canManageMembers={canManageMembers}
            />
          </div>
        )}
      </div>

      {taskToDelete && (
        <ConfirmationModal
          isOpen={!!taskToDelete}
          onClose={() => setTaskToDelete(null)}
          onConfirm={async () => {
            if (taskToDelete) {
              await handleDeleteTask(taskToDelete);
            }
            setTaskToDelete(null);
          }}
          title="تأكيد حذف المهمة"
          message={`هل أنت متأكد من حذف مهمة "${taskToDelete.title}"؟`}
          isDestructive
        />
      )}
      {isDeleteConfirmOpen && hasPermission("manage_projects") && (
        <ConfirmationModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={async () => {
            await handleDeleteProject(project.id);
            onNavigate("projects");
          }}
          title="تأكيد حذف المشروع"
          message={`هل أنت متأكد من حذف مشروع "${project.name}"؟ سيتم حذف جميع المهام والسجلات المتعلقة به.`}
          isDestructive
        />
      )}
      {isBulkAddModalOpen && (
        <BulkAddTasksModal
          onClose={() => setIsBulkAddModalOpen(false)}
          onSave={handleSaveBulkTasks}
          isSaving={isBulkSaving}
        />
      )}
    </div>
  );
};
