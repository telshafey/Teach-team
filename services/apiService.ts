import { SupabaseClient } from '@supabase/supabase-js';
import { GlobalSearchResults, LeaveRequest, Project, Role, Task, TeamMember } from '../types';

// Case conversion helpers
export const snakeToCamel = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => snakeToCamel(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/([-_][a-z])/g, (group) =>
                group.toUpperCase().replace('-', '').replace('_', '')
            );
            acc[camelKey] = snakeToCamel(obj[key]);
            return acc;
        }, {} as { [key: string]: any });
    }
    return obj;
};

export const camelToSnake = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => camelToSnake(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            acc[snakeKey] = camelToSnake(obj[key]);
            return acc;
        }, {} as { [key: string]: any });
    }
    return obj;
};

// Generic fetch all
export const fetchAll = async <T>(client: SupabaseClient, table: string): Promise<T[]> => {
    const { data, error } = await client.from(table).select('*');
    
    if (error) {
        // PostgreSQL error code for "undefined_table"
        if (error.code === '42P01') {
            console.warn(`Table "${table}" not found. Returning empty array. This may be expected if a feature module is not enabled.`);
            return []; // Gracefully handle missing tables by returning an empty array
        }
        // For other errors, we still want to know about them.
        throw error;
    }
    
    return snakeToCamel(data) as T[];
};

// Generic insert
export const insert = async <T>(client: SupabaseClient, table: string, record: Partial<T>): Promise<T> => {
    const { data, error } = await client.from(table).insert([camelToSnake(record)]).select().single();
    if (error) throw error;
    return snakeToCamel(data) as T;
};

// Generic insert many
export const insertMany = async <T>(client: SupabaseClient, table: string, records: Partial<T>[]): Promise<T[]> => {
    const { data, error } = await client.from(table).insert(records.map(camelToSnake)).select();
    if (error) throw error;
    return snakeToCamel(data) as T[];
};


// Generic update
export const update = async <T extends { id: any }>(client: SupabaseClient, table: string, id: T['id'], updates: Partial<T>): Promise<T> => {
    const { data, error } = await client.from(table).update(camelToSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return snakeToCamel(data) as T;
};

// Generic delete
export const deleteById = async (client: SupabaseClient, table: string, id: string | number): Promise<void> => {
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) throw error;
};

// Specific fetch functions
export const fetchProjects = (client: SupabaseClient): Promise<Project[]> => fetchAll<Project>(client, 'projects');
export const fetchTasks = (client: SupabaseClient): Promise<Task[]> => fetchAll<Task>(client, 'tasks');
export const fetchTeamMembers = (client: SupabaseClient): Promise<TeamMember[]> => fetchAll<TeamMember>(client, 'team_members');
export const fetchRoles = (client: SupabaseClient): Promise<Role[]> => fetchAll<Role>(client, 'roles');
export const fetchLeaveRequests = (client: SupabaseClient): Promise<LeaveRequest[]> => fetchAll<LeaveRequest>(client, 'leave_requests');


// Global search function
export const performGlobalSearch = async (client: SupabaseClient, searchTerm: string): Promise<GlobalSearchResults> => {
    if (!searchTerm) {
        return { projects: [], tasks: [], teamMembers: [] };
    }

    const [projectRes, taskRes, memberRes] = await Promise.all([
        client.from('projects').select('id, name').ilike('name', `%${searchTerm}%`).limit(5),
        client.from('tasks').select('id, title, project_id').ilike('title', `%${searchTerm}%`).limit(5),
        client.from('team_members').select('id, name').ilike('name', `%${searchTerm}%`).limit(5),
    ]);
    
    if (projectRes.error) throw projectRes.error;
    if (taskRes.error) throw taskRes.error;
    if (memberRes.error) throw memberRes.error;

    return {
        projects: snakeToCamel(projectRes.data),
        tasks: snakeToCamel(taskRes.data),
        teamMembers: snakeToCamel(memberRes.data),
    };
};