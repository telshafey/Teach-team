import React from "react";
import { Task, TaskStatus } from "@shared/types";
import { TaskCard } from "./TaskCard";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useProjectContext } from "@shared/contexts/ProjectContext";

interface ProjectTasksListProps {
  tasks: Task[];
  canManageTasks: boolean;
  onTaskClick: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
}

export const ProjectTasksList: React.FC<ProjectTasksListProps> = ({
  tasks,
  canManageTasks,
  onTaskClick,
  onDeleteTask,
  onUpdateTaskStatus,
}) => {
  const { teamMembers } = useTeamContext();
  const { taskAttachments, taskComments } = useProjectContext();

  const getAssignedMember = (assignedTo?: number) => {
    return teamMembers.find((m) => m.id === assignedTo);
  };

  return (
    <div className="flex flex-col space-y-4 h-full overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
          <p>لا توجد مهام مطابقة للبحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const attachmentCount = taskAttachments.filter(a => a.taskId === task.id).length;
            const commentCount = taskComments.filter(c => c.taskId === task.id).length;
            return (
              <TaskCard
                key={task.id}
                task={task}
                assignedMember={getAssignedMember(task.assignedTo)}
                attachmentCount={attachmentCount}
                commentCount={commentCount}
                onDelete={onDeleteTask}
                onCardClick={onTaskClick}
                onDragStart={() => {}}
                onDragEnd={() => {}}
                canDrag={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
