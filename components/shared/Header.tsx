import React from 'react';
import { NotificationBell } from './NotificationBell';
import { Notification } from '../../types';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Bars3Icon } from '../ui/Icons';
import { ActiveTimerBar } from './ActiveTimerBar';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNotificationSelect: (notification: Notification) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onNotificationSelect }) => {
  return (
    <header className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-20">
      <div className="flex items-center justify-between p-4 h-20">
        <div className="flex items-center">
          <button onClick={onToggleSidebar} className="text-slate-500 dark:text-slate-400 lg:hidden" aria-label="Open sidebar">
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <ThemeToggle />
          <NotificationBell onSelect={onNotificationSelect} />
        </div>
      </div>
      <ActiveTimerBar />
    </header>
  );
};
