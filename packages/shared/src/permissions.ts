import { Permission } from "./types";

// Group permissions for better UI
export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  "المشاريع والمهام": [
    "manage_projects",
    "edit_projects",
    "create_tasks",
    "edit_tasks",
    "delete_tasks",
    "approve_task_submissions",
  ],
  "الفريق والموظفين": [
    "manage_team",
    "edit_team_members",
    "approve_weekly_plans",
    "approve_overtime",
    "approve_leave_requests",
    "approve_work_contract_changes",
    "issue_penalties",
    "approve_penalties",
  ],
  المالية: [
    "view_finances",
    "view_all_salaries",
    "submit_expenses",
    "approve_expense_claims",
    "approve_freelancer_contracts",
  ],
  "النظام والإعدادات": [
    "manage_roles",
    "manage_site_settings",
    "manage_db_settings",
    "manage_support_tickets",
  ],
  أخرى: [
    "manage_meetings",
    "view_reports",
    "view_analytics",
  ],
};

// Simple descriptions for permissions in Arabic
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  manage_projects: "إدارة المشاريع (إضافة/حذف)",
  edit_projects: "تعديل بيانات المشاريع",
  create_tasks: "إنشاء مهام جديدة",
  edit_tasks: "تعديل المهام",
  delete_tasks: "حذف المهام",
  manage_team: "إدارة الفريق (إضافة/حذف أعضاء)",
  edit_team_members: "تعديل بيانات أعضاء الفريق",
  view_all_salaries: "عرض جميع الرواتب",
  approve_weekly_plans: "اعتماد خطط العمل الأسبوعية",
  approve_task_submissions: "اعتماد تسليم المهام",
  approve_freelancer_contracts: "اعتماد عقود المستقلين",
  approve_overtime: "اعتماد طلبات الساعات الإضافية",
  approve_leave_requests: "اعتماد طلبات الإجازات",
  submit_expenses: "تقديم طلبات صرف",
  approve_expense_claims: "اعتماد طلبات الصرف",
  manage_meetings: "إدارة الاجتماعات",
  manage_roles: "إدارة الأدوار والصلاحيات",
  manage_site_settings: "إدارة إعدادات الموقع",
  manage_db_settings: "إدارة إعدادات قاعدة البيانات",
  view_reports: "عرض التقارير",
  view_analytics: "عرض التحليلات",
  view_finances: "عرض البيانات المالية",
  approve_work_contract_changes: "اعتماد طلبات تعديل عقد العمل",
  issue_penalties: "إصدار جزاءات",
  approve_penalties: "اعتماد/رفض الجزاءات",
  manage_support_tickets: "إدارة تذاكر الدعم الفني",
};
