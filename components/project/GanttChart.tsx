import React from "react";
import { Project, Task } from "@shared/types";
import { prepareGanttData } from "@shared/utils/gantt";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

interface GanttChartProps {
  project: Project;
  tasks: Task[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ project, tasks }) => {
  const ganttData = prepareGanttData(tasks);

  if (!ganttData) {
    return (
      <p className="text-center text-slate-500 p-4">
        لا توجد مهام ذات تواريخ استحقاق لرسم المخطط.
      </p>
    );
  }

  const { tasks: ganttTasks, startDate, totalDays } = ganttData;

  return (
    <div className="text-sm overflow-x-auto p-4">
      <div className="relative" style={{ width: `${totalDays * 30}px` }}>
        {/* Month headers */}
        <div className="flex sticky top-0 bg-white dark:bg-slate-800 z-10 h-8 border-b">
          {[...Array(totalDays)].map((_, i) => {
            const date = new Date(startDate.getTime());
            date.setDate(date.getDate() + i);
            if (date.getDate() === 1 || i === 0) {
              return (
                <div
                  key={i}
                  className="absolute text-xs font-semibold"
                  style={{ right: `${i * 30}px` }}
                >
                  {format(date, "MMM yyyy", { locale: arSA })}
                </div>
              );
            }
            return null;
          })}
        </div>
        {/* Task Rows */}
        <div className="mt-2 space-y-2">
          {ganttTasks.map((task, index) => (
            <div key={task.id} className="flex items-center h-8">
              <div className="w-32 truncate text-right pr-2 absolute -right-32">
                {task.title}
              </div>
              <div
                className="absolute h-6 bg-sky-500 rounded"
                style={{
                  right: `${task.startOffset * 30}px`,
                  width: `${task.duration * 30}px`,
                }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
