import React from 'react';
import { CheckCircleIcon, XCircleIcon } from './Icons';
import { ToastType } from '@shared/contexts/ToastContext';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const baseClasses = "flex items-center w-full max-w-xs p-4 space-x-4 rtl:space-x-reverse text-gray-500 bg-white dark:bg-slate-800 rounded-lg shadow-lg ring-1 ring-black dark:ring-slate-700 ring-opacity-5";
  
  const typeStyles = {
    success: {
      icon: CheckCircleIcon,
      iconClass: 'text-green-500'
    },
    error: {
      icon: XCircleIcon,
      iconClass: 'text-red-500'
    },
    info: {
      icon: XCircleIcon, // Placeholder, can be changed
      iconClass: 'text-blue-500'
    }
  };

  const { icon: Icon, iconClass } = typeStyles[type];

  return (
    <div className={baseClasses} role="alert">
      <Icon className={`w-6 h-6 ${iconClass}`} />
      <div className="text-sm font-normal text-slate-700 dark:text-slate-200">{message}</div>
       <button onClick={onClose} className="p-1.5 -m-1.5 ml-auto text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg focus:ring-2 focus:ring-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center justify-center h-8 w-8">
        <span className="sr-only">إغلاق</span>
        <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
    </button>
    </div>
  );
};