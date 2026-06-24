import React, { useState, FormEvent, useMemo, useRef, useEffect } from "react";
import {
  Task,
  TaskComment,
  TaskAttachment,
  TeamMember,
  TaskStatus,
  Project,
} from "@shared/types";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useProjectContext } from "@shared/contexts/ProjectContext";
import { useAuth } from "@shared/contexts/AuthContext";
import {
  PaperClipIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowUpTrayIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  ClockIcon,
} from "../ui/Icons";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import { useToast } from "@shared/contexts/ToastContext";
import { useTimeManagement } from "@shared/contexts/TimeManagementContext";
import { useTimeLogContext } from "@shared/contexts/TimeLogContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ConfirmationModal } from "../modals/ConfirmationModal";
import { MentionTextarea } from "../shared/MentionTextarea";
import { useQuery } from "@tanstack/react-query";
import * as api from "@shared/services/apiService";
import { Card } from "../ui/Card";

interface TaskDetailInlineProps {
  onClose: () => void;
  task: Task | null; // null for create mode
  onSave?: (taskData: Partial<Task>, isNew: boolean) => Promise<void>;
  initialMode?: "view" | "edit";
  projectId?: string; // For pre-filling project when creating a new task
  isProjectFixed?: boolean; // To disable project selector
}

type ItemToDelete =
  | { type: "attachment"; data: TaskAttachment }
  | { type: "comment"; data: TaskComment };

// --- Extracted Components to fix focus loss issue ---

interface TaskDetailViewProps {
  task: Task;
  assignedMember: TeamMember | undefined;
  attachmentsForThisTask: TaskAttachment[];
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  localComments: TaskComment[];
  membersMap: Record<number, TeamMember>;
  projectMembers: TeamMember[];
  currentUser: TeamMember;
  newComment: string;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;
  handleAddCommentSubmit: (e: FormEvent) => void;
  onDeleteItem: (item: ItemToDelete) => void;
  canDeleteTasks: boolean;
  taskHours: number;
  isThisTaskActive: boolean;
  handleToggleTimer: (e: React.MouseEvent) => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  task,
  assignedMember,
  attachmentsForThisTask,
  handleFileUpload,
  isUploading,
  localComments,
  membersMap,
  projectMembers,
  currentUser,
  newComment,
  setNewComment,
  handleAddCommentSubmit,
  onDeleteItem,
  canDeleteTasks,
  taskHours,
  isThisTaskActive,
  handleToggleTimer,
}) => (
  <>
    <div className="flex-1 pr-2 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mt-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            مسندة إلى:
          </span>{" "}
          <span className="text-slate-800 dark:text-slate-200">{assignedMember?.name || "غير مسندة"}</span>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            تاريخ الاستحقاق:
          </span>{" "}
          <span className="text-slate-800 dark:text-slate-200">
            {task?.dueDate
              ? format(parseISO(task.dueDate), "d MMMM yyyy", { locale: arSA })
              : "غير محدد"}
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-start space-x-2 rtl:space-x-reverse">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              الوقت المسجل:
            </span>{" "}
            <span className="font-mono text-slate-800 dark:text-slate-200">
              {taskHours.toFixed(1)}h
            </span>
          </div>
          {task && (
            <button
              onClick={handleToggleTimer}
              className={`p-1.5 rounded-full transition-all ${
                isThisTaskActive
                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 ring-2 ring-green-400 animate-pulse"
                  : "bg-slate-100 text-slate-500 hover:text-green-600 hover:bg-green-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-green-400"
              }`}
              title={isThisTaskActive ? "إيقاف المؤقت" : "بدء المؤقت"}
            >
              {isThisTaskActive ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {task?.description && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 font-sans text-sm">
          <h4 className="font-semibold mb-2 text-slate-700 dark:text-slate-300">
            وصف المهمة
          </h4>
          <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
            {task.description}
          </p>
        </div>
      )}

      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
          <PaperClipIcon className="w-5 h-5 ml-2" /> المرفقات
        </h3>
        <div className="space-y-2">
          {attachmentsForThisTask.map((att) => (
            <div
              key={att.id}
              className="group flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md"
            >
              <a
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sky-600 dark:text-sky-400 hover:underline truncate"
              >
                {att.fileName}
              </a>
              {(currentUser.id === att.uploaderId || canDeleteTasks) && (
                <button
                  onClick={() =>
                    onDeleteItem({ type: "attachment", data: att })
                  }
                  className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <label
            className={`flex items-center justify-center w-full p-3 border-2 border-dashed rounded-md ${isUploading ? "cursor-wait" : "cursor-pointer"}`}
          >
            <ArrowUpTrayIcon className="w-5 h-5 ml-2" />
            <span>{isUploading ? "جارٍ الرفع..." : "رفع ملف جديد"}</span>
            <input
              type="file"
              className="hidden"
              accept=".png,.jpeg,.jpg,.pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
          <ChatBubbleLeftEllipsisIcon className="w-5 h-5 ml-2" /> التعليقات
        </h3>
        <div className="space-y-4">
          {localComments.map((comment) => {
            const author = membersMap[comment.authorId];
            return (
              <div
                key={comment.id}
                className="flex items-start space-x-3 rtl:space-x-reverse group"
              >
                <img
                  src={author?.avatarUrl}
                  alt={author?.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">
                      {author?.name}
                    </span>
                  </div>
                  <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded-md mt-1">
                    {comment.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t dark:border-slate-800 flex-shrink-0">
      <form
        onSubmit={handleAddCommentSubmit}
        className="flex items-start space-x-3 rtl:space-x-reverse"
      >
        <img
          src={currentUser.avatarUrl}
          alt={currentUser.name}
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <MentionTextarea
            value={newComment}
            onChange={setNewComment}
            onSubmit={() => {
              if (newComment.trim()) {
                const e = { preventDefault: () => {} } as React.FormEvent;
                handleAddCommentSubmit(e);
              }
            }}
            members={projectMembers}
            placeholder="أضف تعليقًا... (يمكنك الإشارة إلى عضو باستخدام @)"
            rows={1}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-900 resize-none min-h-[40px]"
          />
          <button
            type="submit"
            className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700"
          >
            إضافة
          </button>
        </div>
      </form>
    </div>
  </>
);

interface TaskDetailEditProps {
  formData: {
    title: string;
    description: string;
    projectId: string;
    assignedTo: string;
    dueDate: string;
    status: TaskStatus;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<TaskDetailEditProps["formData"]>
  >;
  handleFormSubmit: (e: FormEvent) => void;
  projects: Project[];
  assignableMembers: TeamMember[];
  isSaving: boolean;
  onCancel: () => void;
  canAssignToOthers: boolean;
  isNew: boolean;
  isProjectFixed?: boolean;
}

const TaskDetailEdit: React.FC<TaskDetailEditProps> = ({
  formData,
  setFormData,
  handleFormSubmit,
  projects,
  assignableMembers,
  isSaving,
  onCancel,
  canAssignToOthers,
  isNew,
  isProjectFixed,
}) => (
  <form onSubmit={handleFormSubmit} className="flex-1 pr-2 space-y-6 mt-4">
    <div>
      <label className="block text-sm font-medium mb-1 dark:text-slate-300">
        عنوان المهمة
      </label>
      <input
        type="text"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-900"
        required
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 dark:text-slate-300">
        الوصف التفصيلي
      </label>
      <textarea
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        className="w-full p-2 min-h-[100px] border border-slate-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-900 resize-y"
        placeholder="أضف تفاصيل أكثر عن المهمة..."
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 dark:text-slate-300">
        المشروع
      </label>
      <select
        value={formData.projectId}
        onChange={(e) =>
          setFormData({ ...formData, projectId: e.target.value })
        }
        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-900"
        disabled={isProjectFixed}
      >
        <option value="">-- بدون مشروع --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-slate-300">
          مسندة إلى
        </label>
        <select
          value={formData.assignedTo}
          onChange={(e) =>
            setFormData({ ...formData, assignedTo: e.target.value })
          }
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-900"
          disabled={isNew && !canAssignToOthers}
          required
        >
          <option value="">غير مسندة</option>
          {assignableMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-slate-300">
          تاريخ الاستحقاق
        </label>
        <input
          type="date"
          value={formData.dueDate}
          onChange={(e) =>
            setFormData({ ...formData, dueDate: e.target.value })
          }
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-900"
        />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium mb-1 dark:text-slate-300">
        الحالة
      </label>
      <select
        value={formData.status}
        onChange={(e) =>
          setFormData({ ...formData, status: e.target.value as TaskStatus })
        }
        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-900"
      >
        <option value="todo">لم تبدأ</option>
        <option value="inprogress">قيد التنفيذ</option>
        <option value="done">مكتملة</option>
      </select>
    </div>
    <div className="flex justify-start space-x-2 rtl:space-x-reverse pt-4 border-t dark:border-slate-800">
      <button
        type="submit"
        disabled={isSaving}
        className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md disabled:bg-slate-400"
      >
        {isSaving ? <LoadingSpinner /> : "حفظ"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600"
      >
        إلغاء
      </button>
    </div>
  </form>
);

// --- Main Inline Component ---

export const TaskDetailInline: React.FC<TaskDetailInlineProps> = ({
  onClose,
  task,
  onSave,
  initialMode = "view",
  projectId,
  isProjectFixed,
}) => {
  const { teamMembers, hasPermission, visibleMemberIds } = useTeamContext();
  const {
    taskAttachments,
    taskComments,
    handleAddTaskComment,
    handleAddTaskAttachment,
    handleDeleteTaskAttachment,
    handleDeleteTaskComment,
  } = useProjectContext();
  const { currentUser } = useAuth();
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();

  const { dailyLogs } = useTimeLogContext();
  const { activeTimer, startTimer, stopTimer } = useTimeManagement();

  const taskHours = useMemo(() => {
    if (!task) return 0;
    return dailyLogs
      .filter((l) => l.taskId === task.id)
      .reduce((sum, log) => sum + log.hours, 0);
  }, [dailyLogs, task?.id]);

  const isThisTaskActive = useMemo(() => {
    if (!task) return false;
    return activeTimer?.taskId === task.id;
  }, [activeTimer, task?.id]);

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task) return;
    if (isThisTaskActive) {
      stopTimer();
    } else {
      const projId = task.projectId || projectId;
      if (projId) {
        startTimer(task.id, task.title, projId);
      } else {
        addToast("لا يمكن بدء المؤقت لمهمة بدون مشروع.", "error");
      }
    }
  };

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects_list"],
    queryFn: () => api.getAll(supabaseClient!, "projects", "id, name"),
    enabled: !!supabaseClient,
  });

  const isNew = !task;
  const [isEditing, setIsEditing] = useState(isNew || initialMode === "edit");
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    projectId: task?.projectId || projectId || "",
    assignedTo: task?.assignedTo?.toString() || "",
    dueDate: task?.dueDate ? format(parseISO(task.dueDate), "yyyy-MM-dd") : "",
    status: task?.status || ("todo" as TaskStatus),
  });

  const targetProjectId = formData.projectId || task?.projectId || projectId;

  const { data: currentProject } = useQuery<Project | null>({
    queryKey: ["project_with_members", targetProjectId],
    queryFn: async () => {
      if (!supabaseClient || !targetProjectId) return null;
      const { data, error } = await supabaseClient
        .from("projects")
        .select("id, name, members, creator_id")
        .eq("id", targetProjectId)
        .single();
      if (error) throw error;
      return api.keysToCamel(data) as Project;
    },
    enabled: !!supabaseClient && !!targetProjectId,
  });

  const projectMembers = useMemo(() => {
    if (!targetProjectId) {
      return teamMembers;
    }
    if (!currentProject) {
      return [];
    }
    const memberIds = new Set(
      (currentProject.members || []).map((m) => m.teamMemberId)
    );
    if (currentProject.creatorId) {
      memberIds.add(currentProject.creatorId);
    }
    return teamMembers.filter((m) => memberIds.has(m.id));
  }, [currentProject, teamMembers, targetProjectId]);

  const [newComment, setNewComment] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);

  const commentsForThisTask = useMemo(
    () =>
      task
        ? taskComments
            .filter((c) => c.taskId === task.id)
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            )
        : [],
    [taskComments, task],
  );
  const [localComments, setLocalComments] = useState<TaskComment[]>([]);

  const membersMap = useMemo(
    () =>
      teamMembers.reduce(
        (acc, m) => ({ ...acc, [m.id]: m }),
        {} as Record<number, TeamMember>,
      ),
    [teamMembers],
  );
  const canAssignToOthers =
    hasPermission("edit_tasks") || hasPermission("manage_projects");
  const canDeleteTasks = hasPermission("delete_tasks");

  const assignableMembers = useMemo(() => {
    return teamMembers.filter((m) => visibleMemberIds.has(m.id));
  }, [teamMembers, visibleMemberIds]);

  useEffect(() => {
    setLocalComments(commentsForThisTask);
  }, [commentsForThisTask]);

  useEffect(() => {
    const isNewTask = !task;
    setIsEditing(isNewTask || initialMode === "edit");

    if (isNewTask) {
      const initialAssignee = currentUser ? currentUser.id.toString() : "";
      setFormData({
        title: "",
        description: "",
        projectId: projectId || "",
        assignedTo: initialAssignee,
        dueDate: "",
        status: "todo",
      });
    } else if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        projectId: task.projectId || "",
        assignedTo: task.assignedTo?.toString() || "",
        dueDate: task.dueDate
          ? format(parseISO(task.dueDate), "yyyy-MM-dd")
          : "",
        status: task.status,
      });
    }
  }, [task?.id, initialMode, projectId, currentUser]);

  const attachmentsForThisTask = useMemo(
    () => (task ? taskAttachments.filter((a) => a.taskId === task.id) : []),
    [taskAttachments, task],
  );

  const projectForDisplay = useMemo(
    () =>
      projects.find(
        (p) => p.id === (isNew ? formData.projectId : task?.projectId),
      ),
    [projects, task, formData.projectId, isNew],
  );
  const assignedMember = useMemo(
    () =>
      teamMembers.find(
        (m) =>
          m.id === (isNew ? parseInt(formData.assignedTo) : task?.assignedTo),
      ),
    [teamMembers, task, formData.assignedTo, isNew],
  );

  if (!currentUser || !supabaseClient) return null;

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(
        {
          ...formData,
          assignedTo: formData.assignedTo
            ? parseInt(formData.assignedTo)
            : undefined,
          dueDate: formData.dueDate || undefined,
        },
        isNew,
      );
      if (isNew) {
        onClose();
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      // Toast is handled in context
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;
    try {
      await handleAddTaskComment(task.id, newComment);
      setNewComment("");
    } catch (error) {
      // Error is handled in the context
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task) return;
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Constraints
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        addToast("حجم الملف يتجاوز الحد المسموح به (5 ميجابايت).", "error");
        e.target.value = "";
        return;
      }

      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      if (!allowedTypes.includes(file.type)) {
        addToast("نوع الملف غير مسموح به.", "error");
        e.target.value = "";
        return;
      }

      setIsUploading(true);
      try {
        const filePath = `tasks/${currentUser.id}/${task.id}/${Date.now()}_${file.name}`;
        const { error } = await supabaseClient.storage
          .from("site_assets")
          .upload(filePath, file);
        if (error) throw error;
        const {
          data: { publicUrl },
        } = supabaseClient.storage.from("site_assets").getPublicUrl(filePath);
        await handleAddTaskAttachment({
          taskId: task.id,
          fileName: file.name,
          fileUrl: publicUrl,
          uploaderId: currentUser.id,
          timestamp: new Date().toISOString(),
        });
        addToast("تم رفع المرفق بنجاح.", "success");
      } catch (error: any) {
        addToast(`حدث خطأ أثناء رفع الملف: ${error.message}`, "error");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "attachment") {
      await handleDeleteTaskAttachment(itemToDelete.data);
    }
    setItemToDelete(null);
  };

  return (
    <Card className="flex flex-col h-full m-0 p-0 overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 border-b dark:border-slate-700 shrink-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeftIcon className="w-5 h-5 transform rotate-180" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {isNew
                  ? "مهمة جديدة"
                  : isEditing
                    ? "تعديل المهمة"
                    : task?.title}
              </h2>
              {!isNew && (
                <p className="text-sm text-slate-500">
                  في مشروع: {projectForDisplay?.name || "مهمة خاصة"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isNew && !isEditing && onSave && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 flex-1 min-h-0 overflow-y-auto w-full">
          {isEditing && onSave ? (
            <TaskDetailEdit
              formData={formData}
              setFormData={setFormData}
              handleFormSubmit={handleFormSubmit}
              projects={projects}
              assignableMembers={assignableMembers}
              isSaving={isSaving}
              onCancel={isNew ? onClose : () => setIsEditing(false)}
              canAssignToOthers={canAssignToOthers}
              isNew={isNew}
              isProjectFixed={isProjectFixed}
            />
          ) : task ? (
            <TaskDetailView
              task={task}
              assignedMember={assignedMember}
              attachmentsForThisTask={attachmentsForThisTask}
              handleFileUpload={handleFileUpload}
              isUploading={isUploading}
              localComments={localComments}
              membersMap={membersMap}
              projectMembers={projectMembers}
              currentUser={currentUser}
              newComment={newComment}
              setNewComment={setNewComment}
              handleAddCommentSubmit={handleAddCommentSubmit}
              onDeleteItem={setItemToDelete}
              canDeleteTasks={canDeleteTasks}
              taskHours={taskHours}
              isThisTaskActive={isThisTaskActive}
              handleToggleTimer={handleToggleTimer}
            />
          ) : null}
        </div>
      </div>
      {itemToDelete && (
        <ConfirmationModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={confirmDeleteItem}
          title={`تأكيد حذف ${itemToDelete.type === "attachment" ? "المرفق" : "التعليق"}`}
          message={`هل أنت متأكد من رغبتك في حذف هذا ${itemToDelete.type === "attachment" ? "المرفق" : "التعليق"}؟ لا يمكن التراجع عن هذا الإجراء.`}
          isDestructive
        />
      )}
    </Card>
  );
};
