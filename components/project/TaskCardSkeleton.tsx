import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const TaskCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 p-3 shadow-sm space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    </div>
  );
};