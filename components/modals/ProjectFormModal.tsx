import React, { useState, useEffect, FormEvent } from 'react';
import { Project, ProjectFormData, ProjectStatus, SuggestedTask } from '@shared/types';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from '@shared/contexts/ToastContext';
import { useTeamContext } from '@shared/contexts/TeamContext';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: ProjectFormData, projectToUpdate: Project | null, suggestedTasks?: SuggestedTask[]) => Promise<any>;
  project: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ isOpen, onClose, onSave, project }) => {
  const { currency } = useSettingsContext();
  const { addToast } = useToast();
  const { hasPermission } = useTeamContext();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'نشط',
    budgetHours: undefined,
    budgetAmount: undefined,
    deadline: '',
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
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'نشط',
        budgetHours: undefined,
        budgetAmount: undefined,
        deadline: '',
      });
    }
    setSuggestedTasks([]); // Reset suggestions when modal opens
  }, [project, isOpen]);

  if (!isOpen) return null;

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
            budgetHours: formData.budgetHours ? Number(formData.budgetHours) : undefined,
            budgetAmount: formData.budgetAmount ? Number(formData.budgetAmount) : undefined,
            deadline: formData.deadline || undefined,
        };
        await onSave(dataToSend, project);
        onClose(); // Close main modal only on success
    } catch (error) {
        console.error("Failed to save project", error);
    } finally {
        setIsSaving(false);
    }
  };


  const projectStatuses: ProjectStatus[] = ['نشط', 'مكتمل', 'معلق'];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[calc(var(--vh,1vh)*90)] flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100 flex-shrink-0">{project ? 'تعديل المشروع' : 'إضافة مشروع جديد'}</h2>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">اسم المشروع</label>
                <input type="text" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الوصف</label>
                <textarea id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الحالة</label>
                  <select id="status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                    {projectStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">التسليم</label>
                  <input type="date" id="deadline" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budgetHours" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">ميزانية الساعات</label>
                  <input type="number" id="budgetHours" value={formData.budgetHours || ''} onChange={e => setFormData({...formData, budgetHours: e.target.value ? Number(e.target.value) : undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
                </div>
                <div>
                  <label htmlFor="budgetAmount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الميزانية المالية ({currency})</label>
                  <input type="number" id="budgetAmount" value={formData.budgetAmount || ''} onChange={e => setFormData({...formData, budgetAmount: e.target.value ? Number(e.target.value) : undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4 mt-auto flex-shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title={project ? 'تأكيد تعديل المشروع' : 'تأكيد إضافة المشروع'}
        message={`هل أنت متأكد من رغبتك في حفظ ${project ? 'التعديلات على هذا' : 'هذا الـ'}مشروع؟`}
      />
    </>
  );
};