import { initialData } from '../App.initialData';
import {
  Project,
  Task,
  TeamMember,
  Role,
  DailyLog,
  Notification,
  SiteSettings,
  Meeting,
  ExpenseClaim,
  ProjectFormData,
  TaskFormData,
  TaskStatus,
  ApprovalStatus,
  TaskComment,
  TaskAttachment,
  BillingProposalFormData,
  ContractStatus,
  ExpenseClaimFormData,
} from '../types';

const LS_KEY = 'teemtime_data';

const getData = () => {
  try {
    const data = localStorage.getItem(LS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Could not parse localStorage data", error);
  }
  return initialData;
};

const saveData = (data: any) => {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Initialize data if not present
if (!localStorage.getItem(LS_KEY)) {
  saveData(initialData);
}

// --- Projects ---
export const fetchProjects = async (): Promise<Project[]> => {
  await delay(200);
  return getData().projects;
};

export const addProject = async (projectData: ProjectFormData): Promise<Project> => {
  await delay(300);
  const data = getData();
  const newProject: Project = { ...projectData, id: `proj_${Date.now()}` };
  data.projects.push(newProject);
  saveData(data);
  return newProject;
};

export const updateProject = async (project: Project): Promise<Project> => {
  await delay(300);
  const data = getData();
  data.projects = data.projects.map((p: Project) => p.id === project.id ? project : p);
  saveData(data);
  return project;
};

// --- Tasks ---
export const fetchTasks = async (): Promise<Task[]> => {
  await delay(200);
  return getData().tasks;
};

export const addTask = async (taskData: TaskFormData): Promise<Task> => {
    await delay(300);
    const data = getData();
    const newTask: Task = {
        ...taskData,
        id: `task_${Date.now()}`,
        approvalStatus: 'approved',
        comments: [],
        attachments: []
    };
    data.tasks.push(newTask);
    saveData(data);
    return newTask;
};

export const updateTask = async (task: Task): Promise<Task> => {
  await delay(300);
  const data = getData();
  data.tasks = data.tasks.map((t: Task) => t.id === task.id ? task : t);
  saveData(data);
  return task;
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<Task> => {
    await delay(200);
    const data = getData();
    const task = data.tasks.find((t: Task) => t.id === taskId);
    if (task) {
        task.status = status;
        if (status === 'done') {
            task.approvalStatus = 'pending';
        }
        saveData(data);
        return task;
    }
    throw new Error("Task not found");
};

export const updateTaskApproval = async (taskId: string, status: ApprovalStatus, notes?: string): Promise<Task> => {
    await delay(200);
    const data = getData();
    const task = data.tasks.find((t: Task) => t.id === taskId);
    if (task) {
        task.approvalStatus = status;
        task.approvalNotes = notes;
        saveData(data);
        return task;
    }
    throw new Error("Task not found");
};

export const bulkUpdateTaskApproval = async (taskIds: string[], status: ApprovalStatus): Promise<Task[]> => {
    await delay(500);
    const data = getData();
    const updatedTasks: Task[] = [];
    data.tasks.forEach((task: Task) => {
        if (taskIds.includes(task.id)) {
            task.approvalStatus = status;
            updatedTasks.push(task);
        }
    });
    saveData(data);
    return updatedTasks;
};

export const addTaskComment = async (taskId: string, comment: Omit<TaskComment, 'id'>): Promise<Task> => {
    await delay(300);
    const data = getData();
    const task = data.tasks.find((t: Task) => t.id === taskId);
    if (task) {
        if (!task.comments) task.comments = [];
        task.comments.push({ ...comment, id: `comment_${Date.now()}` });
        saveData(data);
        return task;
    }
    throw new Error("Task not found");
};

export const addTaskAttachment = async (taskId: string, attachment: Omit<TaskAttachment, 'id'>): Promise<Task> => {
    await delay(500); // Simulate upload
    const data = getData();
    const task = data.tasks.find((t: Task) => t.id === taskId);
    if (task) {
        if (!task.attachments) task.attachments = [];
        task.attachments.push({ ...attachment, id: `attachment_${Date.now()}` });
        saveData(data);
        return task;
    }
    throw new Error("Task not found");
};


// --- Team & Roles ---
export const fetchTeamMembers = async (): Promise<TeamMember[]> => {
  await delay(150);
  return getData().teamMembers;
};

export const fetchRoles = async (): Promise<Role[]> => {
  await delay(100);
  return getData().roles;
};

// --- Daily Logs ---
export const fetchDailyLogs = async (): Promise<DailyLog[]> => {
  await delay(100);
  return getData().dailyLogs;
};

// --- Notifications ---
export const fetchNotifications = async (): Promise<Notification[]> => {
    await delay(100);
    return getData().notifications;
};

// --- Site Settings ---
export const fetchSiteSettings = async (): Promise<SiteSettings> => {
    await delay(100);
    return getData().siteSettings;
};
export const updateSiteSettings = async (settings: SiteSettings): Promise<SiteSettings> => {
    await delay(300);
    const data = getData();
    data.siteSettings = settings;
    saveData(data);
    return settings;
};

// --- Meetings ---
export const fetchMeetings = async (): Promise<Meeting[]> => {
    await delay(100);
    return getData().meetings;
};

// --- Finances ---
export const fetchExpenseClaims = async (): Promise<ExpenseClaim[]> => {
    await delay(150);
    return getData().expenseClaims || [];
};

export const addExpenseClaim = async (claimData: Omit<ExpenseClaim, 'id'>): Promise<ExpenseClaim> => {
    await delay(300);
    const data = getData();
    const newClaim: ExpenseClaim = { ...claimData, id: `exp_${Date.now()}`};
    if (!data.expenseClaims) data.expenseClaims = [];
    data.expenseClaims.push(newClaim);
    saveData(data);
    return newClaim;
};

// --- Billing ---
export const proposeBilling = async (projectId: string, proposal: BillingProposalFormData, freelancerId: number): Promise<Project> => {
    await delay(300);
    const data = getData();
    const project = data.projects.find((p: Project) => p.id === projectId);
    if (project) {
        project.freelancerContract = {
            ...proposal,
            freelancerId,
            status: 'pending'
        };
        saveData(data);
        return project;
    }
    throw new Error("Project not found");
};

export const resolveBilling = async (projectId: string, status: ContractStatus, notes: string): Promise<Project> => {
    await delay(300);
    const data = getData();
    const project = data.projects.find((p: Project) => p.id === projectId);
    if (project && project.freelancerContract) {
        project.freelancerContract.status = status;
        project.freelancerContract.notes = notes;
        saveData(data);
        return project;
    }
    throw new Error("Project or contract not found");
};