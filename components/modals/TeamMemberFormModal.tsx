import React, { useState, useEffect, FormEvent } from 'react';
import { TeamMember, TeamMemberFormData } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from './ConfirmationModal';
import { DAYS_OF_WEEK } from '../../constants';

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: TeamMemberFormData, isNew: boolean) => Promise<void>;
  member: TeamMember | null;
}

export const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({ isOpen, onClose, onSave, member }) => {
  const { teamMembers } = useAppDataContext();
  const { roles } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<TeamMemberFormData>({});

  const isNew = !member;

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: member?.name || '',
        email: member?.email || '',
        password: '',
        roleId: member?.roleId || 'employee',
        reportsTo: member?.reportsTo,
        avatarUrl: member?.avatarUrl || `https://i.pravatar.cc/150?u=${Math.random()}`,
        salary: member?.salary,
        hourlyRate: member?.hourlyRate,
        weeklyHoursRequirement: member?.weeklyHoursRequirement || 40,
        daysOff: member?.daysOff || [5, 6], // Default Friday, Saturday
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
      const dataToSave: TeamMemberFormData = { ...formData };
      if (isNew && !dataToSave.password) {
        // Handle error: password required for new users
        alert('كلمة المرور مطلوبة للعضو الجديد.');
        setIsSaving(false);
        return;
      }
      if (!isNew || !dataToSave.password) {
        delete dataToSave.password; // Don't send empty password
      }
      await onSave(dataToSave, isNew);
      onClose();
    } catch (error) {
      console.error("Failed to save member:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDaysOffChange = (dayIndex: number) => {
    const currentDaysOff = formData.daysOff || [];
    const newDaysOff = currentDaysOff.includes(dayIndex)
        ? currentDaysOff.filter(d => d !== dayIndex)
        : [...currentDaysOff, dayIndex];
    setFormData(prev => ({...prev, daysOff: newDaysOff }));
  }

  const isFreelancer = formData.roleId === 'freelancer';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{isNew ? 'إضافة عضو جديد' : 'تعديل بيانات العضو'}</h2>
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="الاسم" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
                <input type="email" placeholder="البريد الإلكتروني" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
            </div>
            {isNew && <div><input type="password" placeholder="كلمة المرور" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" /></div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={formData.roleId || ''} onChange={e => setFormData({...formData, roleId: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select value={formData.reportsTo || ''} onChange={e => setFormData({...formData, reportsTo: Number(e.target.value) || undefined})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                    <option value="">-- المدير المباشر --</option>
                    {teamMembers.filter(m => m.id !== member?.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {isFreelancer ? (
                    <input type="number" placeholder="سعر الساعة" value={formData.hourlyRate || ''} onChange={e => setFormData({...formData, hourlyRate: Number(e.target.value)})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
                 ) : (
                    <>
                    <input type="number" placeholder="الراتب الشهري" value={formData.salary || ''} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
                    <input type="number" placeholder="ساعات العمل الأسبوعية" value={formData.weeklyHoursRequirement || ''} onChange={e => setFormData({...formData, weeklyHoursRequirement: Number(e.target.value)})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
                    </>
                 )}
            </div>
            {!isFreelancer && (
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">أيام الإجازة الأسبوعية</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {DAYS_OF_WEEK.map((day, index) => (
                            <label key={day} className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                                <input type="checkbox" checked={formData.daysOff?.includes(index)} onChange={() => handleDaysOffChange(index)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/>
                                <span>{day}</span>
                            </label>
                        ))}
                    </div>
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
        title={isNew ? 'تأكيد إضافة عضو' : 'تأكيد تعديل البيانات'}
        message={`هل أنت متأكد من رغبتك في حفظ بيانات هذا العضو؟`}
      />
    </>
  );
};