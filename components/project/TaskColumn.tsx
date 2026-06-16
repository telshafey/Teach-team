import React, { useState, useMemo } from "react";
import { Task, TaskStatus, TeamMember } from "@shared/types";
import { TaskCard } from "./TaskCard";
import { useProjectContext } from "@shared/contexts/ProjectContext";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { QuickAddTask } from "./QuickAddTask";

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  status: TaskStatus;
  onDelete: (task: Task) => void;
  onCardClick: (task: Task) => void;
  onDrop: (status: TaskStatus) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  draggingTaskId: string | null;
  canManageTasks: boolean;
  onAddTask: (title: string) => void;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
  title,
  tasks,
  status,
  onDelete,
  onCardClick,
  onDrop,
  onDragStart,
  onDragEnd,
  draggingTaskId,
  canManageTasks,
  onAddTask,
}) => {
  const [isOver, setIsOver] = useState(false);
  const { taskAttachments, taskComments } = useProjectContext();
  const { teamMembers } = useTeamContext();

  const membersMap = useMemo(
    () =>
      teamMembers.reduce(
        (acc, m) => ({ ...acc, [m.id]: m }),
        {} as Record<number, TeamMember>,
      ),
    [teamMembers],
  );

  const placeholder = useMemo(() => {
    if (!draggingTaskId) return null;
    return (
      <div className="h-24 w-full bg-sky-100/50 dark:bg-sky-900/50 border-2 border-dashed border-sky-400 rounded-lg" />
    );
  }, [draggingTaskId]);

  return (
    <div className="flex flex-col w-80 flex-shrink-0 h-full max-h-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(status);
          setIsOver(false);
        }}
        className={`bg-slate-100 dark:bg-slate-800/50 rounded-lg flex flex-col h-full border border-slate-200 dark:border-slate-700/50 transition-colors ${isOver ? "bg-sky-100 dark:bg-sky-900/30 ring-1 ring-sky-400" : ""}`}
      >
        <div className="p-3 sticky top-0 rounded-t-lg z-10 border-b border-slate-200 dark:border-slate-700/50">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex justify-between items-center">
            {title}
            <span className="text-sm font-normal bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </h3>
        </div>
        <div className="p-3 flex-1 min-h-0 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assignedMember={
                task.assignedTo ? membersMap[task.assignedTo] : undefined
              }
              attachmentCount={
                taskAttachments.filter((a) => a.taskId === task.id).length
              }
              commentCount={
                taskComments.filter((c) => c.taskId === task.id).length
              }
              onDelete={onDelete}
              onCardClick={onCardClick}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggingTaskId === task.id}
              canDrag={canManageTasks}
            />
          ))}
          {isOver && placeholder}
        </div>
        {canManageTasks && (
          <div className="p-3 mt-auto shrink-0 border-t border-slate-200 dark:border-slate-700/50">
            <QuickAddTask onAdd={onAddTask} />
          </div>
        )}
      </div>
    </div>
  );
};
