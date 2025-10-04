// All application-wide types are defined here.

export type Permission = 
  // Dashboards
  | 'view_dashboard_gm'
  | 'view_dashboard_manager'
  | 'view_dashboard_personal'
  // Projects
  | 'view_projects_all'
  | 'view_projects_assigned'
  | 'manage_projects'
  // Team
  | 'view_team_all'
  | 'manage_team'
  | 'generate_performance_notes'
  // Finance
  | 'view_finances'
  | 'view_own_financials'
  | 'submit_expenses'
  | 'manage_freelancer_contracts'
  // Reports & Analytics
  | 'view_analytics'
  | 'view_reports_all'
  | 'view_reports_own'
  // Admin
  | 'manage_meetings'
  | 'manage_roles'
  | 'approve_submissions';

export type RoleId = 'gm' | 'manager' | 'employee' | 'freelancer' | string;

export interface Role {
  id: RoleId;
  name: string;
  permissions: Permission[];
}

export type PlanStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';

export interface TeamMember {
  id: number;
  name: string;
  roleId: RoleId;
  avatarUrl: string;
  reportsTo?: number;
  salary?: number;
  hourlyRate?: number;
  weeklyPlan: {
    hours: { [day: string]: number };
    status: PlanStatus;
  };
}
export type TeamMemberFormData = Omit<TeamMember, 'id' | 'weeklyPlan'>;

export type ProjectStatus = 'نشط' | 'مكتمل' | 'معلق' | 'custom';
export type ContractStatus = 'pending' | 'approved' | 'rejected';
export type ContractType = 'fixed' | 'hourly' | 'per-task';

export interface FreelancerContract {
    freelancerId: number;
    type: ContractType;
    amount?: number;
    hourlyRate?: number;
    status: ContractStatus;
    notes?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  customStatusName?: string;
  customStatusColor?: string;
  budgetHours?: number;
  budgetAmount?: number;
  deadline?: string;
  freelancerContract?: FreelancerContract;
}
export type ProjectFormData = Omit<Project, 'id'>;

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';
export type TaskStatus = 'todo' | 'inprogress' | 'done';

export interface TaskComment {
  id: string;
  authorId: number;
  timestamp: string;
  text: string;
}

export interface TaskAttachment {
  id: string;
  uploaderId: number;
  fileName: string;
  fileUrl: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  status: TaskStatus;
  assignedTo?: number;
  dueDate?: string;
  approvalStatus: ApprovalStatus;
  approvalNotes?: string;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
}
export type TaskFormData = Omit<Task, 'id' | 'approvalStatus' | 'approvalNotes' | 'comments' | 'attachments'>;

export interface DailyLog {
  id: string;
  teamMemberId: number;
  date: string; // YYYY-MM-DD
  hours: number;
  description: string;
  projectId?: string;
  taskId?: string;
}
export type DailyLogFormData = Omit<DailyLog, 'id' | 'teamMemberId' | 'date'>;

export type NotificationType = 'task_assigned' | 'task_approval' | 'new_comment';

export interface Notification {
  id: string;
  recipientId: number;
  type: NotificationType;
  timestamp: string; // ISO string
  read: boolean;
  projectId: string;
  taskId: string;
  taskTitle: string;
  // Details based on type
  assignerName?: string;
  assigneeName?: string;
  commenterName?: string;
}

export interface SiteSettings {
    appName: string;
    logoUrl: string;
    themeColor: string;
    currency: string;
    isFinanceModuleEnabled: boolean;
    isMeetingsModuleEnabled: boolean;
    isAnalyticsModuleEnabled: boolean;
    isReportsModuleEnabled: boolean;
}

export interface Meeting {
    id: string;
    title: string;
    scheduledTime: string; // ISO string
    participants: number[];
    jitsiRoomName: string;
}
export type MeetingFormData = Omit<Meeting, 'id' | 'jitsiRoomName'>;

export interface ExpenseClaim {
    id: string;
    teamMemberId: number;
    date: string; // YYYY-MM-DD
    amount: number;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    projectId?: string;
}
export type ExpenseClaimFormData = Omit<ExpenseClaim, 'id' | 'teamMemberId' | 'status'>;

export interface SuggestedTask {
  title: string;
  suggestedRole: 'employee' | 'manager' | 'freelancer' | 'any';
}

export interface BillingProposalFormData {
    type: ContractType;
    amount?: number;
    hourlyRate?: number;
}