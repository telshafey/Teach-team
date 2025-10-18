import React from 'react';
import { Task, TeamMember } from '../../types';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { PencilIcon, ClockIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, PaperClipIcon, ChatBubbleLeftEllipsisIcon, PlayIcon, PauseIcon, TrashIcon, BellIcon, ExclamationTriangleIcon } from '../ui/Icons';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  assignedMember: TeamMember | undefined;
  attachmentCount: number;
  commentCount: number;
  onDelete: (task: Task) => void;
  onCardClick: (task: Task) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  canDrag: boolean;
}

const ApprovalIndicator: React.FC<{ status: Task['approvalStatus'], notes?: string }> = ({ status, notes }) => {
    const statusMap = {
        approved: { Icon: CheckCircleIcon, color: 'text-green-500', text: 'معتمدة' },
        pending: { Icon: ClockIcon, color: 'text-amber-500', text: 'بانتظار الموافقة' },
        rejected: { Icon: XCircleIcon, color: 'text-red-500', text: 'مرفوضة' },
        'needs-adjustment': { Icon: InformationCircleIcon, color: 'text-blue-500', text: 'تحتاج تعديل' }
    };
    const statusInfo = statusMap[status];
    if (!statusInfo) return null;
    const { Icon, color, text } = statusInfo;
    const tooltipText = notes ? `${text}: ${notes}` : text;
    return <div className="relative group flex items-center"><Icon className={`w-5 h-5 ${color}`} /><div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-white bg-slate-800 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 pointer-events-none">{tooltipText}</div></div>;
};

const DueDateIndicator: React.FC<{ dueDate: string | undefined }> = ({ dueDate }) => {
    if (!dueDate) return null;
    const parsedDate = parseISO(dueDate);
    const isUrgent = isPast(parsedDate) || isToday(parsedDate);
    return <div className={`flex items-center space-x-1 rtl:space-x-reverse text-xs ${isUrgent ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}`} title={`تاريخ الاستحقاق: ${format(parsedDate, 'eeee, d MMMM yyyy', { locale: arSA })}`}>{isUrgent ? <ExclamationTriangleIcon className="w-4 h-4" /> : <BellIcon className="w-4 h-4" />}<span>{format(parsedDate, 'd MMM', { locale: arSA })}</span></div>;
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, assignedMember, attachmentCount, commentCount, onDelete, onCardClick, onDragStart, onDragEnd, isDragging, canDrag }) => {
  const { dailyLogs } = useTimeLogContext();
  const { activeTimer, startTimer, stopTimer } = useTimeTracking();
  
  const taskHours = dailyLogs.filter(l => l.taskId === task.id).reduce((sum, log) => sum + log.hours, 0);
  const isThisTaskActive = activeTimer?.taskId === task.id;

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThisTaskActive) stopTimer();
    else if(task.projectId) startTimer(task.id, task.title, task.projectId);
  };

  const getApprovalBorder = () => {
    if (isDragging) return 'border-r-4 border-sky-500';
    switch (task.approvalStatus) {
      case 'pending': return 'border-r-4 border-amber-400';
      case 'rejected': return 'border-r-4 border-red-500';
      case 'needs-adjustment': return 'border-r-4 border-blue-400';
      default: return 'border-r-4 border-transparent';
    }
  };

  return (
    <div 
      draggable={canDrag}
      onDragStart={(e) => canDrag && onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onClick={() => onCardClick(task)}
      className={`bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-3 shadow-sm space-y-2 ${canDrag ? 'cursor-grab' : 'cursor-pointer'} hover:shadow-lg hover:border-sky-300 dark:hover:border-sky-600 transition-all group relative ${getApprovalBorder()} ${isDragging ? 'opacity-50 ring-2 ring-sky-500' : ''} ${isThisTaskActive ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
    >
      <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
        <DueDateIndicator dueDate={task.dueDate} />
        <div className="flex items-center space-x-1 rtl:space-x-reverse"><ClockIcon className="w-4 h-4" /><span>{taskHours.toFixed(1)}h</span></div>
      </div>

      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm pb-2">{task.title}</p>
      
      {task.approvalStatus === 'rejected' && task.approvalNotes && <div className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded"><span className="font-bold">ملاحظة المدير:</span> {task.approvalNotes}</div>}

      <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-600/50">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {assignedMember ? <img src={assignedMember.avatarUrl} alt={assignedMember.name} className="w-6 h-6 rounded-full" title={assignedMember.name} /> : <div className="w-6 h-6"/>}
            <button onClick={handleToggleTimer} className={`p-1 rounded-full ${isThisTaskActive ? 'bg-green-100 text-green-600' : 'text-slate-400 hover:text-green-600'}`}>{isThisTaskActive ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}</button>
        </div>
         <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {attachmentCount > 0 && <div className="flex items-center space-x-1 rtl:space-x-reverse"><PaperClipIcon className="w-4 h-4" /><span>{attachmentCount}</span></div>}
              {commentCount > 0 && <div className="flex items-center space-x-1 rtl:space-x-reverse"><ChatBubbleLeftEllipsisIcon className="w-4 h-4" /><span>{commentCount}</span></div>}
            </div>
            <ApprovalIndicator status={task.approvalStatus} notes={task.approvalNotes} />
          </div>
      </div>

       {canDrag && (
          <div className="absolute top-2 left-2 rtl:left-auto rtl:right-2 flex-shrink-0 flex items-center space-x-1 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); onDelete(task); }} className="p-1.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-md text-slate-500 hover:text-red-600 dark:hover:text-red-400" aria-label="حذف المهمة"><TrashIcon className="w-4 h-4" /></button>
          </div>
      )}
    </div>
  );
});
