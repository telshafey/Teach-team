import React from 'react';
import { DailyLog } from '../../types';
import { PencilIcon, PlusIcon, TrashIcon } from '../ui/Icons';
import { useProjectContext } from '../../contexts/ProjectContext';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface DailyLogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  logs: DailyLog[];
  onAdd: () => void;
  onEdit: (log: DailyLog) => void;
  onDelete: (logId: string) => Promise<void>;
  isEditable: boolean;
}

export const DailyLogDetailModal: React.FC<DailyLogDetailModalProps> = ({ isOpen, onClose, date, logs, onAdd, onEdit, onDelete, isEditable }) => {
  const { projects } = useProjectContext();
  if (!isOpen) return null;

  const projectsMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);
  const formattedDate = format(parseISO(date), 'eeee, d MMMM yyyy', { locale: arSA });
  
  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">سجلات يوم {formattedDate}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي الساعات: {totalHours.toFixed(1)} ساعة</p>
                 {!isEditable && <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">هذه السجلات للعرض فقط.</p>}
            </div>
            {isEditable && (
                <button onClick={onAdd} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                    <PlusIcon className="w-4 h-4"/><span>إضافة سجل</span>
                </button>
            )}
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {logs.length > 0 ? logs.map(log => (
                <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-start group">
                    <div>
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                             <span className="text-sm font-bold text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 px-2 py-0.5 rounded-full">{log.hours} ساعات</span>
                             <p className="font-semibold text-slate-700 dark:text-slate-200">{projectsMap[log.projectId || ''] || "عمل آخر"}</p>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{log.description}</p>
                    </div>
                    {isEditable && (
                        <div className="flex items-center space-x-2 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEdit(log)} className="p-1.5 text-slate-500 hover:text-sky-600" aria-label="تعديل السجل"><PencilIcon className="w-4 h-4" /></button>
                            <button onClick={() => onDelete(log.id)} className="p-1.5 text-slate-500 hover:text-red-600" aria-label="حذف السجل"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>
            )) : <p className="text-slate-500 dark:text-slate-400 text-center py-8">لا توجد سجلات لهذا اليوم.</p>}
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إغلاق</button>
        </div>
      </div>
    </div>
  );
};
