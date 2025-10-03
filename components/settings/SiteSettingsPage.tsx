import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { useToast } from '../../contexts/ToastContext';
import { SiteSettings } from '../../types';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; }> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-[var(--theme-color-500)]' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-full' : ''}`}></div>
        </div>
    </label>
);

export const SiteSettingsPage: React.FC = () => {
    const { siteSettings, handleUpdateSiteSettings } = useAppDataContext();
    const { addToast } = useToast();
    const [formData, setFormData] = useState<SiteSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('branding');

    useEffect(() => {
        if (siteSettings) {
            setFormData(siteSettings);
        }
    }, [siteSettings]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (!formData) return;
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleToggleChange = (key: keyof SiteSettings, value: boolean) => {
        if (!formData) return;
        setFormData({ ...formData, [key]: value });
    };

    const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && formData) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setFormData({ ...formData, logoUrl: base64 });
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!formData) return;
        setIsSaving(true);
        await handleUpdateSiteSettings(formData);
        setIsSaving(false);
        addToast('تم حفظ الإعدادات بنجاح', 'success');
    };

    if (!formData) {
        return <p>جارٍ تحميل الإعدادات...</p>;
    }

    const renderBrandingTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="appName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        اسم التطبيق
                    </label>
                    <input
                        type="text"
                        id="appName"
                        name="appName"
                        value={formData.appName}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
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
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                        placeholder="e.g., SAR, USD"
                    />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        شعار التطبيق
                    </label>
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                        {formData.logoUrl && <img src={formData.logoUrl} alt="logo preview" className="h-12 w-auto bg-slate-200 dark:bg-slate-600 p-1 rounded-md" />}
                        <input
                            type="file"
                            id="logoUrl"
                            name="logoUrl"
                            accept="image/png, image/jpeg, image/svg+xml"
                            onChange={handleLogoChange}
                            className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--theme-color-100)] file:text-[var(--theme-color-700)] hover:file:bg-sky-200"
                        />
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
                        value={formData.themeColor}
                        onChange={handleInputChange}
                        className="w-full h-10 p-1 border border-slate-300 dark:border-slate-600 rounded-md cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
    
    const renderModulesTab = () => (
        <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
                يمكنك تفعيل أو إلغاء تفعيل الوحدات النمطية الرئيسية في التطبيق لإخفائها من القوائم لجميع المستخدمين.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSwitch label="وحدة المالية" checked={formData.isFinanceModuleEnabled} onChange={(c) => handleToggleChange('isFinanceModuleEnabled', c)} />
                <ToggleSwitch label="وحدة الاجتماعات" checked={formData.isMeetingsModuleEnabled} onChange={(c) => handleToggleChange('isMeetingsModuleEnabled', c)} />
                <ToggleSwitch label="وحدة التحليلات" checked={formData.isAnalyticsModuleEnabled} onChange={(c) => handleToggleChange('isAnalyticsModuleEnabled', c)} />
                <ToggleSwitch label="وحدة التقارير" checked={formData.isReportsModuleEnabled} onChange={(c) => handleToggleChange('isReportsModuleEnabled', c)} />
            </div>
        </div>
    );

    return (
        <Card>
            <form onSubmit={handleSubmit}>
                 <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                    <nav className="-mb-px flex space-x-6 rtl:space-x-reverse" aria-label="Tabs">
                        <button type="button" onClick={() => setActiveTab('branding')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'branding' ? 'border-[var(--theme-color-500)] text-[var(--theme-color-600)]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            الهوية البصرية
                        </button>
                        <button type="button" onClick={() => setActiveTab('modules')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'modules' ? 'border-[var(--theme-color-500)] text-[var(--theme-color-600)]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            الوحدات النمطية
                        </button>
                    </nav>
                </div>

                {activeTab === 'branding' && renderBrandingTab()}
                {activeTab === 'modules' && renderModulesTab()}

                <div className="flex justify-end pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 text-sm font-semibold text-white bg-[var(--theme-color-600)] rounded-md hover:bg-[var(--theme-color-700)] disabled:bg-slate-400"
                    >
                        {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </div>
            </form>
        </Card>
    );
};