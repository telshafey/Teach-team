// App.initialData.ts

import {
  Role,
  TeamMember,
  Project,
  Task,
  DailyLog,
  Notification,
  SiteSettings,
  ExpenseClaim,
  Meeting
} from './types';

// The data structure that will be used to initialize the application's state.
export const initialData: {
  siteSettings: SiteSettings;
  roles: Role[];
  teamMembers: TeamMember[];
  projects: Project[];
  tasks: Task[];
  dailyLogs: DailyLog[];
  notifications: Notification[];
  expenseClaims: ExpenseClaim[];
  meetings: Meeting[];
} = {
  siteSettings: {
    appName: 'تيك تيم',
    currency: 'SAR',
    logoUrl: '',
    themeColor: '#0ea5e9', // sky-500
    isFinanceModuleEnabled: true,
    isMeetingsModuleEnabled: true,
    isAnalyticsModuleEnabled: true,
    isReportsModuleEnabled: true,
  },
  roles: [
    {
      id: 'gm',
      name: 'مدير عام',
      permissions: [
        'view_dashboard_gm', 'view_analytics', 'view_projects_all', 'manage_projects',
        'view_team_all', 'manage_team', 'generate_performance_notes', 'view_finances',
        'view_reports_all', 'manage_roles', 'approve_submissions', 'manage_meetings'
      ]
    },
    {
      id: 'manager',
      name: 'مدير مشروع',
      permissions: [
        'view_dashboard_manager', 'view_projects_assigned', 'manage_projects',
        'view_team_all', 'generate_performance_notes', 'view_own_financials', 'submit_expenses',
        'view_reports_own', 'approve_submissions', 'manage_meetings'
      ]
    },
    {
      id: 'employee',
      name: 'موظف',
      permissions: ['view_dashboard_personal', 'view_projects_assigned', 'view_own_financials', 'submit_expenses', 'view_reports_own']
    },
    {
      id: 'freelancer',
      name: 'مستقل',
       permissions: ['view_dashboard_personal', 'view_projects_assigned', 'view_own_financials', 'submit_expenses', 'manage_freelancer_contracts']
    }
  ],
  teamMembers: [
    {
      id: 1, name: 'علي الأحمد', roleId: 'gm', avatarUrl: 'https://i.pravatar.cc/150?u=1', salary: 25000,
      weeklyPlan: { hours: { 'الأحد': 8, 'الاثنين': 8, 'الثلاثاء': 8, 'الأربعاء': 8, 'الخميس': 8 }, status: 'approved' }
    },
    {
      id: 2, name: 'فاطمة الزهراء', roleId: 'manager', reportsTo: 1, avatarUrl: 'https://i.pravatar.cc/150?u=2', salary: 18000,
      weeklyPlan: { hours: { 'الأحد': 8, 'الاثنين': 8, 'الثلاثاء': 8, 'الأربعاء': 8, 'الخميس': 8 }, status: 'approved' }
    },
    {
      id: 3, name: 'خالد عبدالله', roleId: 'employee', reportsTo: 2, avatarUrl: 'https://i.pravatar.cc/150?u=3', salary: 9000,
      weeklyPlan: { hours: { 'الأحد': 8, 'الاثنين': 8, 'الثلاثاء': 8, 'الأربعاء': 8, 'الخميس': 8 }, status: 'pending' }
    },
    {
      id: 4, name: 'سارة محمد', roleId: 'employee', reportsTo: 2, avatarUrl: 'https://i.pravatar.cc/150?u=4', salary: 9500,
      weeklyPlan: { hours: { 'الأحد': 8, 'الاثنين': 8, 'الثلاثاء': 8, 'الأربعاء': 8, 'الخميس': 8 }, status: 'approved' }
    },
    {
      id: 5, name: 'يوسف إبراهيم', roleId: 'freelancer', reportsTo: 2, avatarUrl: 'https://i.pravatar.cc/150?u=5', hourlyRate: 150,
      weeklyPlan: { hours: { 'الأحد': 6, 'الاثنين': 6, 'الثلاثاء': 4 }, status: 'approved' }
    }
  ],
  projects: [
    { id: 'proj-1', name: 'إطلاق الموقع الجديد', status: 'نشط', budgetHours: 300 },
    { id: 'proj-2', name: 'حملة التسويق للربع الثالث', status: 'نشط', budgetHours: 150 },
    { id: 'proj-3', name: 'تطوير تطبيق الموبايل', status: 'معلق', budgetHours: 500 },
    { id: 'proj-4', name: 'الأرشفة السنوية', status: 'مكتمل', budgetHours: 40 }
  ],
  tasks: [
    { id: 'task-1', title: 'تصميم الواجهة الرئيسية', projectId: 'proj-1', status: 'done', assignedTo: 4, approvalStatus: 'approved' },
    { id: 'task-2', title: 'تطوير الواجهة الأمامية', projectId: 'proj-1', status: 'inprogress', assignedTo: 3, approvalStatus: 'approved' },
    { id: 'task-3', title: 'تطوير الواجهة الخلفية', projectId: 'proj-1', status: 'todo', assignedTo: 5, approvalStatus: 'approved' },
    { id: 'task-4', title: 'إعداد خطة المحتوى', projectId: 'proj-2', status: 'done', assignedTo: 2, approvalStatus: 'approved' },
    { id: 'task-5', title: 'تصميم إعلانات السوشيال ميديا', projectId: 'proj-2', status: 'inprogress', assignedTo: 4, approvalStatus: 'pending' },
  ],
  dailyLogs: [
    { id: 'log-1', teamMemberId: 3, date: '2024-07-20', hours: 6, description: 'العمل على تطوير الواجهة الأمامية للموقع.', projectId: 'proj-1', taskId: 'task-2' },
    { id: 'log-2', teamMemberId: 4, date: '2024-07-20', hours: 8, description: 'إنهاء تصميم الواجهة الرئيسية وبدء العمل على تصميم الإعلانات.', projectId: 'proj-1', taskId: 'task-1' },
    { id: 'log-3', teamMemberId: 2, date: '2024-07-19', hours: 4, description: 'مراجعة خطة المحتوى مع الفريق.', projectId: 'proj-2', taskId: 'task-4' },
  ],
  notifications: [],
  expenseClaims: [
      { id: 'claim-1', teamMemberId: 3, date: '2024-07-18', description: 'اشتراك شهري لبرنامج Figma', amount: 55, status: 'pending' }
  ],
  meetings: [
      { id: 'meet-1', title: 'اجتماع بداية الأسبوع', scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), participants: [1, 2, 3, 4, 5], jitsiRoomName: 'TeemTimeWeeklySync-123' }
  ]
};