import React, { useState } from 'react';
import { SiteSettingsPage } from './SiteSettingsPage';
import { RoleManagementPage } from './RoleManagementPage';
import { View } from '../dashboard/Dashboard';

interface SettingsPageProps {
    initialView?: View;
    onNavigate: (view: View, state?: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialView, onNavigate }) => {
    const getInitialTab = () => {
        if (initialView === 'roles') return 'roles';
        return 'site';
    };
    const [activeTab, setActiveTab] = useState(getInitialTab());

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الإعدادات</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">إدارة إعدادات النظام والأدوار.</p>
            </div>
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                <button
                    onClick={() => setActiveTab('site')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'site' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    إعدادات الموقع
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'roles' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    الأدوار والصلاحيات
                </button>
            </div>

            {activeTab === 'site' && <SiteSettingsPage />}
            {activeTab === 'roles' && <RoleManagementPage onNavigate={onNavigate} />}
        </div>
    );
};
