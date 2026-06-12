import React, { useState, useEffect, FormEvent } from "react";
import {
  Project,
  ProjectFormData,
  ProjectStatus,
  SuggestedTask,
} from "@shared/types";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ConfirmationModal } from "../modals/ConfirmationModal";
import { useToast } from "@shared/contexts/ToastContext";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { Card } from "../ui/Card";

interface ProjectFormProps {
  onCancel: () => void;
  onSave: (
    projectData: ProjectFormData,
    projectToUpdate: Project | null,
    suggestedTasks?: SuggestedTask[],
  ) => Promise<any>;
  project: Project | null;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  onCancel,
  onSave,
  project,
}) => {
  const { currency } = useSettingsContext();
  const { addToast } = useToast();
  const { hasPermission } = useTeamContext();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    status: "نشط",
    budgetHours: undefined,
    budgetAmount: undefined,
    deadline: "",
  });

  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        status: project.status,
        budgetHours: project.budgetHours,
        budgetAmount: project.budgetAmount,
        deadline: project.deadline ? project.deadline.split("T")[0] : "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        status: "نشط",
        budgetHours: undefined,
        budgetAmount: undefined,
        deadline: "",
      });
    }
  }, [project]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      const dataToSend = {
        ...formData,
        budgetHours: formData.budgetHours
          ? Number(formData.budgetHours)
          : undefined,
        budgetAmount: formData.budgetAmount
          ? Number(formData.budgetAmount)
          : undefined,
        deadline: formData.deadline || undefined,
      };
      await onSave(dataToSend, project);
      onCancel(); // Close main form only on success
    } catch (error) {
      console.error("Failed to save project", error);
    } finally {
      setIsSaving(false);
    }
  };

  const projectStatuses: ProjectStatus[] = ["نشط", "مكتمل", "معلق"];

  return (
    <>
      <Card title={project ? "تعديل المشروع" : "إضافة مشروع جديد"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                اسم المشروع
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                required
              />
            </div>
            <div className="md:col-span-2">
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
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                required
              ></textarea>
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                الحالة
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as ProjectStatus,
                  })
                }
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
              >
                {projectStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="deadline"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                التسليم
              </label>
              <input
                type="date"
                id="deadline"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="budgetHours"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                ميزانية الساعات
              </label>
              <input
                type="number"
                id="budgetHours"
                value={formData.budgetHours || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    budgetHours: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="budgetAmount"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                الميزانية المالية ({currency})
              </label>
              <input
                type="number"
                id="budgetAmount"
                value={formData.budgetAmount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    budgetAmount: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="flex justify-start space-x-3 rtl:space-x-reverse pt-6 mt-6 border-t dark:border-slate-800">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 shadow-sm disabled:bg-slate-400"
            >
              {isSaving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 text-sm font-semibold rounded-md border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-600 shadow-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Card>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title={project ? "تأكيد تعديل المشروع" : "تأكيد إضافة المشروع"}
        message={`هل أنت متأكد من رغبتك في حفظ ${project ? "التعديلات على هذا" : "هذا الـ"}مشروع؟`}
      />
    </>
  );
};
