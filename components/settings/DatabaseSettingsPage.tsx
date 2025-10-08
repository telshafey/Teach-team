import React, { useState, useEffect, FormEvent } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { DatabaseSettings } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { LockClosedIcon } from '../ui/Icons';
import { ConfirmationModal } from '../modals/ConfirmationModal';

export const DatabaseSettingsPage: React.FC = () => {
    const { siteSettings, handleUpdateSiteSettings } = useAppDataContext();
    const { addToast } = useToast();
    const [dbSettings, setDbSettings] = useState<DatabaseSettings>({
        supabaseUrl: '',
        supabaseAnonKey: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        if (siteSettings?.databaseSettings) {
            setDbSettings(siteSettings.databaseSettings);
        }
    }, [siteSettings]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsConfirmOpen(true);
    };
    
    const handleConfirmSave = async () => {
        if (!siteSettings) return;
        setIsConfirmOpen(false);
        setIsSaving(true);
        try {
            await handleUpdateSiteSettings({ ...siteSettings, databaseSettings: dbSettings });
            addToast('تم الحفظ بنجاح. يرجى إعادة تحميل الصفحة يدويًا لتفعيل الاتصال الجديد.', 'success');
        } catch (error) {
            console.error("Failed to update DB settings", error);
            addToast('فشل تحديث الإعدادات. يرجى المحاولة مرة أخرى.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <>
            <div className="space-y-6">
                <Card>
                    <form onSubmit={handleSubmit} className="p-4 space-y-6">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border-r-4 border-amber-400 rounded-md">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <LockClosedIcon className="h-5 w-5 text-amber-500" />
                                </div>
                                <div className="ml-3 rtl:ml-0 rtl:mr-3">
                                    <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">إعدادات حساسة</h3>
                                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                                        تغيير هذه الإعدادات سيؤثر على اتصال التطبيق بقاعدة البيانات. يرجى توخي الحذر الشديد.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="supabaseUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Supabase URL
                                </label>
                                <input
                                    type="text"
                                    id="supabaseUrl"
                                    name="supabaseUrl"
                                    value={dbSettings.supabaseUrl}
                                    onChange={(e) => setDbSettings(prev => ({...prev, supabaseUrl: e.target.value}))}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                                />
                            </div>
                            <div>
                                <label htmlFor="supabaseAnonKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Supabase Anon Key
                                </label>
                                <input
                                    type="text"
                                    id="supabaseAnonKey"
                                    name="supabaseAnonKey"
                                    value={dbSettings.supabaseAnonKey}
                                    onChange={(e) => setDbSettings(prev => ({...prev, supabaseAnonKey: e.target.value}))}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
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
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmSave}
                title="تأكيد حفظ الإعدادات"
                message="تغيير هذه الإعدادات يتطلب إعادة تحميل الصفحة لتطبيقها. هل تريد المتابعة؟"
                confirmText="نعم، احفظ"
            />
        </>
    );
};
