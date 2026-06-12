import React, { useState } from "react";
import { Task, TaskStatus } from "@shared/types";
import { Card } from "../ui/Card";
import { format, isPast, isToday } from "date-fns";
import { arSA } from "date-fns/locale";

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  membersMap: Record<number, string>;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  {
    id: "todo",
    title: "قيد الانتظار",
    color:
      "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50",
  },
  {
    id: "inprogress",
    title: "قيد التنفيذ",
    color: "border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20",
  },
  {
    id: "done",
    title: "مكتملة",
    color:
      "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20",
  },
];

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  onTaskClick,
  onUpdateTaskStatus,
  membersMap,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = "move";
    // Hide the drag ghost or make it transparent
    // e.dataTransfer.setDragImage(e.target as Element, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, statusId: TaskStatus) => {
    e.preventDefault();
    if (draggedTaskId) {
      const task = tasks.find((t) => t.id === draggedTaskId);
      if (task && task.status !== statusId) {
        await onUpdateTaskStatus(draggedTaskId, statusId);
      }
    }
    setDraggedTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full min-h-[500px] overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          className={`flex-1 min-w-[300px] max-w-sm rounded-xl border ${col.color} p-4 flex flex-col`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
              {col.title}
            </h3>
            <span className="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
              {tasks.filter((t) => t.status === col.id).length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {tasks
              .filter((t) => t.status === col.id)
              .map((task) => {
                const isOverdue =
                  task.dueDate &&
                  task.status !== "done" &&
                  isPast(new Date(task.dueDate)) &&
                  !isToday(new Date(task.dueDate));
                const assigneeName = task.assignedTo
                  ? membersMap[task.assignedTo]
                  : "غير مسند";
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskClick(task)}
                    className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative
                                        ${draggedTaskId === task.id ? "opacity-50" : "opacity-100"} ${isOverdue ? "border-r-4 border-r-amber-500" : ""}`}
                  >
                    <h4 className="font-medium text-slate-800 dark:text-slate-100 text-sm mb-2">
                      {task.title}
                    </h4>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {assigneeName?.substring(0, 2) || "?"}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                          {assigneeName}
                        </span>
                      </div>

                      {task.dueDate && (
                        <span
                          className={`text-[10px] px-2 py-1 rounded-md ${isOverdue ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30" : "bg-slate-50 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}
                        >
                          {format(new Date(task.dueDate), "d MMM", {
                            locale: arSA,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};
