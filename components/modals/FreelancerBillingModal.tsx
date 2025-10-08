import React, { useState, useEffect, FormEvent } from 'react';
import { Project, FreelancerContract, BillingProposalFormData } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';

interface FreelancerBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proposal: BillingProposalFormData) => Promise<void>;
  project: Project;
}

type BillingType = 'fixed' | 'hourly' | 'per-task';

export const FreelancerBillingModal: React.FC<FreelancerBillingModalProps> = ({ isOpen, onClose, onSave, project }) => {
  const { currency } = useAppDataContext();
  const [isSaving, setIsSaving] = useState(false);
  const [billingType, setBillingType] = useState<BillingType>('hourly');
  const [amount, setAmount] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  useEffect(() => {
    if (project?.freelancerContract) {
      const { type, amount: contractAmount, hourlyRate: contractRate } = project.freelancerContract;
      setBillingType(type);
      setAmount(contractAmount?.toString() || '');
      setHourlyRate(contractRate?.toString() || '');
    } else {
      // Reset to default when opening for a new proposal
      setBillingType('hourly');
      setAmount('');
      setHourlyRate('');
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const proposal: BillingProposalFormData = { type: billingType };
        if (billingType === 'fixed') {
            proposal.amount = parseFloat(amount) || 0;
        } else if (billingType === 'hourly') {
            proposal.hourlyRate = parseFloat(hourlyRate) || 0;
        }
        await onSave(proposal);
        onClose();
    } catch (error) {
        console.error("Failed to save billing proposal", error);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800">اقتراح طريقة الدفع لمشروع: {project.name}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">اختر طريقة الدفع</label>
            <div className="flex space-x-4 rtl:space-x-reverse">
                <label className="flex items-center space-x-2 rtl:space-x-reverse">
                    <input type="radio" name="billingType" value="hourly" checked={billingType === 'hourly'} onChange={() => setBillingType('hourly')} className="h-4 w-4 text-sky-600 focus:ring-sky-500" />
                    <span>بالساعة</span>
                </label>
                 <label className="flex items-center space-x-2 rtl:space-x-reverse">
                    <input type="radio" name="billingType" value="fixed" checked={billingType === 'fixed'} onChange={() => setBillingType('fixed')} className="h-4 w-4 text-sky-600 focus:ring-sky-500" />
                    <span>مبلغ ثابت</span>
                </label>
                 <label className="flex items-center space-x-2 rtl:space-x-reverse">
                    <input type="radio" name="billingType" value="per-task" checked={billingType === 'per-task'} onChange={() => setBillingType('per-task')} className="h-4 w-4 text-sky-600 focus:ring-sky-500" />
                    <span>بالقطعة (لكل مهمة)</span>
                </label>
            </div>
          </div>
          
          {billingType === 'hourly' && (
             <div>
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-600 mb-1">سعر الساعة ({currency})</label>
                <input type="number" step="0.1" id="hourlyRate" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="مثال: 300" required />
             </div>
          )}

          {billingType === 'fixed' && (
             <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-600 mb-1">المبلغ الإجمالي للمشروع ({currency})</label>
                <input type="number" step="1" id="amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="مثال: 15000" required />
             </div>
          )}

          {billingType === 'per-task' && (
              <div className="p-3 bg-slate-100 rounded-md text-sm text-slate-600">
                  سيقوم المدير بتحديد تكلفة كل مهمة على حدة عند إسنادها لك.
              </div>
          )}
          
          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                {isSaving ? 'جارٍ الحفظ...' : 'إرسال للمراجعة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
