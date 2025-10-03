import React, { useState, useEffect, FormEvent } from 'react';
import { Project, ProjectStatus, ProjectFormData, SuggestedTask } from '../../types';
import { generateTaskPlan } from '../../services/geminiService';
import { SparklesIcon } from '../ui/Icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: ProjectFormData, tasksToAdd?: SuggestedTask[]) => Promise<void>;
  project: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ isOpen, onClose, onSave, project }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<ProjectFormData, 'budgetHours'> & { budgetHours: string }>({
    name: '',
    status: 'نشط',
    budgetHours: '',
    customStatusName: '',
    customStatusColor: '#f59e0b' // Default: amber-500
  });
  
  // AI Planner State
  const { addToast } = useToast();
  const [aiDescription, setAiDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        status: project.status,
        budgetHours: project.budgetHours?.toString() || '',
        customStatusName: project.customStatusName || '',
        customStatusColor: project.customStatusColor || '#f59e0b'
      });
      // Reset AI fields when editing
      setAiDescription('');
      setSuggestedTasks([]);
      setSelectedTasks(new Set());
    } else {
      // Reset all fields for new project
      setFormData({ name: '', status: 'نشط', budgetHours: '', customStatusName: '', customStatusColor: '#f59e0b' });
      setAiDescription('');
      setSuggestedTasks([]);
      setSelectedTasks(new Set());
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleGeneratePlan = async () => {
    if (!aiDescription.trim()) {
        addToast('يرجى إدخال وصف للمشروع أولاً', 'error');
        return;
    }
    setIsGenerating(true);
    setSuggestedTasks([]);
    try {
        const tasks = await generateTaskPlan(aiDescription);
        setSuggestedTasks(tasks);
        // Initially select all generated tasks
        setSelectedTasks(new Set(tasks.map((t: SuggestedTask) => t.title)));
    } catch (error: any) {
        addToast(error.message || 'فشل إنشاء الخطة', 'error');
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleTaskSelectionChange = (taskTitle: string) => {
    setSelectedTasks(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(taskTitle)) {
            newSelection.delete(taskTitle);
        } else {
            newSelection.add(taskTitle);
        }
        return newSelection;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const projectData: ProjectFormData = {
          name: formData.name,
          status: formData.status,
          budgetHours: formData.budgetHours ? parseInt(formData.budgetHours) : undefined,
          customStatusName: formData.status === 'custom' ? formData.customStatusName : undefined,
          customStatusColor: formData.status === 'custom' ? formData.customStatusColor : undefined,
        };
        const tasksToAdd = suggestedTasks.filter(t => selectedTasks.has(t.title));
        
        await onSave(projectData, tasksToAdd);
        onClose();
    } catch (error) {
        console.error("Failed to save project", error);
    } finally {
        setIsSaving(false);
    }
  };

  const renderRoleBadge = (role: string) => {
    const styles: { [key: string]: string } = {
        'employee': 'bg-blue-100 text-blue-800',
        'manager': 'bg-purple-100 text-purple-800',
        'freelancer': 'bg-indigo-100 text-indigo-800',
        'any': 'bg-slate-100 text-slate-800'
    };
    const roleText: { [key: string]: string } = {
        'employee': 'موظف', 'manager': 'مدير', 'freelancer': 'مستقل', 'any': 'أي دور'
    };
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[role]}`}>{roleText[role]}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800">{project ? 'تعديل المشروع' : 'إضافة مشروع جديد'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-1">اسم المشروع</label>
            <input type="text" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md text-sm" required />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-600 mb-1">الحالة</label>
            <select id="status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})} className="w-full p-2 border border-slate-300 rounded-md text-sm">
              <option value="نشط">نشط</option>
              <option value="مكتمل">مكتمل</option>
              <option value="معلق">معلق</option>
              <option value="custom">مخصص...</option>
            </select>
          </div>

          {formData.status === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-md border">
                 <div className="md:col-span-2">
                    <label htmlFor="customStatusName" className="block text-sm font-medium text-slate-600 mb-1">اسم الحالة المخصصة</label>
                    <input type="text" id="customStatusName" value={formData.customStatusName} onChange={e => setFormData({...formData, customStatusName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="مثال: تحت المراجعة" required />
                </div>
                <div>
                    <label htmlFor="customStatusColor" className="block text-sm font-medium text-slate-600 mb-1">اللون</label>
                    <input type="color" id="customStatusColor" value={formData.customStatusColor} onChange={e => setFormData({...formData, customStatusColor: e.target.value})} className="w-full h-10 p-1 border border-slate-300 rounded-md cursor-pointer" />
                </div>
            </div>
          )}

          <div>
            <label htmlFor="budgetHours" className="block text-sm font-medium text-slate-600 mb-1">ميزانية الساعات (اختياري)</label>
            <input type="number" id="budgetHours" value={formData.budgetHours} onChange={e => setFormData({...formData, budgetHours: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
          </div>

          {!project && (
             <div className="space-y-3 pt-4 border-t">
                 <h3 className="font-semibold text-slate-700 flex items-center space-x-2 rtl:space-x-reverse">
                    <SparklesIcon className="w-5 h-5 text-sky-500" />
                    <span>مساعد التخطيط الذكي (AI)</span>
                </h3>
                <p className="text-xs text-slate-500">صف هدف مشروعك، وسيقوم الذكاء الاصطناعي باقتراح قائمة مهام أولية لك.</p>
                <div>
                    <label htmlFor="aiDescription" className="block text-sm font-medium text-slate-600 mb-1">وصف المشروع</label>
                    <textarea 
                        id="aiDescription"
                        value={aiDescription}
                        onChange={e => setAiDescription(e.target.value)}
                        rows={3} 
                        className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        placeholder="مثال: إطلاق حملة تسويق على وسائل التواصل الاجتماعي لمنتج جديد..."
                    />
                </div>
                <button type="button" onClick={handleGeneratePlan} disabled={isGenerating} className="w-full flex justify-center items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200 disabled:bg-slate-200 disabled:text-slate-500">
                    {isGenerating ? <LoadingSpinner className="text-sky-700" /> : <SparklesIcon className="w-4 h-4" />}
                    <span>{isGenerating ? 'جارٍ إنشاء الخطة...' : 'إنشاء خطة مهام مقترحة'}</span>
                </button>

                {suggestedTasks.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                        <h4 className="text-sm font-semibold">المهام المقترحة (حدد ما تريد إضافته):</h4>
                        {suggestedTasks.map((task, index) => (
                             <label key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer">
                                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                    <input
                                        type="checkbox"
                                        checked={selectedTasks.has(task.title)}
                                        onChange={() => handleTaskSelectionChange(task.title)}
                                        className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    <span className="text-sm text-slate-700">{task.title}</span>
                                </div>
                                {renderRoleBadge(task.suggestedRole)}
                            </label>
                        ))}
                    </div>
                )}
             </div>
          )}
          
          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};