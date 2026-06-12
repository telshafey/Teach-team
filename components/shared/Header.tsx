import React from "react";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Bars3Icon } from "../ui/Icons";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 lg:hidden"
            aria-controls="sidebar"
            aria-expanded="false" // This should be dynamic if we track sidebar state here
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <GlobalSearch />
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
