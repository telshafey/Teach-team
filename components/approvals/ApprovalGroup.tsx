import React, { useState } from 'react';
import { ChevronDownIcon } from '../ui/Icons';

interface ApprovalGroupProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const ApprovalGroup: React.FC<ApprovalGroupProps> = ({ title, count, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const headerActions = (
    <div className="flex items-center space-x-2 rtl:space-x-reverse">
      <span className="px-2 py-0.5 text-xs font-semibold text-white bg-sky-600 rounded-full">{count}</span>
      <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
             <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
             </div>
             {headerActions}
        </div>
        {isOpen && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
            {children}
            </div>
        )}
    </div>
  );
};
