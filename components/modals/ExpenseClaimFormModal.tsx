import React, { useState, FormEvent } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useAppDataContext } from '../../contexts/DataContext';

interface ExpenseClaimFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseClaimFormModal: React.FC<ExpenseClaimFormModalProps> = ({ isOpen, onClose }) => {
  const { handleSubmitExpenseClaim, currency } = useAppDataContext();
  const { addToast } = useToast();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await handleSubmitExpenseClaim({
        description,
        amount: parseFloat(amount) || 0
    });
    addToast('تم تقديم طلب الصرف بنجاح', 'success');
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800">تقديم طلب صرف جديد</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-600 mb-1">الوصف</label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full p-2 border border-slate-300 rounded-md text-sm"
              required
            ></textarea>
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-600 mb-1">المبلغ ({currency})</label>
            <input
              type="number"
              step="0.01"
              id="amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md text-sm"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
              {isSaving ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
