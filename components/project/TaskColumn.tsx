import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { useProjectContext } from '../../contexts/ProjectContext';

interface TaskColumnProps {
    title: string;
    tasks: Task[];
    status: TaskStatus;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onCardClick: (task: Task) => void;
    onDrop: (status: TaskStatus) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    draggingTaskId: string | null;
    canEditTasks: boolean;
    canDeleteTasks: boolean;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({ title, tasks, status, onEdit, onDelete, onCardClick, onDrop, onDragStart, onDragEnd, draggingTaskId, canEditTasks, canDeleteTasks }) => {
  const [isOver, setIsOver] = useState(false);
  const { taskAttachments, taskComments } = useProjectContext();
  
  const placeholder = useMemo(() => {
    if (!draggingTaskId) return null;
    return <div className="h-24 w-full bg-sky-200/50 dark:bg-sky-800/50 border-2 border-dashed border-sky-400 rounded-lg" />;
  }, [draggingTaskId]);
  
  return (
    <div 
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={() => { onDrop(status); setIsOver(false); }}
        className={`bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg flex-1 transition-colors`}
    >
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 px-1">{title} ({tasks.length})</h3>
        <div className="space-y-3 min-h-[60vh]">
            {tasks.map(task => (
                <TaskCard 
                    key={task.id} 
                    task={task} 
                    attachmentCount={taskAttachments.filter(a => a.taskId === task.id).length}
                    commentCount={taskComments.filter(c => c.taskId === task.id).length}
                    onEdit={onEdit} 
                    onDelete={onDelete}
                    onCardClick={onCardClick}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isDragging={draggingTaskId === task.id}
                    canEdit={canEditTasks}
                    canDelete={canDeleteTasks}
                />
            ))}
            {isOver && placeholder}
        </div>
    </div>
  );
};