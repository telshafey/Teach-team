import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  Role,
  Project,
  Task,
  TeamMember,
  DailyLog,
  Notification,
  Meeting,
  ExpenseClaim,
  SiteSettings,
  GlobalSearchResults,
  TaskComment
} from '../types';

// --- Utility Functions ---

/**
 * Converts a snake_case string to camelCase.
 */
const toCamel = (s: string): string => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

/**
 * Converts object keys from snake_case to camelCase recursively.
 */
export const snakeToCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => snakeToCamel(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: { [key: string]: any }, key) => {
      const camelKey = toCamel(key);
      acc[camelKey] = snakeToCamel(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

/**
 * Converts object keys from camelCase to snake_case recursively.
 */
export const camelToSnake = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => camelToSnake(v));
    } else if (obj !== null && typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype) {
        return Object.keys(obj).reduce((acc: { [key: string]: any }, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            acc[snakeKey] = camelToSnake(obj[key]);
            return acc;
        }, {});
    }
    return obj;
};


// --- Generic API Functions ---

const handleResponse = <T>(response: { data: any | null; error: PostgrestError | null }, operation: string, tableName: string): T => {
    if (response.error) {
        console.error(`Error during ${operation} on ${tableName}:`, response.error);
        throw response.error;
    }
    return snakeToCamel(response.data) as T;
};

export const fetchAll = async <T>(client: SupabaseClient, tableName: string): Promise<T[]> => {
    const response = await client.from(tableName).select('*');
    return handleResponse<T[]>(response, 'fetchAll', tableName) || [];
};

export const fetchById = async <T>(client: SupabaseClient, tableName: string, id: string | number): Promise<T | null> => {
    const response = await client.from(tableName).select('*').eq('id', id).single();
    return handleResponse<T | null>(response, 'fetchById', tableName);
};

export const insert = async <T>(client: SupabaseClient, tableName: string, data: Partial<T>): Promise<T> => {
    const snakeData = camelToSnake(data);
    const response = await client.from(tableName).insert(snakeData).select().single();
    return handleResponse<T>(response, 'insert', tableName);
};

export const insertMany = async <T>(client: SupabaseClient, tableName: string, data: Partial<T>[]): Promise<T[]> => {
    const snakeData = data.map(camelToSnake);
    const response = await client.from(tableName).insert(snakeData).select();
    return handleResponse<T[]>(response, 'insertMany', tableName) || [];
};

export const update = async <T>(client: SupabaseClient, tableName: string, id: string | number, data: Partial<T>): Promise<T> => {
    const snakeData = camelToSnake(data);
    const response = await client.from(tableName).update(snakeData).eq('id', id).select().single();
    return handleResponse<T>(response, 'update', tableName);
};

export const deleteById = async (client: SupabaseClient, tableName: string, id: string | number): Promise<void> => {
    const response = await client.from(tableName).delete().eq('id', id);
    if (response.error) {
        console.error(`Error deleting from ${tableName}:`, response.error);
        throw response.error;
    }
};

// --- Specific Fetch Functions ---

export const fetchRoles = (client: SupabaseClient): Promise<Role[]> => fetchAll<Role>(client, 'roles');
export const fetchProjects = (client: SupabaseClient): Promise<Project[]> => fetchAll<Project>(client, 'projects');
export const fetchTasks = async (client: SupabaseClient): Promise<Task[]> => {
    const response = await client.from('tasks').select('*, comments:task_comments(*), attachments:task_attachments(*)');
    return handleResponse<Task[]>(response, 'fetchTasks', 'tasks') || [];
};
export const fetchTeamMembers = (client: SupabaseClient): Promise<TeamMember[]> => fetchAll<TeamMember>(client, 'team_members');
export const fetchDailyLogs = (client: SupabaseClient): Promise<DailyLog[]> => fetchAll<DailyLog>(client, 'daily_logs');
export const fetchNotifications = (client: SupabaseClient): Promise<Notification[]> => fetchAll<Notification>(client, 'notifications');
export const fetchMeetings = (client: SupabaseClient): Promise<Meeting[]> => fetchAll<Meeting>(client, 'meetings');
export const fetchExpenseClaims = (client: SupabaseClient): Promise<ExpenseClaim[]> => fetchAll<ExpenseClaim>(client, 'expense_claims');

export const fetchSiteSettings = async (client: SupabaseClient): Promise<SiteSettings | null> => {
    const { data, error } = await client.from('site_settings').select('settings').eq('id', 1).single();
    if (error) {
        console.error("Error fetching site settings:", error);
        return null;
    }
    return data?.settings as SiteSettings || null;
}

// --- Specific Functions ---
export const performGlobalSearch = async (client: SupabaseClient, searchTerm: string): Promise<GlobalSearchResults> => {
    const [
        { data: projects },
        { data: tasks },
        { data: teamMembers }
    ] = await Promise.all([
        client.from('projects').select('id, name').ilike('name', `%${searchTerm}%`).limit(5),
        client.from('tasks').select('id, title, project_id').ilike('title', `%${searchTerm}%`).limit(5),
        client.from('team_members').select('id, name').ilike('name', `%${searchTerm}%`).limit(5)
    ]);

    return {
        projects: snakeToCamel(projects || []),
        tasks: snakeToCamel(tasks || []),
        teamMembers: snakeToCamel(teamMembers || [])
    };
};
