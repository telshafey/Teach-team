import React, { useState, FormEvent, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { ExpenseClaim, ExpenseClaimFormData } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { scanReceipt } from '../../services/geminiService';
import { fileToBase64 } from '../../utils/files';
import { useToast } from '../../contexts/ToastContext';
import { SparklesIcon, ArrowUpTrayIcon } from '../ui/Icons';

interface ExpenseClaimFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: Omit<ExpenseClaim, 'id' | 'status'>) => Promise<void>;
}

export const ExpenseClaimFormModal: React.FC<ExpenseClaimFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const { projects } = useProjectContext();
  const { currentUser } = useAuth();
  const { currency } = useSettingsContext();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ExpenseClaimFormData>({
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    projectId: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        teamMemberId: currentUser.id,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save expense claim:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReceiptScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const base64String = await fileToBase64(file);
      const base64Data = base64String.split(',')[1];
      const result = await scanReceipt(base64Data, file.type);
      setFormData(prev => ({
        ...prev,
        amount: result.amount,
        description: prev.description ? `${prev.description} - ${result.description}` : result.description,
      }));
      addToast('تم تحليل الإيصال بنجاح.', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تقديم طلب صرف">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-sky-50 dark:bg-sky-900/30 border-l-4 rtl:border-l-0 rtl:border-r-4 border-sky-500 rounded-md">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-3 py-2 text-sm font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200 dark:bg-sky-800/50 dark:text-sky-200 dark:hover:bg-sky-800">
            {isScanning ? <LoadingSpinner /> : <SparklesIcon className="w-5 h-5" />}
            <span>{isScanning ? 'جارٍ تحليل الإيصال...' : 'مسح إيصال ضوئيًا (AI)'}</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleReceiptScan} className="hidden" accept="image/*" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium">المبلغ ({currency})</label>
            <input type="number" id="amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium">التاريخ</label>
            <input type="date" id="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
        </div>
        <div>
          <label htmlFor="project" className="block text-sm font-medium">المشروع (اختياري)</label>
          <select id="project" value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="w-full p-2 mt-1 border rounded-md">
            <option value="">-- لا يوجد --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium">الوصف</label>
          <textarea id="description" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 mt-1 border rounded-md" required />
        </div>

        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 hover:bg-slate-200">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'إرسال الطلب'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
