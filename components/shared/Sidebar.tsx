import React from 'react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { HomeIcon, FolderIcon, UsersIcon, ClockIcon, ChartBarIcon, DocumentTextIcon, Cog8ToothIcon, CurrencyDollarIcon, VideoCameraIcon, ArrowRightOnRectangleIcon, ClipboardDocumentListIcon } from '../ui/Icons';
import { View } from '../dashboard/Dashboard';
import { useAppDataContext } from '../../contexts/DataContext';

interface NavItemProps {
    view: View;
    label: string;
    icon: React.ReactNode;
    currentView: View;
    onNavigate: (view: View) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon, currentView, onNavigate }) => {
    const isActive = currentView.startsWith(view);
    return (
        <li>
            <a
                href="#"
                onClick={(e) => { e.preventDefault(); onNavigate(view); }}
                className={`flex items-center p-2 text-base font-normal rounded-lg transition-colors ${isActive ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' : 'text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700'}`}
            >
                {icon}
                <span className="ml-3 rtl:ml-0 rtl:mr-3 flex-1">{label}</span>
            </a>
        </li>
    );
};

interface SidebarProps {
    currentView: View;
    onNavigate: (view: View, props?: any) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, setIsOpen }) => {
    const { currentUser, handleLogout, hasPermission } = useAuth();
    const { siteSettings } = useAppDataContext();
    
    const navItems = [
        { id: 'dashboard', label: 'الرئيسية', icon: <HomeIcon className="w-6 h-6" />, permission: true },
        { id: 'projects', label: 'المشاريع', icon: <FolderIcon className="w-6 h-6" />, permission: true },
        { id: 'myTasks', label: 'مهامي', icon: <ClipboardDocumentListIcon className="w-6 h-6" />, permission: true },
        { id: 'team', label: 'الفريق', icon: <UsersIcon className="w-6 h-6" />, permission: true },
        { id: 'timesheet', label: 'أوقاتي', icon: <ClockIcon className="w-6 h-6" />, permission: true },
        { id: 'analytics', label: 'التحليلات', icon: <ChartBarIcon className="w-6 h-6" />, permission: hasPermission('view_analytics') && siteSettings?.isAnalyticsModuleEnabled },
        { id: 'reports', label: 'التقارير', icon: <DocumentTextIcon className="w-6 h-6" />, permission: hasPermission('view_reports') && siteSettings?.isReportsModuleEnabled },
        { id: 'finance', label: 'المالية', icon: <CurrencyDollarIcon className="w-6 h-6" />, permission: hasPermission('view_finances') && siteSettings?.isFinanceModuleEnabled },
        { id: 'meetings', label: 'الاجتماعات', icon: <VideoCameraIcon className="w-6 h-6" />, permission: siteSettings?.isMeetingsModuleEnabled },
        { id: 'settings', label: 'الإعدادات', icon: <Cog8ToothIcon className="w-6 h-6" />, permission: hasPermission('manage_site_settings') || hasPermission('manage_roles') || hasPermission('manage_db_settings') },
    ];
    
    return (
        <>
            {/* Overlay for mobile */}
            <div className={`fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={() => setIsOpen(false)}></div>

            <aside 
              id="sidebar" 
              className={`
                fixed top-0 right-0 z-40 w-64 h-screen 
                bg-white border-l border-slate-200 
                dark:bg-slate-800 dark:border-slate-700
                transition-transform transform 
                ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
                lg:relative lg:translate-x-0 lg:flex-shrink-0
              `}
            >
                <div className="h-full px-3 pb-4 overflow-y-auto flex flex-col">
                    <div className="flex items-center justify-center h-16 flex-shrink-0">
                        <Logo />
                    </div>
                    <ul className="space-y-2 flex-1">
                        {navItems.filter(item => item.permission).map(item => (
                             <NavItem
                                key={item.id}
                                view={item.id as View}
                                label={item.label}
                                icon={item.icon}
                                currentView={currentView}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </ul>
                    <div className="flex-shrink-0">
                         <div className="flex items-center space-x-3 rtl:space-x-reverse p-2 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => onNavigate('profile')}>
                            <img src={currentUser?.avatarUrl} alt={currentUser?.name} className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{currentUser?.name}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="w-full flex items-center p-2 mt-2 text-base font-normal text-slate-900 rounded-lg hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700">
                           <ArrowRightOnRectangleIcon className="w-6 h-6 text-slate-500 dark:text-slate-400"/>
                           <span className="ml-3 rtl:ml-0 rtl:mr-3">تسجيل الخروج</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};