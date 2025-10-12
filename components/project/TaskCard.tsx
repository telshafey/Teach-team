import React from 'react';
import { Task } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { PencilIcon, ClockIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, PaperClipIcon, ChatBubbleLeftEllipsisIcon, PlayIcon, PauseIcon, TrashIcon, BellIcon, ExclamationTriangleIcon } from '../ui/Icons';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  attachmentCount: number;
  commentCount: number;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onCardClick: (task: Task) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const ApprovalIndicator: React.FC<{ status: Task['approvalStatus'], notes?: string }> = ({ status, notes }) => {
    const statusMap = {
        approved: {
            Icon: CheckCircleIcon,
            color: 'text-green-500',
            text: 'معتمدة'
        },
        pending: {
            Icon: ClockIcon,
            color: 'text-amber-500',
            text: 'بانتظار الموافقة'
        },
        rejected: {
            Icon: XCircleIcon,
            color: 'text-red-500',
            text: 'مرفوضة'
        },
        'needs-adjustment': {
            Icon: InformationCircleIcon,
            color: 'text-blue-500',
            text: 'تحتاج تعديل'
        }
    };

    const statusInfo = statusMap[status];
    if (!statusInfo) return null;

    const { Icon, color, text } = statusInfo;
    const tooltipText = notes ? `${text}: ${notes}` : text;

    return (
        <div className="relative group flex items-center">
            <Icon className={`w-5 h-5 ${color}`} />
            <div className="absolute bottom-full mb-2 -right-1/2 transform translate-x-1/2 w-48 p-2 text-xs text-center text-white bg-slate-800 dark:bg-slate-900 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 pointer-events-none">
                {tooltipText}
                 <svg className="absolute text-slate-800 dark:text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
            </div>
        </div>
    );
};

const DueDateIndicator: React.FC<{ dueDate: string | undefined }> = ({ dueDate }) => {
    if (!dueDate) return null;

    const parsedDate = parseISO(dueDate);
    // An urgent task is one due today or in the past. `isPast` is only true for *yesterday* or before.
    const isUrgent = isPast(parsedDate) || isToday(parsedDate);
    
    const formattedDate = format(parsedDate, 'd MMM', { locale: arSA });

    const icon = isUrgent ? (
      <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    ) : (
      <BellIcon className="w-4 h-4" />
    );

    const textColor = isUrgent ? 'text-amber-600 dark:text-amber-400 font-semibold' : '';

    return (
      <div className="relative group flex items-center space-x-1 rtl:space-x-reverse">
        {icon}
        <span className={textColor}>{formattedDate}</span>
        <div className="absolute bottom-full mb-2 -right-1/2 transform translate-x-1/2 w-max p-2 text-xs text-center text-white bg-slate-800 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 pointer-events-none">
          تاريخ الاستحقاق: {format(parsedDate, 'eeee, d MMMM yyyy', { locale: arSA })}
          <svg className="absolute text-slate-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
        </div>
      </div>
    );
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, attachmentCount, commentCount, onEdit, onDelete, onCardClick, onDragStart, onDragEnd, isDragging, canEdit, canDelete }) => {
  const { teamMembers } = useTeamContext();
  const { dailyLogs } = useTimeLogContext();
  const { activeTimer, startTimer, stopTimer } = useTimeTracking();
  
  const assignedMember = teamMembers.find(m => m.id === task.assignedTo);
  const taskHours = dailyLogs.filter(l => l.taskId === task.id).reduce((sum, log) => sum + log.hours, 0);
  
  const isThisTaskActive = activeTimer?.taskId === task.id;

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThisTaskActive) {
        stopTimer();
    } else {
        if(task.projectId) {
            startTimer(task.id, task.title, task.projectId);
        }
    }
  };

  const getApprovalBorder = () => {
    if (isDragging) return 'border-l-4 border-sky-500';
    switch (task.approvalStatus) {
      case 'pending': return 'border-l-4 border-amber-400';
      case 'rejected': return 'border-l-4 border-red-500';
      case 'needs-adjustment': return 'border-l-4 border-blue-400';
      default: return 'border-l-4 border-transparent';
    }
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onClick={() => onCardClick(task)}
      className={`bg-white dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 p-3 shadow-sm space-y-2 cursor-grab hover:bg-slate-50 dark:hover:bg-slate-600 transition-all group relative ${getApprovalBorder()} ${isDragging ? 'opacity-50 ring-2 ring-sky-500' : ''} ${isThisTaskActive ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
    >
      <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
        <DueDateIndicator dueDate={task.dueDate} />
        <div className="flex items-center space-x-1 rtl:space-x-reverse">
          <ClockIcon className="w-4 h-4" />
          <span>{taskHours.toFixed(1)}h</span>
        </div>
      </div>

      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm pb-2">{task.title}</p>
      
      {task.approvalStatus === 'rejected' && task.approvalNotes && (
          <div className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded">
              <span className="font-bold">ملاحظة المدير:</span> {task.approvalNotes}
          </div>
      )}

      <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-600/50">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {assignedMember ? (
                <img src={assignedMember.avatarUrl} alt={assignedMember.name} className="w-6 h-6 rounded-full" title={assignedMember.name} />
            ) : (
                <div className="w-6 h-6"/>
            )}
             <button onClick={handleToggleTimer} className={`p-1 rounded-full ${isThisTaskActive ? 'bg-green-100 text-green-600' : 'text-slate-400 hover:text-green-600'}`}>
                {isThisTaskActive ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
             </button>
        </div>
         <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {attachmentCount > 0 && (
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <PaperClipIcon className="w-4 h-4" />
                  <span>{attachmentCount}</span>
                </div>
              )}
              {commentCount > 0 && (
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                  <span>{commentCount}</span>
                </div>
              )}
            </div>
            <ApprovalIndicator status={task.approvalStatus} notes={task.approvalNotes} />
          </div>
      </div>

       {(canEdit || canDelete) && (
          <div className="absolute bottom-2 left-2 rtl:left-auto rtl:right-2 flex-shrink-0 flex items-center space-x-1 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                  <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(task); }} 
                      className="p-1.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-md text-slate-500 hover:text-sky-600 dark:hover:text-sky-400" 
                      aria-label="تعديل المهمة">
                    <PencilIcon className="w-4 h-4" />
                  </button>
              )}
               {canDelete && (
                  <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(task); }} 
                      className="p-1.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-md text-slate-500 hover:text-red-600 dark:hover:text-red-400" 
                      aria-label="حذف المهمة">
                    <TrashIcon className="w-4 h-4" />
                  </button>
               )}
          </div>
      )}
    </div>
  );
});