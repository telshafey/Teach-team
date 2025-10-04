import React, { useState, useEffect, FormEvent } from 'react';
import { TeamMember, Role, TeamMemberFormData, RoleId } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { fileToBase64 } from '../../utils/files';

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: TeamMemberFormData) => Promise<void>;
  member: TeamMember | null;
}

export const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({ isOpen, onClose, onSave, member }) => {
  const { roles, teamMembers } = useAppDataContext();
  const { addToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<TeamMemberFormData, 'roleId'> & { roleId: RoleId | '' }>({
    name: '',
    roleId: '',
    reportsTo: undefined,
    avatarUrl: '',
    salary: undefined,
    hourlyRate: undefined
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        roleId: member.roleId,
        reportsTo: member.reportsTo || undefined,
        avatarUrl: member.avatarUrl,
        salary: member.salary || undefined,
        hourlyRate: member.hourlyRate || undefined
      });
    } else {
      setFormData({
        name: '',
        roleId: '',
        reportsTo: undefined,
        avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
        salary: undefined,
        hourlyRate: undefined
      });
    }
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            addToast('حجم الصورة كبير جدًا. الحد الأقصى 2 ميجابايت.', 'error');
            return;
        }
        try {
            const base64 = await fileToBase64(file);
            setFormData(prev => ({ ...prev, avatarUrl: base64 }));
        } catch (error) {
            console.error("Error converting file to base64", error);
            addToast('حدث خطأ أثناء معالجة الصورة.', 'error');
        }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if(!formData.roleId) return;
    
    setIsSaving(true);
    try {
        await onSave({
            ...formData,
            roleId: formData.roleId
        });
        onClose();
    } catch (error) {
        console.error("Failed to save member", error);
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
  };

  const managers = teamMembers.filter(m => m.roleId === 'manager' || m.roleId === 'gm');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{member ? 'تعديل عضو' : 'إضافة عضو جديد'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم</label>
            <input type="text" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="roleId" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الدور</label>
              <select id="roleId" value={formData.roleId} onChange={handleRoleChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required>
                <option value="" disabled>اختر دورًا</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="reportsTo" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المدير المباشر</label>
              <select id="reportsTo" value={formData.reportsTo || ''} onChange={e => setFormData({...formData, reportsTo: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                <option value="">لا يوجد</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          {formData.roleId === 'freelancer' ? (
              <div>
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">سعر الساعة الافتراضي</label>
                <input type="number" id="hourlyRate" value={formData.hourlyRate || ''} onChange={e => setFormData({...formData, hourlyRate: parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">هذا هو السعر الافتراضي. يمكن تخصيصه لكل مشروع على حدة.</p>
              </div>
          ) : (
             <div>
                <label htmlFor="salary" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الراتب</label>
                <input type="number" id="salary" value={formData.salary || ''} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
              </div>
          )}
           <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الصورة الرمزية</label>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <img src={formData.avatarUrl} alt="Avatar Preview" className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-600 object-cover" />
                <label htmlFor="avatar-upload-modal" className="cursor-pointer px-3 py-1.5 text-sm font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 rounded-md hover:bg-sky-200 dark:hover:bg-sky-800/50">
                    <span>تغيير الصورة</span>
                    <input id="avatar-upload-modal" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleAvatarChange} />
                </label>
            </div>
          </div>
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