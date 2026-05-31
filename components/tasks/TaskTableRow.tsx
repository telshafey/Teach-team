import React from 'react';
import { Task } from '@shared/types';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { StatusBadge } from '../ui/StatusBadge';
import { PencilIcon, TrashIcon } from '../ui/Icons';

interface TaskTableRowProps {
  task: Task;
  projectName: string;
  assigneeName: string;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export const TaskTableRow: React.FC<TaskTableRowProps> = React.memo(({
  task, projectName, assigneeName, onEdit, onDelete, onSelect, canEdit, canDelete
}) => {
  return (
    <tr onClick={onSelect} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer">
      <td className="px-6 py-4 font-medium">{task.title}</td>
      <td className="px-6 py-4">{projectName}</td>
      <td className="px-6 py-4">{assigneeName}</td>
      <td className="px-6 py-4">{task.dueDate ? format(parseISO(task.dueDate), 'd MMM yyyy', { locale: arSA }) : '-'}</td>
      <td className="px-6 py-4"><StatusBadge status={task.status} type="task" /></td>
      {(canEdit || canDelete) && (
        <td className="px-6 py-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {canEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 text-slate-500 hover:text-sky-600"><PencilIcon className="w-4 h-4" /></button>}
            {canDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-slate-500 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>}
          </div>
        </td>
      )}
    </tr>
  );
});