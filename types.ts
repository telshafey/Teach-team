// types.ts

export type RoleId = string;

export type Permission = 
  | 'view_dashboard_gm'
  | 'view_dashboard_manager'
  | 'view_dashboard_personal'
  | 'view_analytics'
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
  | 'manage_meetings'
  | 'view_reports_all'
  | 'view_reports_own'
  | 'manage_roles'
  | 'approve_submissions';

export interface Role {
  id: RoleId;
  name: string;
  permissions: Permission[];
}

export type PlanStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';

export interface TeamMember {
  id: number;
  name: string;
  roleId: RoleId;
  reportsTo?: number;
  avatarUrl: string;
  salary?: number;
  hourlyRate?: number;
  weeklyPlan: {
    hours: { [day: string]: number };
    status: PlanStatus;
  };
}

export interface TeamMemberFormData {
  name: string;
  roleId: RoleId;
  reportsTo?: number;
  salary?: number;
  hourlyRate?: number;
  avatarUrl: string;
}

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
  status: ProjectStatus;
  budgetHours?: number;
  customStatusName?: string;
  customStatusColor?: string;
  freelancerContract?: FreelancerContract;
}

export interface ProjectFormData {
    name: string;
    status: ProjectStatus;
    budgetHours?: number;
    customStatusName?: string;
    customStatusColor?: string;
}

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

export interface TaskFormData {
  title: string;
  projectId: string;
  status: TaskStatus;
  assignedTo?: number;
  dueDate?: string;
}

export interface DailyLog {
  id: string;
  teamMemberId: number;
  date: string; // "yyyy-MM-dd"
  hours: number;
  description: string;
  projectId?: string;
  taskId?: string;
}

export interface DailyLogFormData {
    hours: number;
    description: string;
    projectId?: string;
    taskId?: string;
}

export type NotificationType = 'task_assigned' | 'task_approval' | 'new_comment';

export interface BaseNotification {
  id: string;
  recipientId: number;
  timestamp: string;
  read: boolean;
}

export interface TaskAssignedNotification extends BaseNotification {
    type: 'task_assigned';
    assignerName: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
}
export interface TaskApprovalNotification extends BaseNotification {
    type: 'task_approval';
    assigneeName: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
}
export interface NewCommentNotification extends BaseNotification {
    type: 'new_comment';
    commenterName: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
}

export type Notification = TaskAssignedNotification | TaskApprovalNotification | NewCommentNotification;

// FIX: Added NotificationData type to explicitly define the shape of notification data before it's created.
// This helps TypeScript correctly discriminate the union types and avoids excess property errors.
export type NotificationData =
  | Omit<TaskAssignedNotification, 'id' | 'timestamp' | 'read'>
  | Omit<TaskApprovalNotification, 'id' | 'timestamp' | 'read'>
  | Omit<NewCommentNotification, 'id' | 'timestamp' | 'read'>;

export interface SiteSettings {
  appName: string;
  currency: string;
  logoUrl: string;
  themeColor: string;
  isFinanceModuleEnabled: boolean;
  isMeetingsModuleEnabled: boolean;
  isAnalyticsModuleEnabled: boolean;
  isReportsModuleEnabled: boolean;
}

export interface ExpenseClaim {
    id: string;
    teamMemberId: number;
    date: string; // yyyy-MM-dd
    description: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
}

export interface ExpenseClaimFormData {
    description: string;
    amount: number;
}

export interface Meeting {
    id: string;
    title: string;
    scheduledTime: string; // ISO string
    participants: number[];
    jitsiRoomName: string;
}

export interface MeetingFormData {
    title: string;
    scheduledTime: string;
    participants: number[];
}

export interface SuggestedTask {
    title: string;
    suggestedRole: 'employee' | 'manager' | 'freelancer' | 'any';
}

export interface BillingProposalFormData {
    type: ContractType;
    amount?: number;
    hourlyRate?: number;
}