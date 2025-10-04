import React from 'react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';
import {
  HomeIcon,
  FolderIcon,
  UsersIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  VideoCameraIcon,
  Cog8ToothIcon,
  ArrowRightOnRectangleIcon,
  WrenchScrewdriverIcon,
} from '../ui/Icons';
import { View } from '../dashboard/Dashboard';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  view: View;
  currentView: View;
  onNavigate: (view: View) => void;
}

interface NavItemData {
  view: View;
  label: string;
  icon: React.ReactNode;
  permission: () => boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, view, currentView, onNavigate }) => {
  const isActive = currentView.startsWith(view);
  return (
    <li>
      <button
        onClick={() => onNavigate(view)}
        className={`w-full flex items-center p-3 my-1 space-x-3 rtl:space-x-reverse rounded-lg text-base font-medium transition-colors ${
          isActive
            ? 'bg-[var(--theme-color-100)] text-[var(--theme-color-700)] dark:bg-sky-900/50 dark:text-sky-300'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    </li>
  );
};

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, setIsOpen }) => {
  const { hasPermission, handleLogout, currentUser } = useAuth();
  const { siteSettings } = useAppDataContext();
  
  const mainNavItems: NavItemData[] = [
    { view: 'dashboard', label: 'الرئيسية', icon: <HomeIcon className="w-6 h-6" />, permission: () => true },
    { view: 'projects', label: 'المشاريع', icon: <FolderIcon className="w-6 h-6" />, permission: () => hasPermission('view_projects_all') || hasPermission('view_projects_assigned') },
    { view: 'team', label: 'الفريق', icon: <UsersIcon className="w-6 h-6" />, permission: () => hasPermission('view_team_all') },
    { view: 'reports', label: 'التقارير', icon: <DocumentTextIcon className="w-6 h-6" />, permission: () => siteSettings?.isReportsModuleEnabled && (hasPermission('view_reports_all') || hasPermission('view_reports_own')) },
    { view: 'analytics', label: 'التحليلات', icon: <ChartBarIcon className="w-6 h-6" />, permission: () => siteSettings?.isAnalyticsModuleEnabled && hasPermission('view_analytics') },
    { view: 'finance', label: 'المالية', icon: <CurrencyDollarIcon className="w-6 h-6" />, permission: () => siteSettings?.isFinanceModuleEnabled && (hasPermission('view_finances') || hasPermission('view_own_financials')) },
    { view: 'meetings', label: 'الاجتماعات', icon: <VideoCameraIcon className="w-6 h-6" />, permission: () => siteSettings?.isMeetingsModuleEnabled },
  ];
  
  const adminNavItems: NavItemData[] = [
      { view: 'siteSettings', label: 'إعدادات النظام', icon: <Cog8ToothIcon className="w-6 h-6" />, permission: () => hasPermission('manage_roles') }, // Assuming GMs manage settings
      { view: 'roles', label: 'إدارة الأدوار', icon: <WrenchScrewdriverIcon className="w-6 h-6" />, permission: () => hasPermission('manage_roles') },
  ];
  
  const visibleAdminItems = adminNavItems.filter(item => item.permission());

  return (
    <>
      <aside className={`fixed lg:relative z-40 inset-y-0 right-0 w-64 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="flex items-center justify-center h-20 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 px-4">
          <Logo />
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul>
            {mainNavItems.filter(item => item.permission()).map(item => (
              <NavItem key={item.view} {...item} currentView={currentView} onNavigate={onNavigate} />
            ))}
          </ul>
          {visibleAdminItems.length > 0 && (
             <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="px-3 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">الإدارة</h3>
                <ul>
                    {visibleAdminItems.map(item => (
                         <NavItem key={item.view} {...item} currentView={currentView} onNavigate={onNavigate} />
                    ))}
                </ul>
             </div>
          )}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
             <div
                onClick={() => onNavigate('profile')}
                className="flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
             >
                 <img src={currentUser?.avatarUrl} alt={currentUser?.name} className="w-10 h-10 rounded-full" />
                 <div className="flex-1">
                     <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{currentUser?.name}</p>
                     <p className="text-xs text-slate-500 dark:text-slate-400">عرض الملف الشخصي</p>
                 </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); handleLogout(); }} 
                    className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400" 
                    title="تسجيل الخروج"
                 >
                     <ArrowRightOnRectangleIcon className="w-6 h-6" />
                 </button>
             </div>
        </div>
      </aside>
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setIsOpen(false)}></div>}
    </>
  );
};