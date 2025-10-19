import React, { useState, FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { PenaltyFormData } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useTeamContext } from '../../contexts/TeamContext';

interface PenaltyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: PenaltyFormData) => Promise<void>;
}

export const PenaltyFormModal: React.FC<PenaltyFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const { teamMembers } = useTeamContext();
  const [formData, setFormData] = useState<PenaltyFormData>({
    teamMemberId: 0,
    amount: 0,
    reason: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.teamMemberId === 0) {
      alert("Please select a team member.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to issue penalty:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إصدار جزاء جديد">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="teamMemberId" className="block text-sm font-medium">الموظف</label>
          <select id="teamMemberId" value={formData.teamMemberId} onChange={e => setFormData({ ...formData, teamMemberId: Number(e.target.value) })} className="w-full p-2 mt-1 border rounded-md" required>
            <option value={0} disabled>-- اختر موظف --</option>
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium">المبلغ</label>
            <input type="number" id="amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium">تاريخ المخالفة</label>
            <input type="date" id="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium">السبب</label>
          <textarea id="reason" rows={3} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="w-full p-2 mt-1 border rounded-md" required />
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-slate-100">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">
            {isSaving ? <LoadingSpinner /> : 'إصدار الجزاء'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
