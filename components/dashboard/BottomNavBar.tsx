import React from 'react';
import { HomeIcon, FolderIcon, ClockIcon, UsersIcon } from '../ui/Icons';
// FIX: Corrected import path
import { View } from './Dashboard';


interface BottomNavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs font-medium transition-colors ${
        isActive
          ? 'text-[var(--theme-color-600)] dark:text-sky-400'
          : 'text-slate-500 dark:text-slate-400 hover:text-[var(--theme-color-600)] dark:hover:text-sky-400'
      }`}
    >
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );
};

interface BottomNavBarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, onNavigate }) => {
  const allNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: <HomeIcon className="w-6 h-6" /> },
    { id: 'projects', label: 'المشاريع', icon: <FolderIcon className="w-6 h-6" /> },
    { id: 'timesheet', label: 'أوقاتي', icon: <ClockIcon className="w-6 h-6" /> },
    { id: 'team', label: 'الفريق', icon: <UsersIcon className="w-6 h-6" /> },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around bg-white border-t border-slate-200 dark:bg-slate-800 dark:border-slate-700 lg:hidden">
      {allNavItems.map((item) => (
        <BottomNavItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          isActive={currentView.startsWith(item.id)}
          onClick={() => onNavigate(item.id as View)}
        />
      ))}
    </nav>
  );
};
