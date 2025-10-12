import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { ExpenseClaim, ExpenseClaimFormData } from '../../types';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { SparklesIcon } from '../ui/Icons';
import { fileToBase64 } from '../../utils/files';
import { scanReceipt } from '../../services/geminiService';


interface ExpenseClaimFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (claimData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
}

export const ExpenseClaimFormModal: React.FC<ExpenseClaimFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const { projects } = useProjectContext();
  const { currentUser, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    projectId: '',
  });
  
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        projectId: '',
      });
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };
  
  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      await onSave({
        teamMemberId: currentUser.id,
        amount: parseFloat(formData.amount) || 0,
        description: formData.description,
        date: formData.date,
        projectId: formData.projectId || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save expense claim", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 4 * 1024 * 1024) { // 4MB limit for Gemini API
              addToast('حجم الصورة كبير جدًا. الحد الأقصى 4 ميجابايت.', 'error');
              return;
          }
          setIsScanning(true);
          try {
              const base64String = await fileToBase64(file);
              const pureBase64 = base64String.split(',')[1];
              const result = await scanReceipt(pureBase64, file.type);
              setFormData(prev => ({
                  ...prev,
                  amount: result.amount.toString(),
                  description: result.description,
              }));
              addToast('تم تحليل الإيصال بنجاح!', 'success');
          } catch (error: any) {
              addToast(error.message, 'error');
          } finally {
              setIsScanning(false);
              if (e.target) e.target.value = ''; 
          }
      }
  };


  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">تقديم طلب صرف</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelected} 
                className="hidden" 
                accept="image/png, image/jpeg, image/webp" 
            />
            {hasPermission('use_ai_features') && (
                <button 
                    type="button" 
                    onClick={handleScanClick} 
                    disabled={isScanning}
                    className="w-full flex justify-center items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-slate-400"
                >
                    {isScanning ? <LoadingSpinner /> : <SparklesIcon className="w-5 h-5"/>}
                    <span>{isScanning ? 'جارٍ تحليل الإيصال...' : 'تحليل إيصال بالذكاء الاصطناعي'}</span>
                </button>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المبلغ</label>
                <input
                  type="number"
                  step="0.01"
                  id="amount"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">التاريخ</label>
                <input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="projectId" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                المشروع (اختياري)
              </label>
              <select
                id="projectId"
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
              >
                <option value="">غير مرتبط بمشروع</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الوصف</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                required
              ></textarea>
            </div>
            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                {isSaving ? 'جارٍ الإرسال...' : 'إرسال للمراجعة'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title="تأكيد تقديم الطلب"
        message="هل أنت متأكد من رغبتك في تقديم طلب الصرف هذا؟"
      />
    </>
  );
};