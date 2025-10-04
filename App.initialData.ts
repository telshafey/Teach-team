// FIX: Corrected import path for types.
import { Role, TeamMember, Project, Task, DailyLog, Notification, SiteSettings, Meeting, ExpenseClaim } from './types';
import { format } from 'date-fns';

const ROLES: Role[] = [
  { 
    id: 'gm', 
    name: 'مدير عام', 
    permissions: [
      'view_dashboard_gm', 'view_projects_all', 'manage_projects', 'view_team_all', 'manage_team', 
      'generate_performance_notes', 'view_finances', 'manage_freelancer_contracts', 'view_analytics', 
      'view_reports_all', 'manage_meetings', 'manage_roles', 'approve_submissions'
    ] 
  },
  {
    id: 'admin',
    name: 'مسؤول اداري',
    permissions: [
      'view_dashboard_manager', 'view_team_all', 'manage_team', 'manage_roles', 'view_finances'
    ]
  },
  { 
    id: 'pm', 
    name: 'مدير مشروعات', 
    permissions: [
      'view_dashboard_manager', 'view_projects_all', 'manage_projects', 'view_team_all', 
      'generate_performance_notes', 'view_finances', 'manage_freelancer_contracts', 'submit_expenses', 'view_analytics', 
      'view_reports_all', 'approve_submissions', 'manage_meetings'
    ] 
  },
  { 
    id: 'marketing_manager', 
    name: 'مدير تسويق', 
    permissions: [
      'view_dashboard_manager', 'view_projects_all', 'manage_projects', 'view_team_all', 
      'generate_performance_notes', 'view_finances', 'submit_expenses', 'view_analytics', 
      'view_reports_all', 'approve_submissions', 'manage_meetings'
    ] 
  },
  {
    id: 'engineer',
    name: 'مهندس',
    permissions: [
      'view_dashboard_personal', 'view_projects_assigned', 'view_own_financials', 'submit_expenses', 'view_reports_own'
    ]
  },
  { 
    id: 'employee', 
    name: 'موظف', 
    permissions: [
      'view_dashboard_personal', 'view_projects_assigned', 'view_own_financials', 'submit_expenses', 'view_reports_own'
    ] 
  },
  { 
    id: 'freelancer', 
    name: 'مستقل', 
    permissions: [
        'view_dashboard_personal', 'view_projects_assigned', 'view_own_financials'
    ] 
  }
];

const TEAM_MEMBERS: TeamMember[] = [
  { id: 1, name: 'تامر الشافعي', roleId: 'gm', avatarUrl: 'https://i.pravatar.cc/150?u=1', weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 2, name: 'شيماء سعيد', roleId: 'admin', reportsTo: 1, avatarUrl: 'https://i.pravatar.cc/150?u=2', salary: 15000, weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 3, name: 'عمرو حسن', roleId: 'pm', reportsTo: 1, avatarUrl: 'https://i.pravatar.cc/150?u=3', salary: 20000, weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 4, name: 'عبد الرحمن أحمد', roleId: 'marketing_manager', reportsTo: 1, avatarUrl: 'https://i.pravatar.cc/150?u=4', salary: 18000, weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 5, name: 'موظف تجريبي', roleId: 'employee', reportsTo: 3, avatarUrl: 'https://i.pravatar.cc/150?u=5', salary: 8000, weeklyPlan: { hours: {}, status: 'pending' } },
  { id: 6, name: 'عبد الرحمن Flutter', roleId: 'freelancer', reportsTo: 3, avatarUrl: 'https://i.pravatar.cc/150?u=6', hourlyRate: 250, weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 7, name: 'مهندس تجريبي', roleId: 'engineer', reportsTo: 3, avatarUrl: 'https://i.pravatar.cc/150?u=7', salary: 12000, weeklyPlan: { hours: {}, status: 'approved' } },
];

const PROJECTS: Project[] = [
    { id: 'proj_1', name: 'نظام إدارة العملاء (CRM)', description: 'بناء نظام جديد لإدارة علاقات العملاء.', status: 'نشط', budgetHours: 400, budgetAmount: 120000, deadline: '2024-10-31', budgetNotificationSent: null },
    { id: 'proj_2', name: 'حملة إعلانية لمنتج جديد', description: 'إطلاق حملة تسويقية لمنتج "X" الجديد في السوق.', status: 'نشط', budgetHours: 150, budgetAmount: 50000, deadline: '2024-09-15', budgetNotificationSent: null },
];

const TASKS: Task[] = [
  { id: 'task_1', title: 'تحليل المتطلبات لنظام CRM', projectId: 'proj_1', status: 'done', assignedTo: 3, dueDate: '2024-08-15', approvalStatus: 'approved', comments: [], attachments: [] },
  { id: 'task_2', title: 'بناء قاعدة البيانات', projectId: 'proj_1', status: 'inprogress', assignedTo: 7, dueDate: '2024-08-30', approvalStatus: 'approved', comments: [], attachments: [] },
  { id: 'task_3', title: 'تصميم الشعار للحملة الإعلانية', projectId: 'proj_2', status: 'todo', assignedTo: 6, dueDate: '2024-08-20', approvalStatus: 'approved', comments: [], attachments: [] },
  { id: 'task_4', title: 'إعداد خطة المحتوى', projectId: 'proj_2', status: 'todo', assignedTo: 4, dueDate: '2024-08-25', approvalStatus: 'approved', comments: [], attachments: [] },
];

const DAILY_LOGS: DailyLog[] = [
    { id: 'log_1', teamMemberId: 7, date: format(new Date(), 'yyyy-MM-dd'), hours: 5, description: 'العمل على تصميم جداول قاعدة البيانات لنظام CRM.', projectId: 'proj_1', taskId: 'task_2' },
];

const NOTIFICATIONS: Notification[] = [
    { id: 'notif_1', recipientId: 7, type: 'task_assigned', timestamp: new Date().toISOString(), read: false, projectId: 'proj_1', taskId: 'task_2', taskTitle: 'بناء قاعدة البيانات', assignerName: 'عمرو حسن' },
];

const SITE_SETTINGS: SiteSettings = {
    appName: 'Tech Bokra team',
    logoUrl: '/logo.svg',
    themeColor: '#0ea5e9',
    currency: 'EGP',
    isFinanceModuleEnabled: true,
    isMeetingsModuleEnabled: true,
    isAnalyticsModuleEnabled: true,
    isReportsModuleEnabled: true
};

const MEETINGS: Meeting[] = [];

const EXPENSE_CLAIMS: ExpenseClaim[] = [];

export const initialData = {
    roles: ROLES,
    teamMembers: TEAM_MEMBERS,
    projects: PROJECTS,
    tasks: TASKS,
    dailyLogs: DAILY_LOGS,
    notifications: NOTIFICATIONS,
    siteSettings: SITE_SETTINGS,
    meetings: MEETINGS,
    expenseClaims: EXPENSE_CLAIMS
};