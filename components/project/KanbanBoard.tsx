import React, { useState, useMemo, useCallback } from "react";
import { Task, TaskStatus } from "@shared/types";
import { TaskColumn } from "./TaskColumn";

interface KanbanBoardProps {
  tasks: Task[];
  canManageTasks: boolean;
  onTaskClick: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onQuickAddTask: (title: string, status: TaskStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  canManageTasks,
  onTaskClick,
  onDeleteTask,
  onUpdateTaskStatus,
  onQuickAddTask,
}) => {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
      setDraggingTaskId(taskId);
      e.dataTransfer.setData("taskId", taskId);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null);
  }, []);

  const handleDrop = useCallback(
    (status: TaskStatus) => {
      if (draggingTaskId) {
        onUpdateTaskStatus(draggingTaskId, status);
      }
    },
    [draggingTaskId, onUpdateTaskStatus],
  );

  const tasksByStatus = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === "todo"),
      inprogress: tasks.filter((t) => t.status === "inprogress"),
      done: tasks.filter((t) => t.status === "done"),
    };
  }, [tasks]);

  return (
    <div className="flex space-x-4 rtl:space-x-reverse overflow-x-auto pb-4">
      <TaskColumn
        title="المهام المطلوبة"
        tasks={tasksByStatus.todo}
        status="todo"
        onDelete={onDeleteTask}
        onCardClick={onTaskClick}
        onDrop={handleDrop}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        draggingTaskId={draggingTaskId}
        canManageTasks={canManageTasks}
        onAddTask={(title) => onQuickAddTask(title, "todo")}
      />
      <TaskColumn
        title="قيد التنفيذ"
        tasks={tasksByStatus.inprogress}
        status="inprogress"
        onDelete={onDeleteTask}
        onCardClick={onTaskClick}
        onDrop={handleDrop}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        draggingTaskId={draggingTaskId}
        canManageTasks={canManageTasks}
        onAddTask={(title) => onQuickAddTask(title, "inprogress")}
      />
      <TaskColumn
        title="المهام المكتملة"
        tasks={tasksByStatus.done}
        status="done"
        onDelete={onDeleteTask}
        onCardClick={onTaskClick}
        onDrop={handleDrop}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        draggingTaskId={draggingTaskId}
        canManageTasks={canManageTasks}
        onAddTask={(title) => onQuickAddTask(title, "done")}
      />
    </div>
  );
};
