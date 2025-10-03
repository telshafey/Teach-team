import { 
    Project, Task, TeamMember, DailyLog, Role, SiteSettings, ProjectFormData, TaskFormData,
    TaskStatus, ApprovalStatus, TaskComment, TaskAttachment, PlanStatus, TeamMemberFormData,
    ExpenseClaim, ExpenseClaimFormData, BillingProposalFormData, ContractStatus, Meeting, MeetingFormData, DailyLogFormData, RoleId
} from '../types';
// FIX: Changed import path to the correct initial data file.
import { initialData } from '../App.initialData';

const LocalStorageKey = 'teem_time_app_data';

const getAppData = () => {
    try {
        const data = localStorage.getItem(LocalStorageKey);
        if (data) {
            const parsedData = JSON.parse(data);
            // Merge with initial data to ensure new fields are present
            const mergedSettings = { ...initialData.siteSettings, ...parsedData.siteSettings };
            return { ...parsedData, siteSettings: mergedSettings };
        }
    } catch (e) {
        console.error("Failed to parse data from localStorage", e);
    }
    // If no data, return initial data
    return initialData;
};

const saveAppData = (data: any) => {
    localStorage.setItem(LocalStorageKey, JSON.stringify(data));
};

let appData = getAppData();

const simulateApiDelay = <T>(data: T): Promise<T> => 
    new Promise(resolve => setTimeout(() => resolve(data), 200));

// Site Settings
export const fetchSiteSettings = (): Promise<SiteSettings> => simulateApiDelay(appData.siteSettings);
export const updateSiteSettings = (settings: SiteSettings): Promise<void> => {
    appData.siteSettings = settings;
    saveAppData(appData);
    return simulateApiDelay(undefined);
};

// Roles
export const fetchRoles = (): Promise<Role[]> => simulateApiDelay(appData.roles);
export const addRole = (roleData: { name: string }): Promise<Role> => {
    const newRole: Role = {
        id: `role-${Date.now()}`,
        name: roleData.name,
        permissions: [],
    };
    appData.roles.push(newRole);
    saveAppData(appData);
    return simulateApiDelay(newRole);
};
export const deleteRole = (roleId: RoleId): Promise<void> => {
    const isRoleInUse = appData.teamMembers.some((m: TeamMember) => m.roleId === roleId);
    if (isRoleInUse) {
        return Promise.reject(new Error('لا يمكن حذف هذا الدور لأنه معين لأعضاء في الفريق.'));
    }
    appData.roles = appData.roles.filter((r: Role) => r.id !== roleId);
    saveAppData(appData);
    return simulateApiDelay(undefined);
};
export const updateRole = (role: Role): Promise<void> => {
    appData.roles = appData.roles.map((r: Role) => r.id === role.id ? role : r);
    saveAppData(appData);
    return simulateApiDelay(undefined);
};

// Team Members
export const fetchTeamMembers = (): Promise<TeamMember[]> => simulateApiDelay(appData.teamMembers);
export const addTeamMember = (memberData: TeamMemberFormData): Promise<TeamMember> => {
    const newMember: TeamMember = {
        id: Date.now(),
        ...memberData,
        weeklyPlan: { hours: {}, status: 'approved' },
    };
    appData.teamMembers.push(newMember);
    saveAppData(appData);
    return simulateApiDelay(newMember);
};
export const updateTeamMember = (member: TeamMember): Promise<TeamMember> => {
    appData.teamMembers = appData.teamMembers.map((m: TeamMember) => m.id === member.id ? member : m);
    saveAppData(appData);
    return simulateApiDelay(member);
};
export const updatePlanStatus = (memberId: number, status: PlanStatus): Promise<TeamMember> => {
    let updatedMember: TeamMember | null = null;
    appData.teamMembers = appData.teamMembers.map((m: TeamMember) => {
        if (m.id === memberId) {
            updatedMember = { ...m, weeklyPlan: { ...m.weeklyPlan, status } };
            return updatedMember;
        }
        return m;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedMember!);
};
export const bulkUpdatePlanStatus = (memberIds: number[], status: PlanStatus): Promise<TeamMember[]> => {
    const updatedMembers: TeamMember[] = [];
    appData.teamMembers = appData.teamMembers.map((m: TeamMember) => {
        if (memberIds.includes(m.id)) {
            const updated = { ...m, weeklyPlan: { ...m.weeklyPlan, status } };
            updatedMembers.push(updated);
            return updated;
        }
        return m;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedMembers);
};


// Projects
export const fetchProjects = (): Promise<Project[]> => simulateApiDelay(appData.projects);
export const addProject = (projectData: ProjectFormData): Promise<Project> => {
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        ...projectData,
    };
    appData.projects.push(newProject);
    saveAppData(appData);
    return simulateApiDelay(newProject);
};
export const updateProject = (project: Project): Promise<void> => {
    appData.projects = appData.projects.map((p: Project) => p.id === project.id ? project : p);
    saveAppData(appData);
    return simulateApiDelay(undefined);
};

// Tasks
export const fetchTasks = (): Promise<Task[]> => simulateApiDelay(appData.tasks);
export const addTask = (taskData: TaskFormData): Promise<Task> => {
    const newTask: Task = {
        id: `task-${Date.now()}`,
        ...taskData,
        approvalStatus: 'approved',
        comments: [],
        attachments: [],
    };
    appData.tasks.push(newTask);
    saveAppData(appData);
    return simulateApiDelay(newTask);
};
export const updateTask = (task: Task): Promise<Task> => {
    appData.tasks = appData.tasks.map((t: Task) => t.id === task.id ? task : t);
    saveAppData(appData);
    return simulateApiDelay(task);
};
export const updateTaskStatus = (taskId: string, status: TaskStatus): Promise<Task> => {
    let updatedTask: Task | null = null;
    appData.tasks = appData.tasks.map((t: Task) => {
        if (t.id === taskId) {
            updatedTask = { ...t, status, approvalStatus: status === 'done' ? 'pending' : 'approved' };
            return updatedTask;
        }
        return t;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedTask!);
};
export const updateTaskApproval = (taskId: string, status: ApprovalStatus, notes?: string): Promise<Task> => {
    let updatedTask: Task | null = null;
    appData.tasks = appData.tasks.map((t: Task) => {
        if (t.id === taskId) {
            updatedTask = { ...t, approvalStatus: status, approvalNotes: notes };
            return updatedTask;
        }
        return t;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedTask!);
};
export const bulkUpdateTaskApproval = (taskIds: string[], status: ApprovalStatus): Promise<Task[]> => {
    const updatedTasks: Task[] = [];
    appData.tasks = appData.tasks.map((t: Task) => {
        if (taskIds.includes(t.id)) {
            const updated = { ...t, approvalStatus: status };
            updatedTasks.push(updated);
            return updated;
        }
        return t;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedTasks);
};

export const addTaskComment = (taskId: string, commentData: Omit<TaskComment, 'id'>): Promise<Task> => {
    let updatedTask: Task | null = null;
    appData.tasks = appData.tasks.map((t: Task) => {
        if (t.id === taskId) {
            const newComment = { ...commentData, id: `comment-${Date.now()}` };
            updatedTask = { ...t, comments: [...(t.comments || []), newComment] };
            return updatedTask;
        }
        return t;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedTask!);
};

export const addTaskAttachment = (taskId: string, attachmentData: Omit<TaskAttachment, 'id'>): Promise<Task> => {
    let updatedTask: Task | null = null;
    appData.tasks = appData.tasks.map((t: Task) => {
        if (t.id === taskId) {
            const newAttachment = { ...attachmentData, id: `attachment-${Date.now()}` };
            updatedTask = { ...t, attachments: [...(t.attachments || []), newAttachment] };
            return updatedTask;
        }
        return t;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedTask!);
};


// Daily Logs
export const fetchDailyLogs = (): Promise<DailyLog[]> => simulateApiDelay(appData.dailyLogs);
export const addDailyLog = (logData: DailyLogFormData & { teamMemberId: number, date: string }): Promise<DailyLog> => {
    const newLog = { ...logData, id: `log-${Date.now()}` };
    appData.dailyLogs.push(newLog);
    saveAppData(appData);
    return simulateApiDelay(newLog);
};
export const updateDailyLog = (log: DailyLog): Promise<void> => {
    appData.dailyLogs = appData.dailyLogs.map((l: DailyLog) => l.id === log.id ? log : l);
    saveAppData(appData);
    return simulateApiDelay(undefined);
};
export const deleteDailyLog = (logId: string): Promise<void> => {
    appData.dailyLogs = appData.dailyLogs.filter((l: DailyLog) => l.id !== logId);
    saveAppData(appData);
    return simulateApiDelay(undefined);
};

// Finance
export const fetchExpenseClaims = (): Promise<ExpenseClaim[]> => simulateApiDelay(appData.expenseClaims);
export const addExpenseClaim = (claimData: ExpenseClaimFormData, memberId: number): Promise<ExpenseClaim> => {
    const newClaim: ExpenseClaim = {
        id: `claim-${Date.now()}`,
        teamMemberId: memberId,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        ...claimData,
    };
    appData.expenseClaims.push(newClaim);
    saveAppData(appData);
    return simulateApiDelay(newClaim);
};
export const updateExpenseClaimStatus = (claimId: string, status: 'approved' | 'rejected'): Promise<ExpenseClaim> => {
    let updatedClaim: ExpenseClaim | null = null;
    appData.expenseClaims = appData.expenseClaims.map((c: ExpenseClaim) => {
        if (c.id === claimId) {
            updatedClaim = { ...c, status };
            return updatedClaim;
        }
        return c;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedClaim!);
};
export const proposeBilling = (projectId: string, proposal: BillingProposalFormData, freelancerId: number): Promise<Project> => {
    let updatedProject: Project | null = null;
    appData.projects = appData.projects.map((p: Project) => {
        if (p.id === projectId) {
            updatedProject = { ...p, freelancerContract: { ...proposal, freelancerId, status: 'pending' }};
            return updatedProject;
        }
        return p;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedProject!);
};
export const resolveBilling = (projectId: string, status: ContractStatus, notes: string): Promise<Project> => {
    let updatedProject: Project | null = null;
    appData.projects = appData.projects.map((p: Project) => {
        if (p.id === projectId && p.freelancerContract) {
            updatedProject = { ...p, freelancerContract: { ...p.freelancerContract, status, notes }};
            return updatedProject;
        }
        return p;
    });
    saveAppData(appData);
    return simulateApiDelay(updatedProject!);
};

// Meetings
export const fetchMeetings = (): Promise<Meeting[]> => simulateApiDelay(appData.meetings);
export const addMeeting = (meetingData: MeetingFormData): Promise<Meeting> => {
    const newMeeting: Meeting = {
        id: `meet-${Date.now()}`,
        jitsiRoomName: `TeemTimeMeeting-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ...meetingData
    };
    appData.meetings.push(newMeeting);
    saveAppData(appData);
    return simulateApiDelay(newMeeting);
}