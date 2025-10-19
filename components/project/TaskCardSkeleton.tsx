import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const TaskCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-3 shadow-sm space-y-2">
      <div className="flex justify-between items-center text-xs">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-1/6" />
      </div>

      <Skeleton className="h-4 w-4/5" />
      
      <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-600/50">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-5 w-5 rounded-full" />
        </div>
         <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-5 w-5" />
          </div>
      </div>
    </div>
  );
};
