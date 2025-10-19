import React from 'react';
import { Modal } from '../ui/Modal';
import { DailyLog } from '../../types';
import { useProjectContext } from '../../contexts/ProjectContext';
import { PencilIcon, TrashIcon, PlusIcon } from '../ui/Icons';
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

export const DailyLogDetailModal: React.FC<DailyLogDetailModalProps> = ({
  isOpen,
  onClose,
  date,
  logs,
  onAdd,
  onEdit,
  onDelete,
  isEditable,
}) => {
  const { projects, tasks } = useProjectContext();
  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
  const formattedDate = format(parseISO(date), 'eeee, d MMMM yyyy', { locale: arSA });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`سجلات يوم ${formattedDate}`}>
      <div className="space-y-4">
        {logs.length > 0 ? (
          logs.map(log => {
            const project = projects.find(p => p.id === log.projectId);
            const task = tasks.find(t => t.id === log.taskId);
            return (
              <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{log.hours.toFixed(1)} ساعة</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{log.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {project ? `مشروع: ${project.name}` : 'خاص'}
                    {task && ` > مهمة: ${task.title}`}
                  </p>
                </div>
                {isEditable && (
                  <div className="flex space-x-2 rtl:space-x-reverse flex-shrink-0 ml-2">
                    <button onClick={() => onEdit(log)} className="p-1 text-slate-500 hover:text-sky-600"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(log.id)} className="p-1 text-slate-500 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center text-slate-500 py-4">لا توجد سجلات لهذا اليوم.</p>
        )}
        <div className="border-t pt-4 flex justify-between items-center">
          <p className="font-semibold text-slate-800 dark:text-slate-100">المجموع: {totalHours.toFixed(1)} ساعة</p>
          {isEditable && (
            <button onClick={onAdd} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
              <PlusIcon className="w-4 h-4"/><span>إضافة سجل</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
