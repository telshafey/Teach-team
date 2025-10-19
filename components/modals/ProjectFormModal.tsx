import React, { useState, FormEvent, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Project, ProjectFormData, ProjectStatus, SuggestedTask } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { SparklesIcon } from '../ui/Icons';
import { generateTaskPlan } from '../../services/geminiService';
import { useTeamContext } from '../../contexts/TeamContext';
import { useToast } from '../../contexts/ToastContext';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: ProjectFormData, projectToUpdate: Project | null, suggestedTasks?: SuggestedTask[]) => Promise<void>;
  project: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ isOpen, onClose, onSave, project }) => {
  const { hasPermission } = useTeamContext();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<ProjectFormData>({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'نشط',
    budgetHours: project?.budgetHours,
    budgetAmount: project?.budgetAmount,
    deadline: project?.deadline ? project.deadline.split('T')[0] : '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const isEditing = !!project;

  const handleGenerateTasks = async () => {
    if (!formData.description) {
      addToast('يرجى إدخال وصف للمشروع أولاً.', 'info');
      return;
    }
    setIsGenerating(true);
    try {
      const tasks = await generateTaskPlan(formData.description);
      setSuggestedTasks(tasks);
      addToast(`تم اقتراح ${tasks.length} مهمة.`, 'success');
    } catch (error: any) {
      console.error("Failed to generate task plan:", error);
      addToast(error.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData, project, suggestedTasks);
      onClose();
    } catch (error) {
      console.error('Failed to save project:', error);
      // The context will show a toast on error
    } finally {
      setIsSaving(false);
    }
  };
  
  const canUseAI = hasPermission('use_ai_features');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'تعديل مشروع' : 'إضافة مشروع جديد'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">اسم المشروع</label>
          <input type="text" id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md" required />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">الوصف</label>
          <textarea id="description" rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">الحالة</label>
            <select id="status" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as ProjectStatus })} className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md">
              <option value="نشط">نشط</option>
              <option value="مكتمل">مكتمل</option>
              <option value="معلق">معلق</option>
            </select>
          </div>
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-slate-700 dark:text-slate-300">تاريخ التسليم</label>
            <input type="date" id="deadline" value={formData.deadline || ''} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="budgetHours" className="block text-sm font-medium text-slate-700 dark:text-slate-300">ميزانية الساعات</label>
            <input type="number" id="budgetHours" value={formData.budgetHours || ''} onChange={e => setFormData({ ...formData, budgetHours: e.target.value ? Number(e.target.value) : undefined })} className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md" />
          </div>
          <div>
            <label htmlFor="budgetAmount" className="block text-sm font-medium text-slate-700 dark:text-slate-300">الميزانية المالية</label>
            <input type="number" id="budgetAmount" value={formData.budgetAmount || ''} onChange={e => setFormData({ ...formData, budgetAmount: e.target.value ? Number(e.target.value) : undefined })} className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md" />
          </div>
        </div>

        {!isEditing && canUseAI && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-md font-semibold mb-2 flex items-center text-slate-800 dark:text-slate-200"><SparklesIcon className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2 text-indigo-500" /> اقتراح خطة مهام (AI)</h3>
            <button type="button" onClick={handleGenerateTasks} disabled={isGenerating || !formData.description} className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-slate-400">
              {isGenerating ? <LoadingSpinner /> : 'إنشاء الخطة'}
            </button>
            {suggestedTasks.length > 0 && (
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-md space-y-2 max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">سيتم إنشاء المهام التالية عند حفظ المشروع:</p>
                {suggestedTasks.map((task, index) => <p key={index} className="text-sm text-slate-800 dark:text-slate-200">- {task.title}</p>)}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
