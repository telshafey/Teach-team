import React from 'react';

interface CardProps {
  // FIX: Changed title from string to React.ReactNode to allow passing JSX elements.
  title?: React.ReactNode;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const Card: React.FC<CardProps> = ({ title, icon, headerActions, children, className, id }) => {
  return (
    <div id={id} className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
      {(title || headerActions) && (
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          {title && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {icon}
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
            </div>
          )}
          <div>{headerActions}</div>
        </div>
      )}
      <div className={title ? "p-4" : ""}>{children}</div>
    </div>
  );
};