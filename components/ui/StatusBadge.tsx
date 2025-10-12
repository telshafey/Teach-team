import React from 'react';

type StatusType = 'project' | 'task' | 'approval' | 'request' | 'penalty' | 'contract' | 'plan';
type StatusValue = string;

interface StatusBadgeProps {
  status: StatusValue;
  type: StatusType;
  inline?: boolean;
}

const statusMaps: Record<StatusType, Record<StatusValue, { text: string, className: string }>> = {
  project: {
    'نشط': { text: 'نشط', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' },
    'مكتمل': { text: 'مكتمل', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
    'معلق': { text: 'معلق', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
  },
  task: {
    todo: { text: 'لم تبدأ', className: 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200' },
    inprogress: { text: 'قيد التنفيذ', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' },
    done: { text: 'مكتملة', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
  },
  approval: {
    pending: { text: 'قيد المراجعة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
    approved: { text: 'معتمدة', className: 'text-green-600' },
    rejected: { text: 'مرفوضة', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
    'needs-adjustment': { text: 'تحتاج تعديل', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' }
  },
  request: { // Generic for leave, expense, overtime
    pending: { text: 'قيد المراجعة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
    approved: { text: 'معتمد', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
    rejected: { text: 'مرفوض', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
  },
  penalty: {
    pending: { text: 'قيد المراجعة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
    approved: { text: 'معتمدة', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
    appealed: { text: 'تم الاستئناف', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
    rejected: { text: 'مرفوضة', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
  },
  contract: {
    pending: { text: 'قيد المراجعة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
    approved: { text: 'معتمد', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
    rejected: { text: 'مرفوض', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
  },
  plan: {
    pending: { text: 'قيد المراجعة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
    approved: { text: 'معتمدة', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
    rejected: { text: 'مرفوضة', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
    'needs-adjustment': { text: 'تحتاج تعديل', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, inline }) => {
  const statusInfo = statusMaps[type]?.[status];

  if (!statusInfo) {
    return <span className={inline ? '' : 'px-2 py-1 text-xs font-medium rounded-full bg-slate-200 text-slate-800'}>{status}</span>;
  }

  const baseClasses = inline ? 'font-medium' : 'px-2 py-1 text-xs font-medium rounded-full';

  return (
    <span className={`${baseClasses} ${statusInfo.className}`}>
      {statusInfo.text}
    </span>
  );
};