import React, { useState, lazy } from 'react';
// FIX: Corrected import paths
import { SiteSettingsPage } from './settings/SiteSettingsPage';
import { RoleManagementPage } from './settings/RoleManagementPage';
import { View } from './dashboard/Dashboard';
import { useAuth } from '../contexts/AuthContext';

const DatabaseSettingsPage = lazy(() => import('./settings/DatabaseSettingsPage').then(module => ({ default: module.DatabaseSettingsPage })));


interface SettingsPageProps {
    initialView?: View;
    onNavigate: (view: View, state?: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialView, onNavigate }) => {
    const { hasPermission } = useAuth();

    const getInitialTab = () => {
        if (initialView === 'roles') return 'roles';
        if (initialView === 'database') return 'database';
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
                {hasPermission('manage_db_settings') && (
                     <button
                        onClick={() => setActiveTab('database')}
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'database' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        إعدادات قاعدة البيانات
                    </button>
                )}
            </div>

            {activeTab === 'site' && <SiteSettingsPage />}
            {activeTab === 'roles' && <RoleManagementPage onNavigate={onNavigate} />}
            {activeTab === 'database' && hasPermission('manage_db_settings') && <React.Suspense fallback={<div>Loading...</div>}><DatabaseSettingsPage /></React.Suspense>}
        </div>
    );
};
