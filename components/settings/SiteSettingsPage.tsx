import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { Card } from '../ui/Card';
import { SiteSettings } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { fileToBase64 } from '../../utils/files';

export const SiteSettingsPage: React.FC = () => {
    const { siteSettings, handleUpdateSiteSettings } = useSettingsContext();
    const { addToast } = useToast();
    const [settings, setSettings] = useState<SiteSettings | null>(siteSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        setSettings(siteSettings);
    }, [siteSettings]);

    if (!settings) {
        return <p>Loading settings...</p>;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => prev ? ({ ...prev, [name]: type === 'checkbox' ? checked : value }) : null);
    };
    
    const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                addToast('حجم الصورة كبير جدًا. الحد الأقصى 2 ميجابايت.', 'error');
                return;
            }
            try {
                const base64 = await fileToBase64(file);
                setSettings(prev => prev ? ({ ...prev, logoUrl: base64 }) : null);
            } catch (error) {
                console.error("Error converting file to base64", error);
                addToast('حدث خطأ أثناء معالجة الصورة.', 'error');
            }
        }
    };


    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        if (!settings) return;
        setIsConfirmOpen(false);
        setIsSaving(true);
        try {
            const settingsToSave = {
                ...settings,
                overtimeRateMultiplier: Number(settings.overtimeRateMultiplier) || 1.5,
                logEditingDaysLimit: Number(settings.logEditingDaysLimit) ?? 3,
            };
            await handleUpdateSiteSettings(settingsToSave);
            addToast('تم تحديث الإعدادات. قد تحتاج بعض التغييرات لإعادة تحميل الصفحة.', 'success');
        } catch (error) {
            // Error toast is already displayed by the context.
            // This catch block is just to ensure 'finally' runs correctly.
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="appName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                اسم التطبيق
                            </label>
                            <input
                                type="text"
                                id="appName"
                                name="appName"
                                value={settings.appName}
                                onChange={handleChange}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                الشعار (Logo)
                            </label>
                            <div className="flex items-center space-x-4 rtl:space-x-reverse">
                                <img src={settings.logoUrl} alt="Logo preview" className="h-12 w-12 rounded-md bg-slate-200 dark:bg-slate-600 object-contain p-1" />
                                <label htmlFor="logo-upload" className="cursor-pointer px-3 py-1.5 text-sm font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 rounded-md hover:bg-sky-200 dark:hover:bg-sky-800/50">
                                    <span>تغيير الشعار</span>
                                    <input id="logo-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} />
                                </label>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="themeColor" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                اللون الأساسي
                            </label>
                            <input
                                type="color"
                                id="themeColor"
                                name="themeColor"
                                value={settings.themeColor}
                                onChange={handleChange}
                                className="w-full h-10 p-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                            />
                        </div>
                         <div>
                            <label htmlFor="currency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                العملة
                            </label>
                            <input
                                type="text"
                                id="currency"
                                name="currency"
                                value={settings.currency}
                                onChange={handleChange}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                                placeholder="e.g., EGP"
                            />
                        </div>
                         <div>
                            <label htmlFor="overtimeRateMultiplier" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                معامل حساب الساعة الإضافية
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                id="overtimeRateMultiplier"
                                name="overtimeRateMultiplier"
                                value={settings.overtimeRateMultiplier || 1.5}
                                onChange={handleChange}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                            />
                             <p className="text-xs text-slate-500 mt-1">مثال: 1.5 يعني أن الساعة الإضافية تعادل ساعة ونصف من الأجر العادي.</p>
                        </div>
                        <div>
                            <label htmlFor="logEditingDaysLimit" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                أيام تعديل السجلات المسموح بها (الماضية)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                id="logEditingDaysLimit"
                                name="logEditingDaysLimit"
                                value={settings.logEditingDaysLimit ?? 3}
                                onChange={handleChange}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                            />
                             <p className="text-xs text-slate-500 mt-1">عدد الأيام الماضية التي يمكن للمستخدم تعديل سجلاته فيها (0 لليوم الحالي فقط).</p>
                        </div>
                    </div>
                    <div>
                         <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3 border-b pb-2">تفعيل الأقسام</h4>
                         <div className="space-y-3">
                            <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                 <input type="checkbox" name="isFinanceModuleEnabled" checked={settings.isFinanceModuleEnabled} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                                 <span className="text-sm text-slate-600 dark:text-slate-300">قسم المالية</span>
                            </label>
                            <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                 <input type="checkbox" name="isMeetingsModuleEnabled" checked={settings.isMeetingsModuleEnabled} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                                 <span className="text-sm text-slate-600 dark:text-slate-300">قسم الاجتماعات</span>
                            </label>
                             <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                 <input type="checkbox" name="isAnalyticsModuleEnabled" checked={settings.isAnalyticsModuleEnabled} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                                 <span className="text-sm text-slate-600 dark:text-slate-300">قسم التحليلات</span>
                            </label>
                             <label className="flex items-center space-x-3 rtl:space-x-reverse">
                                 <input type="checkbox" name="isReportsModuleEnabled" checked={settings.isReportsModuleEnabled} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                                 <span className="text-sm text-slate-600 dark:text-slate-300">قسم التقارير</span>
                            </label>
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

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmSave}
                title="تأكيد حفظ الإعدادات"
                message="هل أنت متأكد من رغبتك في حفظ التغييرات؟"
                confirmText="نعم، احفظ"
            />
        </>
    );
};
