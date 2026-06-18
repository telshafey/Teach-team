import React, { useState, useEffect, FormEvent, useMemo } from "react";
import { DailyLog, DailyLogFormData, Task, Project } from "@shared/types";
import { useToast } from "@shared/contexts/ToastContext";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import { useTeamContext } from "@shared/contexts/TeamContext";
import * as api from "@shared/services/apiService";

interface LogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logData: DailyLogFormData) => Promise<void>;
  log: DailyLog | null;
  date: string;
  memberId: number;
  initialData?: {
    hours: number;
    taskId?: string;
    projectId?: string;
  };
}

export const LogFormModal: React.FC<LogFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  log,
  date,
  memberId,
  initialData,
}) => {
  const { addToast } = useToast();
  const { supabaseClient } = useSupabase();
  const { teamMembers } = useTeamContext();

  const targetMember = useMemo(() => {
    return teamMembers.find((m) => m.id === memberId);
  }, [teamMembers, memberId]);

  const isFreelancer =
    targetMember?.roleId === "freelancer" ||
    targetMember?.employmentType === "freelancer";

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.getAll(supabaseClient!, "projects"),
    enabled: !!supabaseClient && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.getAll(supabaseClient!, "tasks"),
    enabled: !!supabaseClient && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    hours: "",
    description: "",
    projectId: "",
    taskId: "",
  });

  const groupedTasks = useMemo(() => {
    let allowedProjects = projects;
    let allowedTasks = tasks;

    if (isFreelancer && memberId) {
      // Freelancers only see tasks they are assigned to, or all tasks in projects they are assigned to (via contract)
      allowedProjects = projects.filter(
        (p) =>
          p.freelancerContract?.status === "approved" &&
          p.freelancerContract.freelancerId === memberId
      );
      
      const allowedProjectIds = new Set(allowedProjects.map((p) => p.id));
      
      allowedTasks = tasks.filter(
        (t) =>
          t.assignedTo === memberId ||
          (t.projectId && allowedProjectIds.has(t.projectId))
      );
    }

    const projectGroups: Record<string, { name: string; tasks: Task[] }> =
      allowedProjects.reduce(
        (acc, p) => {
          acc[p.id] = { name: p.name, tasks: [] };
          return acc;
        },
        {} as Record<string, { name: string; tasks: Task[] }>,
      );

    const generalTasks: Task[] = [];

    for (const task of allowedTasks) {
      if (task.projectId && projectGroups[task.projectId]) {
        projectGroups[task.projectId].tasks.push(task);
      } else if (!task.projectId && !isFreelancer) {
        generalTasks.push(task);
      }
    }

    return {
      projectGroups: Object.values(projectGroups).filter(
        (g) => g.tasks.length > 0,
      ),
      generalTasks,
    };
  }, [projects, tasks, isFreelancer, memberId]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        hours: initialData.hours.toFixed(2),
        description: "",
        projectId: initialData.projectId || "",
        taskId: initialData.taskId || "",
      });
    } else if (log) {
      setFormData({
        hours: log.hours.toString(),
        description: log.description,
        projectId: log.projectId || "",
        taskId: log.taskId || "",
      });
    } else {
      setFormData({ hours: "", description: "", projectId: "", taskId: "" });
    }
  }, [log, initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        hours: parseFloat(formData.hours) || 0,
        description: formData.description,
        projectId: formData.projectId || undefined,
        taskId: formData.taskId || undefined,
      });
      onClose();
    } catch (error: any) {
      console.error("Failed to save log:", error);
      addToast(
        error.message || "فشل حفظ السجل. يرجى المحاولة مرة أخرى.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTaskSelectionChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const selectedTaskId = e.target.value;
    if (!selectedTaskId) {
      setFormData({ ...formData, taskId: "", projectId: "" });
      return;
    }
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (task) {
      setFormData({
        ...formData,
        taskId: task.id,
        projectId: task.projectId || "",
      });
    }
  };

  const isFromTimer = !!initialData?.taskId;
  const isPunchOutLog = !!initialData && !initialData.taskId;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
          {log
            ? "تعديل السجل"
            : isPunchOutLog
              ? "تسجيل جلسة العمل"
              : `إضافة سجل ليوم ${date}`}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="hours"
              className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              عدد الساعات
            </label>
            <input
              type="number"
              step="0.1"
              id="hours"
              value={formData.hours}
              onChange={(e) =>
                setFormData({ ...formData, hours: e.target.value })
              }
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 read-only:bg-slate-100 dark:read-only:bg-slate-900 read-only:cursor-not-allowed"
              required
              readOnly={isFromTimer || isPunchOutLog}
            />
          </div>

          <div>
            <label
              htmlFor="task"
              className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              {isFreelancer ? "المهمة المُسندة إليك (مطلوب)" : "المهمة (اختياري)"}
            </label>
            <select
              id="task"
              value={formData.taskId}
              onChange={handleTaskSelectionChange}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isFromTimer}
              required={isFreelancer}
            >
              {!isFreelancer && (
                <option value="">-- عمل آخر / بدون مهمة --</option>
              )}
              {isFreelancer && (
                 <option value="" disabled>-- اختر مهمة مرتبطة بمشروع --</option>
              )}
              {!isFreelancer && groupedTasks.generalTasks.length > 0 && (
                <optgroup label="مهام عامة">
                  {groupedTasks.generalTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedTasks.projectGroups.map((group) => (
                <optgroup key={group.name} label={group.name}>
                  {group.tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
            >
              الوصف
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
              required
              placeholder={isPunchOutLog ? "ماذا أنجزت خلال هذه الجلسة؟" : ""}
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isSaving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
