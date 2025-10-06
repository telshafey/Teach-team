import React, { useState, useEffect, FormEvent } from 'react';
import { TeamMember, TeamMemberFormData, RoleId } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: TeamMemberFormData, isNew: boolean) => Promise<void>;
  member: TeamMember | null;
}

export const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({ isOpen, onClose, onSave, member }) => {
  const { teamMembers } = useAppDataContext();
  const { roles } = useAuth();
  const { addToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: '',
    email: '',
    password: '',
    roleId: 'employee',
    reportsTo: undefined,
    avatarUrl: '',
    salary: undefined,
    hourlyRate: undefined
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const isNew = !member;

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email || '',
        password: '',
        roleId: member.roleId,
        reportsTo: member.reportsTo,
        avatarUrl: member.avatarUrl,
        salary: member.salary,
        hourlyRate: member.hourlyRate
      });
    } else {
      setFormData({
        name: '', email: '', password: '', roleId: 'employee',
        reportsTo: undefined, avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`, salary: undefined, hourlyRate: undefined
      });
    }
  }, [member, isOpen]);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };
  
  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
        await onSave(formData, isNew);
        onClose(); // Close on success
    } catch (error: any) {
        console.error("Failed to save team member", error);
        if (error.message.includes('duplicate key value violates unique constraint "team_members_email_key"')) {
          addToast('هذا البريد الإلكتروني مستخدم بالفعل.', 'error');
        } else {
          addToast('فشل حفظ بيانات العضو. يرجى المحاولة مرة أخرى.', 'error');
        }
    } finally {
        setIsSaving(false);
    }
  };


  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newRoleId = e.target.value as RoleId;
      setFormData(prev => ({
          ...prev,
          roleId: newRoleId,
          salary: newRoleId === 'freelancer' ? undefined : prev.salary,
          hourlyRate: newRoleId === 'freelancer' ? prev.hourlyRate : undefined,
      }));
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{isNew ? 'إضافة عضو جديد' : 'تعديل بيانات العضو'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm disabled:bg-slate-100 dark:disabled:bg-slate-700" required disabled={!isNew} />
              </div>
            </div>
            {isNew && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">كلمة المرور</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required={isNew} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">رابط الصورة الرمزية</label>
              <input type="text" value={formData.avatarUrl} onChange={e => setFormData({...formData, avatarUrl: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الدور</label>
                <select value={formData.roleId} onChange={handleRoleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المدير المباشر</label>
                <select value={formData.reportsTo || ''} onChange={e => setFormData({...formData, reportsTo: Number(e.target.value) || undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                  <option value="">لا يوجد</option>
                  {teamMembers.filter(m => m.id !== member?.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {formData.roleId !== 'freelancer' ? (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الراتب الشهري</label>
                <input type="number" value={formData.salary || ''} onChange={e => setFormData({...formData, salary: Number(e.target.value) || undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">سعر الساعة</label>
                <input type="number" value={formData.hourlyRate || ''} onChange={e => setFormData({...formData, hourlyRate: Number(e.target.value) || undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
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
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title={isNew ? 'تأكيد إضافة عضو' : 'تأكيد تعديل عضو'}
        message={`هل أنت متأكد من رغبتك في حفظ بيانات ${isNew ? 'هذا العضو الجديد' : 'التعديلات'}؟`}
      />
    </>
  );
};
