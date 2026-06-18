import React, { useState, FormEvent, useEffect } from "react";
import { OvertimeRequestFormData, Project } from "@shared/types";
import { ConfirmationModal } from "./ConfirmationModal";
import { startOfWeek, format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import * as api from "@shared/services/apiService";

interface OvertimeRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: OvertimeRequestFormData) => Promise<any>;
}

export const OvertimeRequestFormModal: React.FC<
  OvertimeRequestFormModalProps
> = ({ isOpen, onClose, onSave }) => {
  const { supabaseClient } = useSupabase();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects_list"],
    queryFn: () => api.getAll(supabaseClient!, "projects", "id, name"),
    enabled: !!supabaseClient && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const [formData, setFormData] = useState<OvertimeRequestFormData>({
    weekStartDate: "",
    requestedHours: 0,
    projectId: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 6 }); // Saturday
      setFormData({
        weekStartDate: format(startOfCurrentWeek, "yyyy-MM-dd"),
        requestedHours: 0,
        projectId: "",
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        requestedHours: Number(formData.requestedHours) || 0,
        projectId: formData.projectId || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Failed to submit overtime request", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
        dir="rtl"
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
            طلب ساعات إضافية
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="weekStartDate"
                  className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
                >
                  بداية الأسبوع
                </label>
                <input
                  type="date"
                  id="weekStartDate"
                  value={formData.weekStartDate}
                  onChange={(e) =>
                    setFormData({ ...formData, weekStartDate: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="requestedHours"
                  className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
                >
                  عدد الساعات المطلوبة
                </label>
                <input
                  type="number"
                  step="0.5"
                  id="requestedHours"
                  value={formData.requestedHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requestedHours: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="projectId"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                المشروع (اختياري)
              </label>
              <select
                id="projectId"
                value={formData.projectId}
                onChange={(e) =>
                  setFormData({ ...formData, projectId: e.target.value })
                }
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
              >
                <option value="">-- اختر مشروع --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
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
                className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400"
              >
                {isSaving ? "جارٍ الإرسال..." : "إرسال الطلب"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title="تأكيد طلب ساعات إضافية"
        message="هل أنت متأكد من رغبتك في تقديم هذا الطلب؟"
      />
    </>
  );
};
