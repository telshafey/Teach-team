// --- SETTINGS ---
export interface MeetingSettings {
  startWithAudioMuted: boolean;
  startWithVideoMuted: boolean;
  hideChat: boolean;
  hidePeople: boolean;
  defaultMeetingRoom: string;
  wherebyHostRoomKey: string;
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
  meetingSettings: MeetingSettings;
  loginTitle?: string;
  loginSubtitle?: string;
  supportEmail?: string;
}

// --- TEAM & ROLES ---
export type Permission =
  | "manage_projects"
  | "edit_projects"
  | "create_tasks"
  | "edit_tasks"
  | "delete_tasks"
  | "approve_task_submissions"
  | "manage_team"
  | "edit_team_members"
  | "approve_weekly_plans"
  | "approve_overtime"
  | "approve_leave_requests"
  | "approve_work_contract_changes"
  | "issue_penalties"
  | "approve_penalties"
  | "view_finances"
  | "view_all_salaries"
  | "submit_expenses"
  | "approve_expense_claims"
  | "approve_freelancer_contracts"
  | "manage_roles"
  | "manage_site_settings"
  | "manage_db_settings"
  | "manage_meetings"
  | "view_reports"
  | "view_analytics"
  | "manage_support_tickets";

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export type EmploymentType = "full-time" | "part-time" | "freelancer";

export type PlanStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs-adjustment";

export interface WeeklyPlan {
  status: PlanStatus;
  hours: { [day: string]: number };
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  authUserId: string;
  roleId: string;
  reportsTo?: number | null;
  avatarUrl: string;
  employmentType: EmploymentType;
  salary?: number | null;
  hourlyRate?: number | null;
  weeklyHoursRequirement?: number | null;
  daysOff: string[];
  weeklyPlan: WeeklyPlan;
}

export interface TeamMemberFormData {
  name: string;
  email: string;
  password?: string;
  roleId: string;
  reportsTo?: number;
  avatarUrl: string;
  employmentType: EmploymentType;
  salary?: number;
  hourlyRate?: number;
  weeklyHoursRequirement?: number;
  daysOff: string[];
}

// --- PROJECTS & TASKS ---
export type ProjectStatus = "نشط" | "مكتمل" | "معلق";

export type ContractStatus = "pending" | "approved" | "rejected";
export type BillingType = "fixed" | "hourly" | "per-task";

export interface FreelancerContract {
  freelancerId: number;
  type: BillingType;
  amount?: number;
  hourlyRate?: number;
  status: ContractStatus;
  notes?: string;
}

export interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  budgetHours?: number;
  budgetAmount?: number;
  deadline?: string;
}

export type ProjectRole = "Manager" | "Member";

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
  freelancerContract?: FreelancerContract;
  budgetNotificationSent?: number;
  members?: ProjectMember[];
}

export interface BillingProposalFormData {
  type: BillingType;
  amount?: number;
  hourlyRate?: number;
}

export type TaskStatus = "todo" | "inprogress" | "done";
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs-adjustment";

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  creatorId: number;
  assignedTo?: number;
  status: TaskStatus;
  dueDate?: string;
  approvalStatus: ApprovalStatus;
  approvalNotes?: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  projectId?: string;
  assignedTo?: number;
  status: TaskStatus;
  dueDate?: string;
}

export interface SuggestedTask {
  title: string;
  suggestedRole: "employee" | "manager" | "freelancer" | "any";
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

// --- TIME LOGGING ---
export interface DailyLog {
  id: string;
  teamMemberId: number;
  projectId?: string;
  taskId?: string;
  date: string; // YYYY-MM-DD
  hours: number;
  description: string;
}

export interface DailyLogFormData {
  hours: number;
  description: string;
  projectId?: string;
  taskId?: string;
}

// --- MEETINGS ---
export interface Meeting {
  id: string;
  title: string;
  roomName: string;
  startTime?: string;
  endTime?: string;
  creatorId: number;
  members?: number[]; // list of teamMember IDs
  attendees?: number[]; // list of teamMember IDs who joined
  projectId?: string;
}

export interface MeetingFormData {
  title: string;
  members: number[];
  startTime: string;
  duration: number; // in minutes
  projectId?: string;
}

// --- NOTIFICATIONS ---
export type NotificationType =
  | "task_assigned"
  | "task_approval"
  | "budget_alert"
  | "freelancer_assigned"
  | "comment_mention"
  | "meeting_scheduled"
  | "profile_update"
  | "overtime_request_submitted"
  | "overtime_request_resolved";

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

// --- REQUESTS (Leave, Overtime, Expense) ---
export type LeaveType = "regular" | "emergency" | "work-from-home";
export type LeaveStatus = "pending" | "approved" | "rejected";

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

export type OvertimeStatus = "pending" | "approved" | "rejected";

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

export type ExpenseClaimStatus = "pending" | "approved" | "rejected";

export interface ExpenseClaim {
  id: string;
  teamMemberId: number;
  amount: number;
  description: string;
  date: string;
  projectId?: string;
  status: ExpenseClaimStatus;
}

export interface ExpenseClaimFormData {
  amount: number;
  description: string;
  date: string;
  projectId?: string;
}

export type WorkContractChangeStatus = "pending" | "approved" | "rejected";
export interface WorkContractChangeRequest {
  id: string;
  teamMemberId: number;
  reason: string;
  currentWeeklyHours?: number;
  currentSalary?: number;
  requestedWeeklyHours: number;
  requestedSalary: number;
  status: WorkContractChangeStatus;
  managerNotes?: string;
  approvedWeeklyHours?: number;
  approvedSalary?: number;
  createdAt: string;
}
export interface WorkContractChangeRequestFormData {
  requestedWeeklyHours: number;
  requestedSalary: number;
  reason: string;
}

export type PenaltyStatus = "pending" | "approved" | "rejected" | "appealed";
export interface Penalty {
  id: string;
  teamMemberId: number;
  issuerId: number;
  date: string;
  amount: number;
  reason: string;
  status: PenaltyStatus;
  appealReason?: string;
  managerNotes?: string;
}

export interface PenaltyFormData {
  teamMemberId: number;
  amount: number;
  reason: string;
  date: string;
}

// --- SUPPORT TICKETS ---
export type TicketStatus = "open" | "in-progress" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "technical" | "billing" | "general";

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  creatorId: number;
  assigneeId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: number;
  text: string;
  isInternal: boolean;
  createdAt: string;
}

// --- MISC ---
export type DecisionItem =
  | Task
  | Project
  | TeamMember
  | OvertimeRequest
  | LeaveRequest
  | WorkContractChangeRequest
  | Penalty
  | ExpenseClaim;

export interface GlobalSearchResults {
  projects: { id: string; name: string }[];
  tasks: { id: string; title: string; projectId: string }[];
  teamMembers: { id: number; name: string }[];
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
