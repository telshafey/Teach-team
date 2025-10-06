import { SupabaseClient } from '@supabase/supabase-js';
// FIX: Import specific types to be used with the generic fetchAll function.
import { DailyLog, ExpenseClaim, GlobalSearchResults, Meeting, Notification, Project, Role, Task, TeamMember } from '../types';

// Utility to convert snake_case to camelCase
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
        }, {} as any);
    }
    return obj;
};

// Utility to convert camelCase to snake_case
export const camelToSnake = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => camelToSnake(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            acc[snakeKey] = camelToSnake(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

// Generic fetch all from a table
export const fetchAll = async <T>(client: SupabaseClient, table: string): Promise<T[]> => {
    const { data, error } = await client.from(table).select('*');
    if (error) throw error;
    return snakeToCamel(data) as T[];
};

// FIX: Add specific types to generic fetchAll calls to ensure type safety.
export const fetchRoles = (client: SupabaseClient) => fetchAll<Role>(client, 'roles');
export const fetchTeamMembers = (client: SupabaseClient) => fetchAll<TeamMember>(client, 'team_members');
export const fetchProjects = (client: SupabaseClient) => fetchAll<Project>(client, 'projects');
export const fetchTasks = (client: SupabaseClient) => fetchAll<Task>(client, 'tasks');
export const fetchDailyLogs = (client: SupabaseClient) => fetchAll<DailyLog>(client, 'daily_logs');
export const fetchExpenseClaims = (client: SupabaseClient) => fetchAll<ExpenseClaim>(client, 'expense_claims');
export const fetchNotifications = (client: SupabaseClient) => fetchAll<Notification>(client, 'notifications');
export const fetchMeetings = (client: SupabaseClient) => fetchAll<Meeting>(client, 'meetings');

// Generic insert
export const insert = async <T>(client: SupabaseClient, table: string, row: object): Promise<T> => {
    const { data, error } = await client.from(table).insert(camelToSnake(row)).select().single();
    if (error) throw error;
    return snakeToCamel(data) as T;
};

// Generic insert many
export const insertMany = async <T>(client: SupabaseClient, table: string, rows: object[]): Promise<T[]> => {
    // The .select() is removed because it can cause failures with RLS policies
    // where the user may have INSERT permission but not SELECT permission on the newly created rows,
    // causing the entire transaction to fail.
    const { data, error } = await client.from(table).insert(rows.map(camelToSnake));
    if (error) throw error;
    // We return an empty array because data is null without .select(), and the type requires a T[].
    // Callers should not depend on the return value of this function.
    return (data || []) as T[];
};

// Generic update
export const update = async <T>(client: SupabaseClient, table: string, id: string | number, updates: object): Promise<T> => {
    const { data, error } = await client.from(table).update(camelToSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return snakeToCamel(data) as T;
};

// Generic delete
export const deleteById = async (client: SupabaseClient, table: string, id: string | number) => {
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) throw error;
};

// Specific: fetch site settings
export const fetchSiteSettings = async (client: SupabaseClient) => {
    const { data, error } = await client.from('site_settings').select('settings').eq('id', 1).single();
    if (error) throw error;
    return data.settings;
};

// Specific: update site settings
export const updateSiteSettings = async (client: SupabaseClient, settings: object) => {
    const { error } = await client.from('site_settings').update({ settings }).eq('id', 1);
    if (error) throw error;
};

// Specific: global search
export const performGlobalSearch = async (client: SupabaseClient, term: string): Promise<GlobalSearchResults> => {
    const { data, error } = await client.rpc('perform_global_search', { search_term: term });
    if (error) throw error;
    return {
        projects: snakeToCamel(data.projects),
        tasks: snakeToCamel(data.tasks),
        teamMembers: snakeToCamel(data.team_members)
    };
};