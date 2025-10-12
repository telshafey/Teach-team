// --- SETTINGS & CONFIG ---

export interface DatabaseSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface SiteSettings {
  appName: string;
  logoUrl: string;
  themeColor: string;
  currency: string;
  overtimeRateMultiplier?: number;
  logEditingDaysLimit?: number;
  isFinanceModuleEnabled: boolean;
  isMeetingsModuleEnabled: boolean;
  isAnalyticsModuleEnabled: boolean;
  isReportsModuleEnabled: boolean;
  databaseSettings: DatabaseSettings;
}

// --- TEAM & ROLES ---

export type Permission =
  | 'manage_projects'
  | 'edit_projects'
  | 'create_tasks'
  | 'edit_tasks'
  | 'delete_tasks'
  | 'manage_team'
  | 'edit_team_members'
  | 'view_all_salaries'
  | 'approve_weekly_plans'
  | 'approve_task_submissions'
  | 'approve_freelancer_contracts'
  | 'approve_overtime'
  | 'approve_leave_requests'
  | 'submit_expenses'
  | 'approve_expense_claims'
  | 'manage_meetings'
  | 'manage_roles'
  | 'manage_site_settings'
  | 'manage_db_settings'
  | 'view_reports'
  | 'view_analytics'
  | 'view_finances'
  | 'use_ai_features'
  | 'approve_work_contract_changes'
  | 'issue_penalties'
  | 'approve_penalties';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export type PlanStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';

export interface TeamMember {
  id: number;
  authUserId?: string;
  name: string;
  email: string;
  avatarUrl: string;
  roleId: string;
  reportsTo?: number;
  salary?: number;
  hourlyRate?: number;
  weeklyHoursRequirement?: number;
  daysOff?: number[];
  weeklyPlan: {
    status: PlanStatus;
    hours: { [key: string]: number };
  };
}

export interface TeamMemberFormData {
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
  reportsTo?: number;
  avatarUrl?: string;
  salary?: number;
  hourlyRate?: number;
  weeklyHoursRequirement?: number;
  daysOff?: number[];
}

// --- PROJECTS & TASKS ---

export type ProjectStatus = 'نشط' | 'مكتمل' | 'معلق';
export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'needs-adjustment';

export type ContractStatus = 'pending' | 'approved' | 'rejected';
export type BillingType = 'fixed' | 'hourly' | 'per-task';

export type ProjectRole = 'Manager' | 'Member';

export interface ProjectMember {
  teamMemberId: number;
  projectRole: ProjectRole;
}

export interface FreelancerContract {
  freelancerId: number;
  type: BillingType;
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
  deadline?: string;
  budgetNotificationSent?: number;
  freelancerContract?: FreelancerContract;
  members?: ProjectMember[];
}

export interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  budgetHours?: number;
  budgetAmount?: number;
  deadline?: string;
}

export interface TaskAttachment {
    id: string;
    taskId: string;
    fileName: string;
    fileUrl: string;
    uploaderId: number;
    timestamp: string;
}

export interface TaskComment {
    id: string;
    taskId: string;
    authorId: number;
    text: string;
    timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  assignedTo?: number;
  status: TaskStatus;
  dueDate?: string;
  approvalStatus: ApprovalStatus;
  approvalNotes?: string;
}

export interface TaskFormData {
  title: string;
  projectId: string;
  status: TaskStatus;
  assignedTo?: number;
  dueDate?: string;
}

export interface SuggestedTask {
  title: string;
  suggestedRole: 'employee' | 'manager' | 'freelancer' | 'any';
}

export interface BillingProposalFormData {
    type: BillingType;
    amount?: number;
    hourlyRate?: number;
}

// --- TIME & LOGS ---

export interface DailyLog {
  id: string;
  date: string;
  hours: number;
  description: string;
  teamMemberId: number;
  projectId?: string;
  taskId?: string;
}

export interface DailyLogFormData {
  hours: number;
  description: string;
  projectId?: string;
  taskId?: string;
}

// --- REQUESTS (LEAVE, OVERTIME, EXPENSE) ---

export type LeaveType = 'regular' | 'emergency';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
    id: string;
    teamMemberId: number;
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    status: LeaveStatus;
    managerNotes?: string;
    createdAt: string;
}

export interface LeaveRequestFormData {
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    createdAt: string;
}

export type OvertimeStatus = 'pending' | 'approved' | 'rejected';

export interface OvertimeRequest {
    id: string;
    teamMemberId: number;
    weekStartDate: string;
    requestedHours: number;
    status: OvertimeStatus;
    managerNotes?: string;
    projectId?: string;
}

export interface OvertimeRequestFormData {
    weekStartDate: string;
    requestedHours: number;
    projectId?: string;
}

export type ExpenseClaimStatus = 'pending' | 'approved' | 'rejected';

export interface ExpenseClaim {
  id: string;
  teamMemberId: number;
  projectId?: string;
  amount: number;
  description: string;
  date: string;
  status: ExpenseClaimStatus;
}

export interface ExpenseClaimFormData {
  teamMemberId: number;
  projectId?: string;
  amount: number;
  description: string;
  date: string;
}

export type WorkContractChangeStatus = 'pending' | 'approved' | 'rejected';

export interface WorkContractChangeRequest {
  id: string;
  teamMemberId: number;
  currentWeeklyHours?: number;
  requestedWeeklyHours: number;
  currentSalary?: number;
  requestedSalary: number;
  reason: string;
  status: WorkContractChangeStatus;
  managerNotes?: string;
  createdAt: string;
  // These are set when a manager approves with different values
  approvedWeeklyHours?: number;
  approvedSalary?: number;
}

export interface WorkContractChangeRequestFormData {
  requestedWeeklyHours: number;
  requestedSalary: number;
  reason: string;
}


// --- MEETINGS & NOTIFICATIONS ---

export type NotificationType = 
    | 'task_assigned' 
    | 'task_approval' 
    | 'budget_alert' 
    | 'freelancer_assigned' 
    | 'comment_mention'
    | 'meeting_scheduled'
    | 'profile_update'
    | 'overtime_request_submitted'
    | 'overtime_request_resolved';

export interface Notification {
  id: string;
  recipientId: number;
  type: NotificationType;
  message?: string;
  taskTitle?: string;
  assignerName?: string;
  assigneeName?: string;
  commentAuthorName?: string;
  projectId?: string;
  taskId?: string;
  read: boolean;
  timestamp: string;
}

export interface Meeting {
  id: string;
  title: string;
  scheduledTime: string;
  members: number[];
  jitsiRoomName: string;
}

export interface MeetingFormData {
  title: string;
  scheduledTime: string;
  members: number[];
}

// --- PENALTIES ---

export type PenaltyStatus = 'pending' | 'approved' | 'appealed' | 'rejected';

export interface Penalty {
  id: string;
  teamMemberId: number;
  issuerId: number;
  reason: string;
  amount: number;
  date: string;
  status: PenaltyStatus;
  appealReason?: string;
  managerNotes?: string;
  createdAt: string;
}

export interface PenaltyFormData {
  teamMemberId: number;
  reason: string;
  amount: number;
  date: string;
}


// --- MISC ---

export interface GlobalSearchResults {
  projects: Pick<Project, 'id' | 'name'>[];
  tasks: Pick<Task, 'id' | 'title' | 'projectId'>[];
  teamMembers: Pick<TeamMember, 'id' | 'name'>[];
}

export type DecisionItem = TeamMember | Task | Project | OvertimeRequest | LeaveRequest | WorkContractChangeRequest | Penalty;