import React from "react";
import { Task, TeamMember } from "@shared/types";
import { useTimeLogContext } from "@shared/contexts/TimeLogContext";
import {
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  PaperClipIcon,
  ChatBubbleLeftEllipsisIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  BellIcon,
  ExclamationTriangleIcon,
} from "../ui/Icons";
import { useTimeManagement } from "@shared/contexts/TimeManagementContext";
import { format, parseISO, isToday, isPast } from "date-fns";
import { arSA } from "date-fns/locale";

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

const ApprovalIndicator: React.FC<{
  status: Task["approvalStatus"];
  notes?: string;
}> = ({ status, notes }) => {
  const statusMap = {
    approved: {
      Icon: CheckCircleIcon,
      color: "text-green-500",
      text: "معتمدة",
    },
    pending: {
      Icon: ClockIcon,
      color: "text-amber-500",
      text: "بانتظار الموافقة",
    },
    rejected: { Icon: XCircleIcon, color: "text-red-500", text: "مرفوضة" },
    "needs-adjustment": {
      Icon: InformationCircleIcon,
      color: "text-blue-500",
      text: "تحتاج تعديل",
    },
  };
  const statusInfo = statusMap[status];
  if (!statusInfo) return null;
  const { Icon, color, text } = statusInfo;
  const tooltipText = notes ? `${text}: ${notes}` : text;
  return (
    <div className="relative group flex items-center">
      <Icon className={`w-5 h-5 ${color}`} />
      <div className="absolute bottom-full mb-2 w-48 p-2 text-xs text-white bg-slate-800 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 pointer-events-none">
        {tooltipText}
      </div>
    </div>
  );
};

const DueDateIndicator: React.FC<{ dueDate: string | undefined }> = ({
  dueDate,
}) => {
  if (!dueDate) return null;
  const parsedDate = parseISO(dueDate);
  const isUrgent = isPast(parsedDate) && !isToday(parsedDate);
  return (
    <div
      className={`flex items-center space-x-1 rtl:space-x-reverse text-xs ${isUrgent ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}
      title={`تاريخ الاستحقاق: ${format(parsedDate, "eeee, d MMMM yyyy", { locale: arSA })}`}
    >
      {isUrgent ? (
        <ExclamationTriangleIcon className="w-4 h-4" />
      ) : (
        <BellIcon className="w-4 h-4" />
      )}
      <span>{format(parsedDate, "d MMM", { locale: arSA })}</span>
    </div>
  );
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(
  ({
    task,
    assignedMember,
    attachmentCount,
    commentCount,
    onDelete,
    onCardClick,
    onDragStart,
    onDragEnd,
    isDragging,
    canDrag,
  }) => {
    const { dailyLogs } = useTimeLogContext();
    const { activeTimer, startTimer, stopTimer } = useTimeManagement();

    const taskHours = dailyLogs
      .filter((l) => l.taskId === task.id)
      .reduce((sum, log) => sum + log.hours, 0);
    const isThisTaskActive = activeTimer?.taskId === task.id;

    const handleToggleTimer = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isThisTaskActive) stopTimer();
      else if (task.projectId) startTimer(task.id, task.title, task.projectId);
    };

    const getApprovalBorder = () => {
      if (isDragging) return "border-r-4 border-sky-500";
      switch (task.approvalStatus) {
        case "pending":
          return "border-r-4 border-amber-400";
        case "rejected":
          return "border-r-4 border-red-500";
        case "needs-adjustment":
          return "border-r-4 border-blue-400";
        default:
          return "border-r-4 border-transparent";
      }
    };

    return (
      <div
        draggable={canDrag}
        onDragStart={(e) => canDrag && onDragStart(e, task.id)}
        onDragEnd={onDragEnd}
        onClick={() => onCardClick(task)}
        className={`bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-3 shadow-sm space-y-2.5 ${canDrag ? "cursor-grab" : "cursor-pointer"} hover:shadow-md hover:border-sky-400 dark:hover:border-sky-500 transition-all group relative ${getApprovalBorder()} ${isDragging ? "opacity-50 ring-2 ring-sky-500" : ""} ${isThisTaskActive ? "ring-2 ring-green-500 shadow-md" : ""}`}
      >
        {/* Title and Approval Status */}
        <div className="flex justify-between items-start gap-2">
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm line-clamp-2 leading-relaxed">
            {task.title}
          </p>
          <div className="flex-shrink-0">
            <ApprovalIndicator
              status={task.approvalStatus}
              notes={task.approvalNotes}
            />
          </div>
        </div>

        {/* Manager Rejection notes (if any) */}
        {task.approvalStatus === "rejected" && task.approvalNotes && (
          <div className="text-[11px] text-red-600 dark:text-red-300 bg-red-50/70 dark:bg-red-900/20 px-2 py-1 rounded truncate animate-fade-in" title={task.approvalNotes}>
            <span className="font-semibold">تنبيه:</span> {task.approvalNotes}
          </div>
        )}

        {/* Footer: Assignee, Indicators & Due Date */}
        <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-600/50">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {assignedMember ? (
              <div className="flex items-center gap-1.5">
                <img
                  src={assignedMember.avatarUrl}
                  alt={assignedMember.name}
                  className="w-5 h-5 rounded-full ring-1 ring-slate-100 dark:ring-slate-600"
                  title={assignedMember.name}
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-300 hidden sm:inline truncate max-w-[80px]">
                  {assignedMember.name.split(" ")[0]}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 italic">غير مسندة</span>
            )}

            {/* Micro Indicators */}
            {(attachmentCount > 0 || commentCount > 0) && (
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-600/80 pr-1.5">
                {attachmentCount > 0 && (
                  <div className="flex items-center space-x-0.5 rtl:space-x-reverse" title="المرفقات">
                    <PaperClipIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{attachmentCount}</span>
                  </div>
                )}
                {commentCount > 0 && (
                  <div className="flex items-center space-x-0.5 rtl:space-x-reverse" title="التعليقات">
                    <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{commentCount}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <DueDateIndicator dueDate={task.dueDate} />
            {taskHours > 0 && (
              <div className="flex items-center space-x-0.5 rtl:space-x-reverse font-mono text-[11px] bg-slate-50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300">
                <ClockIcon className="w-3 h-3" />
                <span>{taskHours.toFixed(1)}h</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
