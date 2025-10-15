// PERMISSIONS
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

// ROLES & TEAM
export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export type PlanStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';

export interface WeeklyPlan {
    status: PlanStatus;
    hours: { [key: string]: number };
}

export interface TeamMember {
  id: number;
  authUserId: string;
  name: string;
  email: string;
  roleId: string;
  reportsTo?: number;
  avatarUrl: string;
  salary?: number;
  hourlyRate?: number;
  weeklyHoursRequirement?: number;
  daysOff: number[];
  weeklyPlan: WeeklyPlan;
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


// PROJECTS & TASKS
export type ProjectStatus = 'نشط' | 'مكتمل' | 'معلق';
export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs-adjustment';
export type ContractStatus = 'pending' | 'approved' | 'rejected';

export interface SuggestedTask {
    title: string;
    suggestedRole: 'employee' | 'manager' | 'freelancer' | 'any';
}

export interface BillingProposalFormData {
    type: 'fixed' | 'hourly' | 'per-task';
    amount?: number;
    hourlyRate?: number;
}

export interface FreelancerContract extends BillingProposalFormData {
    freelancerId: number;
    status: ContractStatus;
    notes?: string;
}

export type ProjectRole = 'Manager' | 'Member';
export interface ProjectMember {
    teamMemberId: number;
    projectRole: ProjectRole;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  budgetHours?: number;
  budgetAmount?: number;
  deadline?: string;
  creatorId: number;
  members: ProjectMember[];
  freelancerContract?: FreelancerContract;
  budgetNotificationSent?: number;
}

export interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  budgetHours?: number;
  budgetAmount?: number;
  deadline?: string;
}

export interface Task {
  id: string;
  title: string;
  projectId?: string;
  assignedTo?: number;
  dueDate?: string;
  status: TaskStatus;
  approvalStatus: ApprovalStatus;
  approvalNotes?: string;
  creatorId: number;
}

export interface TaskFormData {
  title: string;
  projectId?: string;
  assignedTo?: number;
  dueDate?: string;
  status: TaskStatus;
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

// TIME & LOGS
export interface DailyLog {
  id: string;
  teamMemberId: number;
  date: string;
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

// REQUESTS
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
export type LeaveRequestFormData = Omit<LeaveRequest, 'id' | 'teamMemberId' | 'status' | 'managerNotes'>;

export type OvertimeStatus = 'pending' | 'approved' | 'rejected';
export interface OvertimeRequest {
    id: string;
    teamMemberId: number;
    weekStartDate: string;
    requestedHours: number;
    projectId?: string;
    status: OvertimeStatus;
    managerNotes?: string;
}
export type OvertimeRequestFormData = Omit<OvertimeRequest, 'id' | 'teamMemberId' | 'status' | 'managerNotes'>;

export type ExpenseClaimStatus = 'pending' | 'approved' | 'rejected';
export interface ExpenseClaim {
    id: string;
    teamMemberId: number;
    amount: number;
    description: string;
    date: string;
    projectId?: string;
    status: ExpenseClaimStatus;
}
export type ExpenseClaimFormData = Omit<ExpenseClaim, 'id' | 'status' | 'teamMemberId'>;

export type WorkContractChangeStatus = 'pending' | 'approved' | 'rejected';
export interface WorkContractChangeRequest {
    id: string;
    teamMemberId: number;
    currentWeeklyHours?: number;
    currentSalary?: number;
    requestedWeeklyHours: number;
    requestedSalary: number;
    reason: string;
    status: WorkContractChangeStatus;
    managerNotes?: string;
    approvedWeeklyHours?: number;
    approvedSalary?: number;
    createdAt: string;
}
export type WorkContractChangeRequestFormData = Pick<WorkContractChangeRequest, 'requestedWeeklyHours' | 'requestedSalary' | 'reason'>;

export type PenaltyStatus = 'pending' | 'approved' | 'appealed' | 'rejected';
export interface Penalty {
    id: string;
    teamMemberId: number;
    issuerId: number;
    amount: number;
    reason: string;
    date: string;
    status: PenaltyStatus;
    managerNotes?: string;
    appealReason?: string;
    createdAt: string;
}
export type PenaltyFormData = Omit<Penalty, 'id' | 'issuerId' | 'status' | 'managerNotes' | 'appealReason' | 'createdAt'>;

export type DecisionItem = Task | Project | TeamMember | OvertimeRequest | LeaveRequest | WorkContractChangeRequest | Penalty;


// MEETINGS
export interface Meeting {
  id: string;
  title: string;
  roomName: string;
  scheduledTime: string; // ISO string
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  creatorId: number;
  members: number[];
  attendees?: number[]; // who actually joined
  projectId?: string;
}

export interface MeetingFormData {
  title: string;
  members: number[];
  startTime: string;
  duration: number; // in minutes
  projectId?: string;
}

// NOTIFICATIONS
export interface Notification {
  id: string;
  recipientId: number;
  type: 'task_assigned' | 'task_approval' | 'budget_alert' | 'freelancer_assigned' | 'comment_mention' | 'meeting_scheduled' | 'profile_update' | 'overtime_request_submitted' | 'overtime_request_resolved';
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


// SETTINGS
export interface DatabaseSettings {
    supabaseUrl: string;
    supabaseAnonKey: string;
}

export interface MeetingSettings {
    startWithAudioMuted: boolean;
    startWithVideoMuted: boolean;
    hideChat: boolean;
    hidePeople: boolean;
    defaultMeetingRoom: string;
    wherebyHostRoomKey?: string;
}

export interface SiteSettings {
    appName: string;
    logoUrl: string;
    themeColor: string;
    currency: string;
    overtimeRateMultiplier: number;
    logEditingDaysLimit: number;
    isFinanceModuleEnabled: boolean;
    isMeetingsModuleEnabled: boolean;
    isAnalyticsModuleEnabled: boolean;
    isReportsModuleEnabled: boolean;
    databaseSettings: DatabaseSettings;
    meetingSettings?: MeetingSettings;
}

// MISC
export interface GlobalSearchResults {
  projects: Pick<Project, 'id' | 'name'>[];
  tasks: Pick<Task, 'id' | 'title' | 'projectId'>[];
  teamMembers: Pick<TeamMember, 'id' | 'name'>[];
}

export interface SalarySlipData {
    member: TeamMember;
    month: Date;
    baseSalary: number;
    overtimePay: number;
    expensesReimbursed: number;
    penaltiesDeducted: number;
    netSalary: number;
}
