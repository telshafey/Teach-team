import React, { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { Card } from '../ui/Card';
import { SiteSettings, MeetingSettings } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { useSupabase } from '../../contexts/SupabaseContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ArrowUpTrayIcon } from '../ui/Icons';

type Tab = 'general' | 'system' | 'modules' | 'meetings';

export const SiteSettingsPage: React.FC = () => {
    const { siteSettings, handleUpdateSiteSettings } = useSettingsContext();
    const { supabaseClient } = useSupabase();
    const { addToast } = useToast();
    
    const [settings, setSettings] = useState<Partial<SiteSettings>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (siteSettings) {
            setSettings(siteSettings);
        }
    }, [siteSettings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value === '' ? undefined : Number(value),
        }));
    };
    
    const handleMeetingSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            meetingSettings: {
                ...(prev.meetingSettings as MeetingSettings),
                [name]: type === 'checkbox' ? checked : value,
            }
        }));
    };
    
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!supabaseClient) return;
        
        if (e.target.files && e.target.files[0]) {
            setIsUploadingLogo(true);
            const file = e.target.files[0];
            
            try {
                // Use a static name to overwrite the existing logo. Cache is busted with a timestamp.
                const filePath = `public/logo`;
                const { error } = await supabaseClient.storage
                    .from('site_assets')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true,
                    });

                if (error) throw error;

                const { data } = supabaseClient.storage.from('site_assets').getPublicUrl(filePath);
                
                // Bust cache by adding a timestamp
                const publicUrlWithCacheBust = `${data.publicUrl}?t=${new Date().getTime()}`;
                
                setSettings(prev => ({ ...prev, logoUrl: publicUrlWithCacheBust }));
                addToast('تم رفع الشعار بنجاح. اضغط "حفظ" لتطبيق التغيير.', 'success');

            } catch (error: any) {
                console.error("Error uploading logo:", error);
                addToast(`فشل رفع الشعار: ${error.message}`, 'error');
            } finally {
                setIsUploadingLogo(false);
                if (e.target) e.target.value = '';
            }
        }
    };


    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        setIsSaving(true);
        try {
            await handleUpdateSiteSettings(settings as SiteSettings);
            // The context already optimistically updates and handles persistence.
            addToast('تم حفظ الإعدادات بنجاح.', 'success');
        } catch (error: any) {
            console.error("Failed to update site settings", error);
            addToast(error.message || 'فشل حفظ الإعدادات. يرجى المحاولة مرة أخرى.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const tabs = useMemo(() => [
        { id: 'general', label: 'عام' },
        { id: 'system', label: 'النظام' },
        { id: 'modules', label: 'إدارة الأقسام' },
        { id: 'meetings', label: 'الاجتماعات', show: settings.isMeetingsModuleEnabled },
    ].filter(tab => tab.show !== false), [settings.isMeetingsModuleEnabled]);

    return (
        <>
            <form onSubmit={handleSubmit}>
                <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`px-4 py-2 text-sm font-medium ${activeTab === tab.id ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <Card>
                    <div className="p-4 space-y-6">
                        {activeTab === 'general' && (
                             <div className="space-y-6">
                                <div>
                                    <label htmlFor="appName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">اسم التطبيق</label>
                                    <input type="text" id="appName" name="appName" value={settings.appName || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">الشعار</label>
                                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                                        {settings.logoUrl && <img src={settings.logoUrl} alt="Logo preview" className="h-12 w-12 object-contain rounded-md bg-slate-100 dark:bg-slate-700 p-1" />}
                                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/png, image/jpeg, image/svg+xml" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingLogo} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200 disabled:bg-slate-200">
                                            {isUploadingLogo ? <LoadingSpinner className="text-sky-600" /> : <ArrowUpTrayIcon className="w-4 h-4" />}
                                            <span>{isUploadingLogo ? 'جارٍ الرفع...' : 'تغيير الشعار'}</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">ملاحظة: يتطلب رفع الملفات إعداد مخزن (bucket) باسم `site_assets` في Supabase.</p>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'system' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="currency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">العملة</label>
                                    <input type="text" id="currency" name="currency" value={settings.currency || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md" placeholder="e.g., EGP" />
                                </div>
                                <div>
                                    <label htmlFor="overtimeRateMultiplier" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">مضاعف سعر الساعة الإضافية</label>
                                    <input type="number" step="0.1" id="overtimeRateMultiplier" name="overtimeRateMultiplier" value={settings.overtimeRateMultiplier || ''} onChange={handleNumberChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md" />
                                </div>
                                <div>
                                    <label htmlFor="logEditingDaysLimit" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">حد أيام تعديل السجلات</label>
                                    <input type="number" id="logEditingDaysLimit" name="logEditingDaysLimit" value={settings.logEditingDaysLimit || ''} onChange={handleNumberChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'modules' && (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                 <label className="flex items-center space-x-2 rtl:space-x-reverse"><input type="checkbox" name="isFinanceModuleEnabled" checked={settings.isFinanceModuleEnabled || false} onChange={handleInputChange} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" /> <span>المالية</span></label>
                                 <label className="flex items-center space-x-2 rtl:space-x-reverse"><input type="checkbox" name="isMeetingsModuleEnabled" checked={settings.isMeetingsModuleEnabled || false} onChange={handleInputChange} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" /> <span>الاجتماعات</span></label>
                                 <label className="flex items-center space-x-2 rtl:space-x-reverse"><input type="checkbox" name="isAnalyticsModuleEnabled" checked={settings.isAnalyticsModuleEnabled || false} onChange={handleInputChange} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" /> <span>التحليلات</span></label>
                                 <label className="flex items-center space-x-2 rtl:space-x-reverse"><input type="checkbox" name="isReportsModuleEnabled" checked={settings.isReportsModuleEnabled || false} onChange={handleInputChange} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" /> <span>التقارير</span></label>
                             </div>
                        )}

                        {activeTab === 'meetings' && siteSettings?.isMeetingsModuleEnabled && (
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="defaultMeetingRoom" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم غرفة الاجتماعات الافتراضية</label>
                                    <input type="text" id="defaultMeetingRoom" name="defaultMeetingRoom" value={settings.meetingSettings?.defaultMeetingRoom || ''} onChange={handleMeetingSettingsChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md" />
                                </div>
                                <div>
                                    <label htmlFor="wherebyHostRoomKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مفتاح غرفة المضيف (Host Room Key)</label>
                                    <input type="password" id="wherebyHostRoomKey" name="wherebyHostRoomKey" value={settings.meetingSettings?.wherebyHostRoomKey || ''} onChange={handleMeetingSettingsChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center space-x-2 rtl:space-x-reverse"><input type="checkbox" name="startWithAudioMuted" checked={settings.meetingSettings?.startWithAudioMuted || false} onChange={handleMeetingSettingsChange} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" /> <span>بدء الاجتماع مع كتم صوت المشاركين</span></label>
                                    <label className="flex items-center space-x-2 rtl:space-x-reverse"><input type="checkbox" name="startWithVideoMuted" checked={settings.meetingSettings?.startWithVideoMuted || false} onChange={handleMeetingSettingsChange} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" /> <span>بدء الاجتماع مع إيقاف كاميرا المشاركين</span></label>
                                    <label className="flex items-center space-x-2 rtl:space-x-reverse"><input type="checkbox" name="hideChat" checked={settings.meetingSettings?.hideChat || false} onChange={handleMeetingSettingsChange} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" /> <span>إخفاء نافذة الدردشة</span></label>
                                    <label className="flex items-center space-x-2 rtl:space-x-reverse"><input type="checkbox" name="hidePeople" checked={settings.meetingSettings?.hidePeople || false} onChange={handleMeetingSettingsChange} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" /> <span>إخفاء قائمة المشاركين</span></label>
                                </div>
                            </div>
                        )}

                    </div>
                    <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                            {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>
                </Card>
            </form>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmSave}
                title="تأكيد حفظ الإعدادات"
                message="هل أنت متأكد من رغبتك في حفظ هذه التغييرات؟"
            />
        </>
    );
};