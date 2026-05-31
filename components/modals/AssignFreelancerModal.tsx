import React, { useState, FormEvent, useMemo, useEffect } from 'react';
import { Project, TeamMember, FreelancerContract } from '@shared/types';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';

interface FreelancerContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contractData: Omit<FreelancerContract, 'status' | 'notes'>) => Promise<void>;
  project: Project;
}

type BillingType = 'fixed' | 'hourly' | 'per-task';

export const FreelancerContractModal: React.FC<FreelancerContractModalProps> = ({ isOpen, onClose, onSave, project }) => {
  const { teamMembers } = useTeamContext();
  const { currency } = useSettingsContext();
  const [isSaving, setIsSaving] = useState(false);
  
  const [freelancerId, setFreelancerId] = useState('');
  const [billingType, setBillingType] = useState<BillingType>('hourly');
  const [amount, setAmount] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const freelancers = useMemo(() => {
    return teamMembers.filter(m => m.roleId === 'freelancer');
  }, [teamMembers]);

  useEffect(() => {
    const contract = project.freelancerContract;
    if (contract) {
        setFreelancerId(contract.freelancerId.toString());
        setBillingType(contract.type as BillingType);
        setAmount(contract.amount?.toString() || '');
        setHourlyRate(contract.hourlyRate?.toString() || '');
    } else {
        setFreelancerId('');
        setBillingType('hourly');
        setAmount('');
        setHourlyRate('');
    }
  }, [project, isOpen]);

  useEffect(() => {
      if (billingType === 'hourly' && freelancerId) {
          const selectedFreelancer = teamMembers.find(m => m.id === parseInt(freelancerId));
          if (selectedFreelancer?.hourlyRate) {
              setHourlyRate(selectedFreelancer.hourlyRate.toString());
          }
      }
  }, [freelancerId, billingType, teamMembers]);
  

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!freelancerId) return;
    
    setIsSaving(true);
    try {
        const contractData: Omit<FreelancerContract, 'status' | 'notes'> = {
            freelancerId: parseInt(freelancerId),
            type: billingType,
            amount: billingType === 'fixed' ? parseFloat(amount) : undefined,
            hourlyRate: billingType === 'hourly' ? parseFloat(hourlyRate) : undefined,
        };
        await onSave(contractData);
        onClose();
    } catch (error) {
        console.error("Failed to save freelancer contract", error);
    } finally {
        setIsSaving(false);
    }
  };
  
  const isEditing = !!project.freelancerContract;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{isEditing ? 'تعديل عقد المستقل' : 'تعيين مستقل وعقد'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="freelancer-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              المستقل
            </label>
            <select
              id="freelancer-select"
              value={freelancerId}
              onChange={(e) => setFreelancerId(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
              required
              disabled={isEditing}
            >
              <option value="" disabled>-- اختر مستقل --</option>
              {freelancers.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          
           <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">نوع العقد</label>
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
                    <span>بالقطعة</span>
                </label>
            </div>
          </div>
          
          {billingType === 'hourly' && (
             <div>
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">سعر الساعة ({currency})</label>
                <input type="number" step="0.1" id="hourlyRate" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" placeholder="مثال: 150" required />
             </div>
          )}

          {billingType === 'fixed' && (
             <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المبلغ الإجمالي للمشروع ({currency})</label>
                <input type="number" step="1" id="amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" placeholder="مثال: 5000" required />
             </div>
          )}

          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
            <button type="submit" disabled={isSaving || !freelancerId} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ العقد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
