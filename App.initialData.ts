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
    id: 'manager', 
    name: 'مدير مشروع', 
    permissions: [
      'view_dashboard_manager', 'view_projects_all', 'manage_projects', 'view_team_all', 
      'generate_performance_notes', 'view_finances', 'submit_expenses', 'view_analytics', 
      'view_reports_all', 'approve_submissions', 'manage_meetings'
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
  { id: 1, name: 'أحمد الغامدي', roleId: 'gm', avatarUrl: 'https://i.pravatar.cc/150?u=1', weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 2, name: 'فاطمة الزهراني', roleId: 'manager', reportsTo: 1, avatarUrl: 'https://i.pravatar.cc/150?u=2', salary: 18000, weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 3, name: 'خالد المصري', roleId: 'employee', reportsTo: 2, avatarUrl: 'https://i.pravatar.cc/150?u=3', salary: 9500, weeklyPlan: { hours: {}, status: 'pending' } },
  { id: 4, name: 'سارة عبدالله', roleId: 'employee', reportsTo: 2, avatarUrl: 'https://i.pravatar.cc/150?u=4', salary: 9200, weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 5, name: 'محمد الشهري', roleId: 'manager', reportsTo: 1, avatarUrl: 'https://i.pravatar.cc/150?u=5', salary: 17500, weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 6, name: 'نورة القحطاني', roleId: 'employee', reportsTo: 5, avatarUrl: 'https://i.pravatar.cc/150?u=6', salary: 10000, weeklyPlan: { hours: {}, status: 'approved' } },
  { id: 7, name: 'جون دو', roleId: 'freelancer', reportsTo: 2, avatarUrl: 'https://i.pravatar.cc/150?u=7', hourlyRate: 150, weeklyPlan: { hours: {}, status: 'approved' } },
];

const PROJECTS: Project[] = [
    { id: 'proj_1', name: 'تطوير تطبيق الجوال', description: 'تطبيق جديد لإدارة المهام الشخصية.', status: 'نشط', budgetHours: 500, budgetAmount: 150000, deadline: '2024-09-30', budgetNotificationSent: null },
    { id: 'proj_2', name: 'حملة تسويقية للربع الرابع', description: 'إطلاق حملة تسويقية رقمية.', status: 'نشط', budgetHours: 250, budgetAmount: 75000, deadline: '2024-10-15', budgetNotificationSent: null },
    { id: 'proj_3', name: 'إعادة تصميم الموقع الإلكتروني', description: 'تحديث واجهة المستخدم وتجربة المستخدم للموقع.', status: 'مكتمل', budgetHours: 300, budgetAmount: 90000, budgetNotificationSent: null },
    { id: 'proj_4', name: 'مشروع المستقل', description: 'مشروع صغير لتصميم شعار.', status: 'نشط', budgetHours: 40, budgetAmount: 6000, deadline: '2024-08-20', budgetNotificationSent: null },
];

const TASKS: Task[] = [
  { id: 'task_1', title: 'تصميم واجهات المستخدم (UI)', projectId: 'proj_1', status: 'done', assignedTo: 3, dueDate: '2024-07-25', approvalStatus: 'approved', comments: [], attachments: [] },
  { id: 'task_2', title: 'بناء الواجهات الخلفية (Backend)', projectId: 'proj_1', status: 'inprogress', assignedTo: 4, dueDate: '2024-08-10', approvalStatus: 'approved', comments: [], attachments: [] },
  { id: 'task_3', title: 'كتابة المحتوى الإعلاني', projectId: 'proj_2', status: 'todo', assignedTo: 6, dueDate: '2024-08-05', approvalStatus: 'approved', comments: [], attachments: [] },
  { id: 'task_4', title: 'تحليل المنافسين', projectId: 'proj_2', status: 'done', assignedTo: 6, approvalStatus: 'pending', comments: [], attachments: [] },
  { id: 'task_5', title: 'اختبار الموقع القديم', projectId: 'proj_3', status: 'done', assignedTo: 4, approvalStatus: 'approved', comments: [], attachments: [] },
  { id: 'task_6', title: 'تصميم الشعار المبدئي', projectId: 'proj_4', status: 'inprogress', assignedTo: 7, dueDate: '2024-08-15', approvalStatus: 'approved', comments: [], attachments: [] },
  { id: 'task_7', title: 'تقديم 3 خيارات للشعار', projectId: 'proj_4', status: 'todo', assignedTo: 7, dueDate: '2024-08-18', approvalStatus: 'approved', comments: [], attachments: [] },
];

const DAILY_LOGS: DailyLog[] = [
    { id: 'log_1', teamMemberId: 3, date: format(new Date(), 'yyyy-MM-dd'), hours: 4.5, description: 'العمل على تصميم الشاشات الرئيسية لتطبيق الجوال.', projectId: 'proj_1', taskId: 'task_1' },
    { id: 'log_2', teamMemberId: 4, date: format(new Date(), 'yyyy-MM-dd'), hours: 6, description: 'تطوير API للمستخدمين.', projectId: 'proj_1', taskId: 'task_2' },
    { id: 'log_3', teamMemberId: 6, date: format(new Date(), 'yyyy-MM-dd'), hours: 2, description: 'بحث عن كلمات مفتاحية للحملة.', projectId: 'proj_2' },
];

const NOTIFICATIONS: Notification[] = [
    { id: 'notif_1', recipientId: 3, type: 'task_assigned', timestamp: new Date().toISOString(), read: false, projectId: 'proj_1', taskId: 'task_1', taskTitle: 'تصميم واجهات المستخدم (UI)', assignerName: 'فاطمة الزهراني' },
    { id: 'notif_2', recipientId: 2, type: 'task_approval', timestamp: new Date().toISOString(), read: true, projectId: 'proj_2', taskId: 'task_4', taskTitle: 'تحليل المنافسين', assigneeName: 'نورة القحطاني' }
];

const SITE_SETTINGS: SiteSettings = {
    appName: 'TeemTime',
    logoUrl: '/logo.svg',
    themeColor: '#0ea5e9',
    currency: 'SAR',
    isFinanceModuleEnabled: true,
    isMeetingsModuleEnabled: true,
    isAnalyticsModuleEnabled: true,
    isReportsModuleEnabled: true
};

const MEETINGS: Meeting[] = [];

const EXPENSE_CLAIMS: ExpenseClaim[] = [
    { id: 'exp_1', teamMemberId: 6, date: format(new Date(), 'yyyy-MM-dd'), amount: 500, description: 'إعلانات فيسبوك', status: 'pending', projectId: 'proj_2' },
    { id: 'exp_2', teamMemberId: 3, date: '2024-07-15', amount: 1200, description: 'شراء خطوط وأيقونات', status: 'approved', projectId: 'proj_1' },
    { id: 'exp_3', teamMemberId: 5, date: '2024-07-20', amount: 350, description: 'اشتراك أدوات تسويق', status: 'approved' },
];

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