import React from 'react';
// FIX: Corrected import path.
import { Task } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';
import { PencilIcon, ClockIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, PaperClipIcon, ChatBubbleLeftEllipsisIcon, PlayIcon, PauseIcon } from '../ui/Icons';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onCardClick: (task: Task) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
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

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onCardClick, onDragStart, onDragEnd, isDragging }) => {
  const { teamMembers, dailyLogs } = useAppDataContext();
  const { activeTimer, startTimer, stopTimer } = useTimeTracking();
  
  const assignedMember = teamMembers.find(m => m.id === task.assignedTo);
  const taskHours = dailyLogs.filter(l => l.taskId === task.id).reduce((sum, log) => sum + log.hours, 0);
  
  const isThisTaskActive = activeTimer?.taskId === task.id;

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThisTaskActive) {
        stopTimer();
    } else {
        startTimer(task.id, task.title, task.projectId);
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
      className={`bg-white dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 p-3 shadow-sm space-y-3 cursor-grab hover:bg-slate-50 dark:hover:bg-slate-600 transition-all ${getApprovalBorder()} ${isDragging ? 'opacity-50 ring-2 ring-sky-500' : ''} ${isThisTaskActive ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
    >
      <div className="flex justify-between items-start">
        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm pr-2">{task.title}</p>
        <button 
            onClick={(e) => { e.stopPropagation(); onEdit(task); }} 
            className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 flex-shrink-0" 
            aria-label="تعديل المهمة">
          <PencilIcon className="w-4 h-4" />
        </button>
      </div>
      
      {task.approvalStatus === 'rejected' && task.approvalNotes && (
          <div className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded">
              <span className="font-bold">ملاحظة المدير:</span> {task.approvalNotes}
          </div>
      )}

      <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
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
              {(task.attachments?.length || 0) > 0 && (
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <PaperClipIcon className="w-4 h-4" />
                  <span>{task.attachments?.length}</span>
                </div>
              )}
              {(task.comments?.length || 0) > 0 && (
                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                  <span>{task.comments?.length}</span>
                </div>
              )}
            </div>
            <ApprovalIndicator status={task.approvalStatus} notes={task.approvalNotes} />
            <div className="flex items-center space-x-1 rtl:space-x-reverse">
              <ClockIcon className="w-4 h-4" />
              <span>{taskHours.toFixed(1)}h</span>
            </div>
          </div>
      </div>
    </div>
  );
};
