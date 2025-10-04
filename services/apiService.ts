import { initialData } from '../App.initialData';
import { DailyLog, ExpenseClaim, Meeting, Notification, Project, Role, SiteSettings, Task, TeamMember } from '../types';

// Simulate API latency
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Using localStorage to persist changes during the session
const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const saveToStorage = <T>(key: string, value: T) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Error writing to localStorage key “${key}”:`, error);
    }
};

const initializeStorage = () => {
    if (!localStorage.getItem('api_initialized')) {
        Object.entries(initialData).forEach(([key, value]) => {
            saveToStorage(key, value);
        });
        localStorage.setItem('api_initialized', 'true');
    }
};

initializeStorage();


export const fetchSiteSettings = async (): Promise<SiteSettings> => {
    await delay(200);
    return getFromStorage('siteSettings', initialData.siteSettings);
};

export const updateSiteSettings = async (settings: SiteSettings): Promise<SiteSettings> => {
    await delay(300);
    saveToStorage('siteSettings', settings);
    return settings;
};

export const fetchTeamMembers = async (): Promise<TeamMember[]> => {
    await delay(200);
    return getFromStorage('teamMembers', initialData.teamMembers);
};

export const updateTeamMember = async (member: TeamMember): Promise<TeamMember> => {
    await delay(300);
    const members = getFromStorage('teamMembers', initialData.teamMembers);
    const updatedMembers = members.map(m => m.id === member.id ? member : m);
    saveToStorage('teamMembers', updatedMembers);
    return member;
};

export const addTeamMember = async (member: TeamMember): Promise<TeamMember> => {
    await delay(300);
    const members = getFromStorage('teamMembers', initialData.teamMembers);
    const newMember = { ...member, id: Date.now() }; // ensure unique id
    saveToStorage('teamMembers', [...members, newMember]);
    return newMember;
};


export const fetchRoles = async (): Promise<Role[]> => {
    await delay(200);
    return getFromStorage('roles', initialData.roles);
};

export const fetchProjects = async (): Promise<Project[]> => {
    await delay(400);
    return getFromStorage('projects', initialData.projects);
};

export const addProject = async (projectData: Omit<Project, 'id' | 'budgetNotificationSent'>): Promise<Project> => {
    await delay(500);
    const projects = getFromStorage('projects', initialData.projects);
    const newProject: Project = {
        ...projectData,
        id: `proj_${Date.now()}`,
        budgetNotificationSent: null,
    };
    saveToStorage('projects', [...projects, newProject]);
    return newProject;
};

export const updateProject = async (project: Project): Promise<Project> => {
    await delay(300);
    const projects = getFromStorage('projects', initialData.projects);
    const updatedProjects = projects.map(p => p.id === project.id ? project : p);
    saveToStorage('projects', updatedProjects);
    return project;
};

export const fetchTasks = async (): Promise<Task[]> => {
    await delay(500);
    return getFromStorage('tasks', initialData.tasks);
};

export const addTask = async (taskData: Omit<Task, 'id' | 'approvalStatus' | 'comments' | 'attachments'>): Promise<Task> => {
    await delay(200);
    const tasks = getFromStorage('tasks', initialData.tasks);
    const newTask: Task = {
        ...taskData,
        id: `task_${Date.now()}`,
        approvalStatus: 'approved',
        comments: [],
        attachments: [],
    };
    saveToStorage('tasks', [...tasks, newTask]);
    return newTask;
};

export const updateTask = async (task: Task): Promise<Task> => {
    await delay(200);
    const tasks = getFromStorage('tasks', initialData.tasks);
    const updatedTasks = tasks.map(t => t.id === task.id ? task : t);
    saveToStorage('tasks', updatedTasks);
    return task;
};

export const fetchDailyLogs = async (): Promise<DailyLog[]> => {
    await delay(300);
    return getFromStorage('dailyLogs', initialData.dailyLogs);
};

export const fetchNotifications = async (): Promise<Notification[]> => {
    await delay(300);
    return getFromStorage('notifications', initialData.notifications);
};

export const fetchMeetings = async (): Promise<Meeting[]> => {
    await delay(200);
    return getFromStorage('meetings', initialData.meetings);
};

export const fetchExpenseClaims = async (): Promise<ExpenseClaim[]> => {
    await delay(200);
    return getFromStorage('expenseClaims', initialData.expenseClaims);
};

export const addExpenseClaim = async (claimData: Omit<ExpenseClaim, 'id'>): Promise<ExpenseClaim> => {
    await delay(300);
    const claims = getFromStorage('expenseClaims', initialData.expenseClaims);
    const newClaim: ExpenseClaim = {
        ...claimData,
        id: `exp_${Date.now()}`,
    };
    saveToStorage('expenseClaims', [...claims, newClaim]);
    return newClaim;
};

export const updateExpenseClaimStatus = async (claimId: string, status: 'approved' | 'rejected'): Promise<ExpenseClaim> => {
    await delay(300);
    const claims = getFromStorage('expenseClaims', initialData.expenseClaims);
    let updatedClaim: ExpenseClaim | undefined;
    const updatedClaims = claims.map(c => {
        if (c.id === claimId) {
            updatedClaim = { ...c, status };
            return updatedClaim;
        }
        return c;
    });
    if (!updatedClaim) throw new Error("Claim not found");
    saveToStorage('expenseClaims', updatedClaims);
    return updatedClaim;
};
