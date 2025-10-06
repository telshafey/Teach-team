import React, { useMemo } from 'react';
import { Project, Task } from '../../types';
import { prepareGanttData } from '../../utils/gantt';
import { format, eachDayOfInterval } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface GanttChartProps {
  project: Project;
  tasks: Task[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ project, tasks }) => {
  const chartData = useMemo(() => prepareGanttData(tasks), [tasks]);

  if (!chartData) {
    return <p className="text-center text-slate-400 p-8">لا توجد مهام ذات تواريخ محددة لعرضها في المخطط.</p>;
  }

  const { tasks: ganttTasks, startDate, totalDays } = chartData;

  const days = eachDayOfInterval({ start: startDate, end: chartData.endDate });

  return (
    <div className="overflow-x-auto p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div style={{ width: `${totalDays * 40}px`, minWidth: '100%' }}>
        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, 40px)` }}>
          {days.map((day, i) => (
            <div key={i} className="text-center text-xs text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 py-2">
              <div>{format(day, 'd')}</div>
              <div className="font-semibold">{format(day, 'EEE', { locale: arSA })}</div>
            </div>
          ))}
        </div>
        
        {/* Task Rows */}
        <div className="relative">
          {ganttTasks.map((task, index) => (
            <div key={task.id} className="h-12 border-t border-slate-200 dark:border-slate-700 relative flex items-center">
              <div
                className="absolute h-8 bg-sky-500/70 rounded-md flex items-center px-2 text-white text-xs font-semibold overflow-hidden"
                style={{
                  right: `${task.startOffset * 40}px`,
                  width: `${task.duration * 40}px`,
                }}
                title={task.title}
              >
                <span className="truncate">{task.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
