import React, { useState, useEffect, FormEvent } from 'react';
import { TeamMember, TeamMemberFormData, RoleId } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: TeamMemberFormData) => Promise<void>;
  member: TeamMember | null;
}

export const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({ isOpen, onClose, onSave, member }) => {
  const { roles, teamMembers } = useAppDataContext();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: '',
    roleId: 'employee',
    reportsTo: undefined,
    salary: undefined,
    hourlyRate: undefined,
    avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        roleId: member.roleId,
        reportsTo: member.reportsTo,
        salary: member.salary,
        hourlyRate: member.hourlyRate,
        avatarUrl: member.avatarUrl,
      });
    } else {
      setFormData({
        name: '',
        roleId: 'employee',
        reportsTo: undefined,
        salary: undefined,
        hourlyRate: undefined,
        avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`
      });
    }
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };
  
  const isFreelancer = formData.roleId === 'freelancer';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{member ? 'تعديل عضو' : 'إضافة عضو جديد'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-1">الاسم</label>
            <input type="text" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="roleId" className="block text-sm font-medium text-slate-600 mb-1">الدور</label>
              <select id="roleId" value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value as RoleId})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="reportsTo" className="block text-sm font-medium text-slate-600 mb-1">المدير المباشر</label>
              <select id="reportsTo" value={formData.reportsTo || ''} onChange={e => setFormData({...formData, reportsTo: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                <option value="">لا يوجد</option>
                {teamMembers.filter(m => m.id !== member?.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          
          {isFreelancer ? (
            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-600 mb-1">سعر الساعة</label>
              <input type="number" id="hourlyRate" value={formData.hourlyRate || ''} onChange={e => setFormData({...formData, hourlyRate: e.target.value ? parseFloat(e.target.value) : undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
            </div>
          ) : (
            <div>
              <label htmlFor="salary" className="block text-sm font-medium text-slate-600 mb-1">الراتب</label>
              <input type="number" id="salary" value={formData.salary || ''} onChange={e => setFormData({...formData, salary: e.target.value ? parseFloat(e.target.value) : undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
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
