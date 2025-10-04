import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { useToast } from '../../contexts/ToastContext';
import { UserIcon, LockClosedIcon } from '../ui/Icons';
import { TeamMember } from '../../types';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateCurrentUser, rolesMap } = useAuth();
  const { handleUpdateMember } = useAppDataContext();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    avatarUrl: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
      });
    }
  }, [currentUser]);

  const handleInfoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    
    const updatedMember: TeamMember = {
        ...currentUser,
        name: formData.name,
        avatarUrl: formData.avatarUrl
    };

    await handleUpdateMember(updatedMember);
    updateCurrentUser(updatedMember);
    addToast('تم تحديث الملف الشخصي بنجاح', 'success');
    setIsSaving(false);
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast('كلمة المرور الجديدة غير متطابقة', 'error');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      addToast('يجب أن تكون كلمة المرور 6 أحرف على الأقل', 'error');
      return;
    }
    setIsSavingPassword(true);
    // Simulate API call
    setTimeout(() => {
      addToast('تم تغيير كلمة المرور بنجاح (محاكاة)', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsSavingPassword(false);
    }, 1000);
  };
  
  const roleName = currentUser ? rolesMap[currentUser.roleId]?.name : '';

  if (!currentUser) {
    return null; // Or a loading state
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الملف الشخصي</h2>
        <p className="text-md text-slate-500 dark:text-slate-400">إدارة معلومات حسابك الشخصي.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex justify-center items-start">
            <Card className="w-full text-center p-6">
                <img src={formData.avatarUrl || currentUser.avatarUrl} alt="Avatar" className="w-32 h-32 rounded-full mx-auto mb-4 ring-4 ring-slate-200 dark:ring-slate-700 object-cover"/>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{formData.name || currentUser.name}</h3>
                <p className="text-slate-500 dark:text-slate-400">{roleName}</p>
            </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
            <Card title="المعلومات الشخصية" icon={<UserIcon className="w-5 h-5"/>}>
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم</label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="avatarUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رابط الصورة الرمزية</label>
                        <input
                            type="url"
                            id="avatarUrl"
                            value={formData.avatarUrl}
                            onChange={(e) => setFormData({...formData, avatarUrl: e.target.value})}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                            required
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                            {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>
                </form>
            </Card>

            <Card title="تغيير كلمة المرور" icon={<LockClosedIcon className="w-5 h-5"/>}>
                 <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الحالية</label>
                        <input
                            type="password"
                            id="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الجديدة</label>
                        <input
                            type="password"
                            id="newPassword"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تأكيد كلمة المرور الجديدة</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                            required
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={isSavingPassword} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                            {isSavingPassword ? 'جارٍ الحفظ...' : 'تغيير كلمة المرور'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
      </div>
    </div>
  );
};