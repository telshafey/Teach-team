import React, { useState, useEffect, FormEvent } from 'react';
import { Project, ProjectFormData, SuggestedTask } from '../../types';
import { generateTaskPlan } from '../../services/geminiService';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { SparklesIcon } from '../ui/Icons';
import { useAppDataContext } from '../../contexts/DataContext';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: ProjectFormData, tasksToAdd?: SuggestedTask[]) => Promise<void>;
  project: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ isOpen, onClose, onSave, project }) => {
  const { currency } = useAppDataContext();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    // FIX: Widen the type of status to allow for other values from the dropdown. This resolves the type error on line 35.
    status: 'نشط' as 'نشط' | 'مكتمل' | 'معلق',
    budgetHours: '',
    budgetAmount: '',
    deadline: '',
  });
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [taskGenError, setTaskGenError] = useState('');

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        status: project.status === 'custom' ? 'نشط' : project.status, // Simplify for form
        budgetHours: project.budgetHours?.toString() || '',
        budgetAmount: project.budgetAmount?.toString() || '',
        deadline: project.deadline || '',
      });
    } else {
      setFormData({ name: '', description: '', status: 'نشط', budgetHours: '', budgetAmount: '', deadline: '' });
    }
    setSuggestedTasks([]);
    setTaskGenError('');
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleGenerateTasks = async () => {
      if (!formData.description.trim()) {
          setTaskGenError("يرجى إدخال وصف للمشروع أولاً.");
          return;
      }
      setIsGeneratingTasks(true);
      setTaskGenError('');
      try {
          const tasks = await generateTaskPlan(formData.description);
          setSuggestedTasks(tasks);
      } catch (error) {
          console.error(error);
          setTaskGenError("حدث خطأ أثناء اقتراح المهام. يرجى المحاولة مرة أخرى.");
      } finally {
          setIsGeneratingTasks(false);
      }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      name: formData.name,
      description: formData.description,
      status: formData.status,
      budgetHours: formData.budgetHours ? parseFloat(formData.budgetHours) : undefined,
      budgetAmount: formData.budgetAmount ? parseFloat(formData.budgetAmount) : undefined,
      deadline: formData.deadline || undefined,
    }, suggestedTasks);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{project ? 'تعديل المشروع' : 'إضافة مشروع جديد'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">اسم المشروع</label>
            <input type="text" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">وصف المشروع</label>
            <textarea id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"></textarea>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الحالة</label>
              <select id="status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'نشط' | 'مكتمل' | 'معلق'})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                <option value="نشط">نشط</option>
                <option value="مكتمل">مكتمل</option>
                <option value="معلق">معلق</option>
              </select>
            </div>
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الموعد النهائي</label>
              <input type="date" id="deadline" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="budgetHours" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">ميزانية الساعات</label>
                <input type="number" id="budgetHours" value={formData.budgetHours} onChange={e => setFormData({...formData, budgetHours: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
              </div>
              <div>
                <label htmlFor="budgetAmount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الميزانية المالية ({currency})</label>
                <input type="number" id="budgetAmount" value={formData.budgetAmount} onChange={e => setFormData({...formData, budgetAmount: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
              </div>
          </div>
          {!project && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                    <h4 className="text-md font-semibold text-slate-700 dark:text-slate-200">خطة المهام المقترحة (AI)</h4>
                    <button type="button" onClick={handleGenerateTasks} disabled={isGeneratingTasks} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-slate-400">
                        {isGeneratingTasks ? <LoadingSpinner /> : <SparklesIcon className="w-4 h-4" />}
                        <span>{suggestedTasks.length > 0 ? 'إعادة إنشاء الخطة' : 'إنشاء خطة'}</span>
                    </button>
                </div>
                {taskGenError && <p className="text-xs text-red-500 mt-2">{taskGenError}</p>}
                {suggestedTasks.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md max-h-40 overflow-y-auto">
                       <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">سيتم إضافة هذه المهام للمشروع عند الحفظ.</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-800 dark:text-slate-200">
                            {suggestedTasks.map((task, i) => <li key={i}>{task.title}</li>)}
                        </ul>
                    </div>
                )}
            </div>
          )}

          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};