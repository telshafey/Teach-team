import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  return (
    <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      {icon && <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{icon}</div>}
      <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};