import { Project, Task, TeamMember, DailyLog, ExpenseClaim } from "../types";
import { parseISO, isWithinInterval } from "date-fns";

interface Filters {
  dateFrom: string;
  dateTo: string;
  projectId?: string;
  memberId?: string;
  includeUnassigned?: boolean;
}

const dateFilter = (dateStr: string, filters: Filters) => {
  if (!filters.dateFrom && !filters.dateTo) return true;
  const date = parseISO(dateStr);
  const start = filters.dateFrom ? parseISO(filters.dateFrom) : new Date(0);
  const end = filters.dateTo ? parseISO(filters.dateTo) : new Date();
  
  if (filters.dateTo) {
    end.setHours(23, 59, 59, 999);
  }
  
  return isWithinInterval(date, { start, end });
};

export const generateProjectsSummary = (
  projects: Project[],
  dailyLogs: DailyLog[],
  filters: Filters,
): { headers: string[]; rows: any[][] } => {
  const headers = [
    "المشروع",
    "الحالة",
    "إجمالي الساعات المسجلة",
    "التكلفة التقديرية",
  ];
  const rows = projects.map((p) => {
    const projectLogs = dailyLogs.filter(
      (l) => l.projectId === p.id && dateFilter(l.date, filters),
    );
    const totalHours = projectLogs.reduce((sum, l) => sum + l.hours, 0);
    return [p.name, p.status, totalHours.toFixed(2), "N/A"];
  });
  return { headers, rows };
};

export const generateTasksDetail = (
  tasks: Task[],
  projects: Project[],
  teamMembers: TeamMember[],
  filters: Filters,
): { headers: string[]; rows: any[][] } => {
  const headers = [
    "المهمة",
    "المشروع",
    "مسندة إلى",
    "الحالة",
    "تاريخ الاستحقاق",
  ];
  let tasksToReport = tasks;
  if (filters.includeUnassigned) {
    tasksToReport = tasksToReport.filter((t) => !t.assignedTo);
  }
  if (filters.projectId) {
    tasksToReport = tasksToReport.filter(
      (t) => t.projectId === filters.projectId,
    );
  }
  const rows = tasksToReport.map((t) => {
    const assignee = teamMembers.find((m) => m.id === t.assignedTo);
    const project = projects.find((p) => p.id === t.projectId);
    return [
      t.title,
      project?.name || "",
      assignee?.name || "غير مسندة",
      t.status,
      t.dueDate || "",
    ];
  });
  return { headers, rows };
};

export const generateEmployeePerformance = (
  dailyLogs: DailyLog[],
  projects: Project[],
  filters: Filters,
  byProject: boolean,
): { headers: string[]; rows: any[][] } | null => {
  if (!filters.memberId) return null;
  const headers = ["التاريخ", "المشروع", "الوصف", "الساعات"];

  const logsToReport = dailyLogs.filter(
    (l) =>
      l.teamMemberId === Number(filters.memberId) &&
      dateFilter(l.date, filters) &&
      (!byProject || !filters.projectId || l.projectId === filters.projectId),
  );

  const rows: any[][] = logsToReport.map((l) => [
    l.date,
    projects.find((p) => p.id === l.projectId)?.name || "N/A",
    l.description,
    l.hours,
  ]);

  const totalHours = logsToReport.reduce((sum, log) => sum + log.hours, 0);
  rows.push(["", "", "المجموع", totalHours.toFixed(2)]);
  return { headers, rows };
};

export const generateExpenses = (
  expenseClaims: ExpenseClaim[],
  projects: Project[],
  teamMembers: TeamMember[],
  currency: string,
  filters: Filters,
  byProject: boolean,
): { headers: string[]; rows: any[][] } => {
  const headers = ["التاريخ", "الموظف", "المشروع", "المبلغ", "الوصف"];

  const claimsToReport = expenseClaims.filter(
    (e) =>
      dateFilter(e.date, filters) &&
      e.status === "approved" &&
      (!byProject || !filters.projectId || e.projectId === filters.projectId),
  );

  const rows: any[][] = claimsToReport.map((e) => {
    const member = teamMembers.find((m) => m.id === e.teamMemberId);
    const project = projects.find((p) => p.id === e.projectId);
    return [
      e.date,
      member?.name || "",
      project?.name || "N/A",
      `${e.amount} ${currency}`,
      e.description,
    ];
  });

  const totalAmount = claimsToReport.reduce(
    (sum, claim) => sum + claim.amount,
    0,
  );
  rows.push(["", "", "", `المجموع: ${totalAmount.toFixed(2)} ${currency}`, ""]);
  return { headers, rows };
};
