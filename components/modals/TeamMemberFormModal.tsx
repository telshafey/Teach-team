import React, { useState, FormEvent, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { TeamMember, TeamMemberFormData, EmploymentType } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: TeamMemberFormData, memberToUpdate: TeamMember | null) => Promise<void>;
  member: TeamMember | null;
}

export const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({ isOpen, onClose, onSave, member }) => {
  const { roles, teamMembers } = useTeamContext();
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: member?.name || '',
    email: member?.email || '',
    password: '',
    roleId: member?.roleId || '',
    reportsTo: member?.reportsTo || undefined,
    avatarUrl: member?.avatarUrl || `https://i.pravatar.cc/150?u=${Math.random()}`,
    employmentType: member?.employmentType || 'full-time',
    salary: member?.salary || undefined,
    hourlyRate: member?.hourlyRate || undefined,
    weeklyHoursRequirement: member?.weeklyHoursRequirement || undefined,
    daysOff: member?.daysOff || [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!member;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData, member);
      onClose();
    } catch (error) {
      console.error('Failed to save member:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const potentialManagers = useMemo(() => 
    teamMembers.filter(m => m.id !== member?.id), 
    [teamMembers, member]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'تعديل بيانات عضو' : 'إضافة عضو جديد'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>الاسم</label>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full p-2 mt-1 border rounded-md" />
          </div>
          <div>
            <label>البريد الإلكتروني</label>
            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required disabled={isEditing} className="w-full p-2 mt-1 border rounded-md disabled:bg-slate-100" />
          </div>
        </div>
        {!isEditing && (
          <div>
            <label>كلمة المرور</label>
            <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!isEditing} className="w-full p-2 mt-1 border rounded-md" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>الدور</label>
            <select value={formData.roleId} onChange={e => setFormData({ ...formData, roleId: e.target.value })} required className="w-full p-2 mt-1 border rounded-md">
              <option value="" disabled>-- اختر دور --</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label>المدير المباشر</label>
            <select value={formData.reportsTo || ''} onChange={e => setFormData({ ...formData, reportsTo: e.target.value ? Number(e.target.value) : undefined })} className="w-full p-2 mt-1 border rounded-md">
              <option value="">-- لا يوجد --</option>
              {potentialManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {/* Employment Info */}
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">معلومات التوظيف</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>نوع التوظيف</label>
              <select value={formData.employmentType} onChange={e => setFormData({ ...formData, employmentType: e.target.value as EmploymentType })} className="w-full p-2 mt-1 border rounded-md">
                <option value="full-time">دوام كامل</option>
                <option value="part-time">دوام جزئي</option>
                <option value="freelancer">مستقل</option>
              </select>
            </div>
            {formData.employmentType === 'freelancer' ? (
              <div>
                <label>سعر الساعة</label>
                <input type="number" value={formData.hourlyRate || ''} onChange={e => setFormData({ ...formData, hourlyRate: e.target.value ? Number(e.target.value) : undefined })} className="w-full p-2 mt-1 border rounded-md" />
              </div>
            ) : (
              <>
                <div>
                  <label>الراتب الشهري</label>
                  <input type="number" value={formData.salary || ''} onChange={e => setFormData({ ...formData, salary: e.target.value ? Number(e.target.value) : undefined })} className="w-full p-2 mt-1 border rounded-md" />
                </div>
                <div>
                  <label>ساعات العمل الأسبوعية</label>
                  <input type="number" value={formData.weeklyHoursRequirement || ''} onChange={e => setFormData({ ...formData, weeklyHoursRequirement: e.target.value ? Number(e.target.value) : undefined })} className="w-full p-2 mt-1 border rounded-md" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 hover:bg-slate-200">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
