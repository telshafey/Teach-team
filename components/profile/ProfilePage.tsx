import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';
import { fileToBase64 } from '../../utils/files';
import { ChangeEvent } from 'react';

export const ProfilePage: React.FC = () => {
    const { currentUser, updateCurrentUser, rolesMap } = useAuth();
    const { tasks } = useProjectContext();
    const { addToast } = useToast();

    const [name, setName] = useState(currentUser?.name || '');
    const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name);
            setAvatarUrl(currentUser.avatarUrl);
        }
    }, [currentUser]);

    const userTasks = useMemo(() => {
        if (!currentUser) return [];
        return tasks.filter(t => t.assignedTo === currentUser.id);
    }, [tasks, currentUser]);
    
    const completedTasks = useMemo(() => {
        return userTasks.filter(t => t.status === 'done').length;
    }, [userTasks]);


    if (!currentUser) {
        return <p>Loading...</p>;
    }

    const role = rolesMap[currentUser.roleId];

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateCurrentUser({
                name,
                avatarUrl
            });
            addToast('تم تحديث الملف الشخصي بنجاح', 'success');
        } catch (error) {
            console.error("Failed to update profile:", error);
            addToast('فشل تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                addToast('حجم الصورة كبير جدًا. الحد الأقصى 2 ميجابايت.', 'error');
                return;
            }
            try {
                const base64 = await fileToBase64(file);
                setAvatarUrl(base64);
            } catch (error) {
                console.error("Error converting file to base64", error);
                addToast('حدث خطأ أثناء معالجة الصورة.', 'error');
            }
        }
    };

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الملف الشخصي</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">إدارة معلومات حسابك.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <div className="flex flex-col items-center text-center">
                            <img src={avatarUrl} alt={name} className="w-24 h-24 rounded-full mb-4 ring-2 ring-offset-2 ring-sky-500 object-cover" />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{name}</h3>
                            <p className="text-md text-slate-500 dark:text-slate-400">{role?.name}</p>
                        </div>
                    </Card>
                    <Card title="إحصائياتي">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-300">إجمالي المهام المسندة:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{userTasks.length}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-300">المهام المكتملة:</span>
                                <span className="font-semibold text-green-600 dark:text-green-400">{completedTasks}</span>
                            </div>
                        </div>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card title="تعديل المعلومات الشخصية">
                        <form onSubmit={handleSubmit} className="space-y-6">
                             <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    الاسم
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    الصورة الرمزية
                                </label>
                                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                                    <img src={avatarUrl} alt="Avatar preview" className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-600 object-cover" />
                                    <label htmlFor="avatar-upload" className="cursor-pointer px-3 py-1.5 text-sm font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 rounded-md hover:bg-sky-200 dark:hover:bg-sky-800/50">
                                        <span>تغيير الصورة</span>
                                        <input id="avatar-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleAvatarChange} />
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400"
                                >
                                    {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
};