export type RoleId = 'gm' | 'manager' | 'employee' | 'freelancer' | string;

export type Permission =
  | 'view_dashboard_gm' | 'view_dashboard_manager' | 'view_dashboard_personal'
  | 'view_projects_all' | 'view_projects_assigned' | 'manage_projects'
  | 'view_team_all' | 'manage_team' | 'generate_performance_notes'
  | 'view_finances' | 'view_own_financials' | 'submit_expenses' | 'manage_freelancer_contracts'
  | 'view_analytics' | 'view_reports_all' | 'view_reports_own'
  | 'manage_meetings' | 'manage_roles' | 'approve_submissions';

export interface Role {
  id: RoleId;
  name: string;
  permissions: Permission[];
}

export type PlanStatus = 'pending' | 'approved' | 'rejected';

export interface WeeklyPlan {
  hours: Record<string, number>;
  status: PlanStatus;
}

export interface TeamMember {
  id: number;
  name: string;
  roleId: RoleId;
  reportsTo?: number;
  avatarUrl: string;
  salary?: number;
  hourlyRate?: number;
  weeklyPlan: WeeklyPlan;
}
export type TeamMemberFormData = Omit<TeamMember, 'id' | 'weeklyPlan'>;


export type ProjectStatus = 'نشط' | 'مكتمل' | 'معلق' | 'custom';

export type ContractStatus = 'pending' | 'approved' | 'rejected';
export type BillingType = 'fixed' | 'hourly' | 'per-task';

export interface FreelancerContract {
    freelancerId: number;
    status: ContractStatus;
    type: BillingType;
    amount?: number;
    hourlyRate?: number;
    notes?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  budgetHours?: number;
  budgetAmount?: number;
  deadline?: string;
  budgetNotificationSent: 'warning' | 'critical' | null;
  customStatusName?: string;
  customStatusColor?: string;
  freelancerContract?: FreelancerContract;
}
export type ProjectFormData = Omit<Project, 'id' | 'budgetNotificationSent' | 'customStatusName' | 'customStatusColor' | 'freelancerContract'>;


export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';

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
    timestamp: string;
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
  comments: TaskComment[];
  attachments: TaskAttachment[];
}
export type TaskFormData = Omit<Task, 'id' | 'approvalStatus' | 'approvalNotes' | 'comments' | 'attachments'>;
export interface SuggestedTask {
  title: string;
  suggestedRole: 'employee' | 'manager' | 'freelancer' | 'any';
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

export type NotificationType = 'task_assigned' | 'task_approval' | 'budget_alert' | 'freelancer_assigned';

export interface Notification {
  id: string;
  recipientId: number;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  projectId: string;
  taskId: string;
  taskTitle: string;
  assignerName?: string;
  assigneeName?: string;
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
    date: string;
    amount: number;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    projectId?: string;
}

export type ExpenseClaimFormData = Omit<ExpenseClaim, 'id'>;

export type BillingProposalFormData = Pick<FreelancerContract, 'type' | 'amount' | 'hourlyRate'>;