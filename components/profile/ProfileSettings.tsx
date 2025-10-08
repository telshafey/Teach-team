import React, { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export const ProfileSettings: React.FC = () => {
    const { currentUser } = useAuth();
    const { supabaseClient } = useSupabase();
    const { addToast } = useToast();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    if (!currentUser) return null;

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast('كلمتا المرور الجديدتان غير متطابقتين.', 'error'); return;
        }
        if (!supabaseClient) return;

        setIsChangingPassword(true);
        try {
            // Re-authenticate to confirm current password. This is a security best practice.
            const { error: reauthError } = await supabaseClient.auth.reauthenticate();
            if(reauthError) throw new Error('فشل التحقق من الهوية. يرجى إعادة تسجيل الدخول والمحاولة مرة أخرى.');

            const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;
            
            addToast('تم تغيير كلمة المرور بنجاح.', 'success');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (error: any) {
             addToast(`فشل تغيير كلمة المرور: ${error.message}`, 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };
    
    return (
        <Card title="تغيير كلمة المرور">
            <form onSubmit={handlePasswordChange} className="space-y-4">
                 <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الحالية</label>
                    <input type="password" id="currentPassword" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                </div>
                <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الجديدة</label>
                    <input type="password" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تأكيد كلمة المرور الجديدة</label>
                    <input type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                </div>
                <div className="flex justify-end">
                    <button type="submit" disabled={isChangingPassword} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                        {isChangingPassword ? <LoadingSpinner /> : 'تغيير كلمة المرور'}
                    </button>
                </div>
            </form>
        </Card>
    );
};