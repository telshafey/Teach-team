import { Task } from "../types";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  parseISO,
} from "date-fns";

export interface GanttChartData {
  tasks: GanttTask[];
  startDate: Date;
  endDate: Date;
  totalDays: number;
}

export interface GanttTask extends Task {
  startOffset: number;
  duration: number;
}

export const prepareGanttData = (tasks: Task[]): GanttChartData | null => {
  const validTasks = tasks.filter((t) => t.dueDate);
  if (validTasks.length === 0) return null;

  const dates = validTasks.map((t) => parseISO(t.dueDate!));
  const earliest = new Date(
    Math.min.apply(
      null,
      dates.map((d) => d.getTime()),
    ),
  );
  const latest = new Date(
    Math.max.apply(
      null,
      dates.map((d) => d.getTime()),
    ),
  );

  const chartStartDate = startOfMonth(earliest);
  const chartEndDate = endOfMonth(latest);

  let totalDays = differenceInDays(chartEndDate, chartStartDate) + 1;
  
  if (totalDays > 3650) {
    // Limit to 10 years to prevent layout crash
    totalDays = 3650;
    chartEndDate.setFullYear(chartStartDate.getFullYear() + 10);
  }

  const ganttTasks: GanttTask[] = validTasks.map((task) => {
    // A simple approximation for start date and duration
    const endDate = parseISO(task.dueDate!);
    const duration = 5; // Assume a fixed 5-day duration for demo purposes
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - duration);

    const startOffset = differenceInDays(startDate, chartStartDate);

    return {
      ...task,
      startOffset: Math.max(0, startOffset),
      duration: duration,
    };
  });

  return {
    tasks: ganttTasks,
    startDate: chartStartDate,
    endDate: chartEndDate,
    totalDays,
  };
};
