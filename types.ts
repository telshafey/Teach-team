// This file contains type definitions used throughout the application.

export type RoleId = 'gm' | 'admin' | 'pm' | 'marketing_manager' | 'engineer' | 'employee' | 'freelancer' | string;

export type Permission =
  | 'view_dashboard_gm'
  | 'view_dashboard_manager'
  | 'view_dashboard_personal'
  | 'view_projects_all'
  | 'view_projects_assigned'
  | 'manage_projects'
  | 'view_team_all'
  | 'manage_team'
  | 'generate_performance_notes'
  | 'view_finances'
  | 'view_own_financials'
  | 'submit_expenses'
  | 'manage_freelancer_contracts'
  | 'view_analytics'
  | 'view_reports_all'
  | 'view_reports_own'
  | 'manage_meetings'
  | 'manage_roles'
  | 'approve_submissions'
  | 'manage_db_settings';

export interface Role {
  id: RoleId;
  name: string;
  permissions: Permission[];
}

export type PlanStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';

export interface WeeklyPlan {
  status: PlanStatus;
  hours: { [day: string]: number };
}

export interface TeamMember {
  id: number;
  auth_user_id?: string;
  name: string;
  email: string;
  roleId: RoleId;
  reportsTo?: number;
  avatarUrl: string;
  salary?: number;
  hourlyRate?: number;
  weeklyPlan: WeeklyPlan;
}

export interface TeamMemberFormData extends Omit<Partial<TeamMember>, 'id' | 'weeklyPlan' | 'auth_user_id'> {
    password?: string;
}

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


export type NotificationType =
  | 'task_assigned'
  | 'task_approval'
  | 'budget_alert'
  | 'freelancer_assigned'
  | 'comment_mention';

export interface Notification {
  id: string;
  recipientId: number;
  type: NotificationType;
  message: string;
  read: boolean;
  timestamp: string; // ISO string
  projectId?: string;
  taskId?: string;
  taskTitle?: string;
  assignerName?: string;
  assigneeName?: string;
  commentAuthorName?: string;
}

export interface Meeting {
  id: string;
  title: string;
  scheduledTime: string; // ISO string
  participants: number[];
  jitsiRoomName: string;
}

export type MeetingFormData = Omit<Meeting, 'id' | 'jitsiRoomName'>;

export type ExpenseClaimStatus = 'pending' | 'approved' | 'rejected';

export interface ExpenseClaim {
  id: string;
  teamMemberId: number;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  status: ExpenseClaimStatus;
  projectId?: string;
}

export type ExpenseClaimFormData = Omit<ExpenseClaim, 'id' | 'status' | 'teamMemberId'>;


export interface DatabaseSettings {
    supabaseUrl: string;
    supabaseAnonKey: string;
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
  databaseSettings: DatabaseSettings;
}

export type ProjectStatus = 'نشط' | 'مكتمل' | 'معلق';
export type ContractStatus = 'pending' | 'approved' | 'rejected';

export interface FreelancerContract {
    freelancerId: number;
    type: 'fixed' | 'hourly' | 'per-task';
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
  budgetHours?: number;
  budgetAmount?: number;
  deadline?: string; // YYYY-MM-DD
  budgetNotificationSent?: number;
  freelancerContract?: FreelancerContract;
}

export type ProjectFormData = Omit<Project, 'id' | 'budgetNotificationSent' | 'freelancerContract'>;


export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';

export interface TaskComment {
    id: string;
    authorId: number;
    text: string;
    timestamp: string;
}

export interface TaskAttachment {
    id: string;
    fileName: string;
    fileUrl: string;
    uploaderId: number;
    timestamp: string;
}


export interface Task {
  id: string;
  title: string;
  projectId: string;
  assignedTo?: number;
  dueDate?: string; // YYYY-MM-DD
  status: TaskStatus;
  approvalStatus: ApprovalStatus;
  approvalNotes?: string;
  comments: TaskComment[];
  attachments: TaskAttachment[];
}

export type TaskFormData = Omit<Task, 'id' | 'approvalStatus' | 'approvalNotes' | 'comments' | 'attachments'>;


export interface SuggestedTask {
    title: string;
    suggestedRole: 'employee' | 'manager' | 'freelancer' | 'any';
}

export interface BillingProposalFormData {
    type: 'fixed' | 'hourly' | 'per-task';
    amount?: number;
    hourlyRate?: number;
}


export interface GlobalSearchResults {
  projects: Pick<Project, 'id' | 'name'>[];
  tasks: Pick<Task, 'id' | 'title' | 'projectId'>[];
  teamMembers: Pick<TeamMember, 'id' | 'name'>[];
}
