import React from "react";
import { Project, Task } from "@shared/types";
import { prepareGanttData } from "@shared/utils/gantt";
import { format, differenceInDays } from "date-fns";
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
      <div
        className="relative"
        style={{ width: `${totalDays * 30}px`, minHeight: "150px" }}
      >
        {/* Month headers */}
        <div className="flex absolute top-0 left-0 right-0 h-8 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 w-full overflow-hidden">
          {(() => {
            const months = [];
            const currentDate = new Date(startDate);
            currentDate.setDate(1);
            while (currentDate <= ganttData.endDate) {
              const i = differenceInDays(currentDate, startDate);
              if (i >= 0 && i <= totalDays) {
                months.push(
                  <div
                    key={currentDate.getTime()}
                    className="absolute text-xs font-semibold text-slate-500 py-1"
                    style={{ right: `${i * 30}px` }}
                  >
                    {format(currentDate, "MMM yyyy", { locale: arSA })}
                  </div>,
                );
              } else if (months.length === 0 && i < 0) {
                months.push(
                  <div
                    key="start"
                    className="absolute text-xs font-semibold text-slate-500 py-1"
                    style={{ right: `0px` }}
                  >
                    {format(startDate, "MMM yyyy", { locale: arSA })}
                  </div>,
                );
              }
              currentDate.setMonth(currentDate.getMonth() + 1);
            }
            return months;
          })()}
        </div>
        {/* Task Rows */}
        <div className="mt-10 space-y-3">
          {ganttTasks.map((task, index) => (
            <div key={task.id} className="flex items-center h-8 relative">
              <div
                className="absolute -right-48 w-44 truncate text-right pr-2 text-sm text-slate-800 dark:text-slate-200 font-medium z-10 bg-white/50 dark:bg-slate-900/50"
                title={task.title}
              >
                {task.title}
              </div>
              <div
                className={`absolute h-6 rounded-md shadow-sm opacity-90 hover:opacity-100 transition-opacity ${
                  task.status === "done"
                    ? "bg-emerald-500"
                    : task.status === "inprogress"
                      ? "bg-amber-500"
                      : "bg-sky-500"
                }`}
                style={{
                  right: `${task.startOffset * 30}px`,
                  width: `${Math.max(task.duration * 30, 15)}px`,
                }}
                title={`${task.title} - ${task.status}`}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
