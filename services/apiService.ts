import { SupabaseClient } from '@supabase/supabase-js';
import { TeamMemberFormData, GlobalSearchResults } from '../types';
import { slugify } from '../utils/slugify';

// Helper to convert snake_case keys from Supabase to camelCase
export const snakeToCamel = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => snakeToCamel(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/([-_][a-z])/ig, ($1) => {
                return $1.toUpperCase()
                    .replace('-', '')
                    .replace('_', '');
            });
            acc[camelKey] = snakeToCamel(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

// Helper to convert camelCase keys to snake_case for Supabase
const camelToSnake = (obj: any): any => {
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

// Generic fetch function
const fetchData = async (client: SupabaseClient, table: string, select: string = '*') => {
    const { data, error } = await client.from(table).select(select);
    if (error) throw error;
    return snakeToCamel(data);
};

// Specific fetch functions
export const fetchProjects = (client: SupabaseClient) => fetchData(client, 'projects');

export const fetchTasks = async (client: SupabaseClient) => {
    // 1. Fetch base tasks
    const { data: tasksData, error: tasksError } = await client.from('tasks').select('*');
    if (tasksError) {
        console.error("Error fetching tasks table:", tasksError);
        throw tasksError;
    }
    if (!tasksData || tasksData.length === 0) {
        return [];
    }

    const taskIds = tasksData.map(t => t.id);

    // 2. Fetch comments and attachments in parallel
    const [
        { data: commentsData, error: commentsError },
        { data: attachmentsData, error: attachmentsError }
    ] = await Promise.all([
        client.from('task_comments').select('*').in('task_id', taskIds),
        client.from('task_attachments').select('*').in('task_id', taskIds),
    ]);
    
    if (commentsError) {
        console.error("Error fetching task comments:", commentsError);
        throw commentsError;
    }
    if (attachmentsError) {
        console.error("Error fetching task attachments:", attachmentsError);
        throw attachmentsError;
    }

    // 3. Join data on the client
    const commentsByTaskId = (commentsData || []).reduce((acc, comment) => {
        if (!acc[comment.task_id]) {
            acc[comment.task_id] = [];
        }
        acc[comment.task_id].push(comment);
        return acc;
    }, {} as Record<string, any[]>);

    const attachmentsByTaskId = (attachmentsData || []).reduce((acc, attachment) => {
        if (!acc[attachment.task_id]) {
            acc[attachment.task_id] = [];
        }
        acc[attachment.task_id].push(attachment);
        return acc;
    }, {} as Record<string, any[]>);

    const finalTasks = tasksData.map(task => ({
        ...task,
        comments: commentsByTaskId[task.id] || [],
        attachments: attachmentsByTaskId[task.id] || [],
    }));

    return snakeToCamel(finalTasks);
};


export const fetchTeamMembers = (client: SupabaseClient) => fetchData(client, 'team_members');
export const fetchDailyLogs = (client: SupabaseClient) => fetchData(client, 'daily_logs');
export const fetchNotifications = (client: SupabaseClient) => fetchData(client, 'notifications');

export const fetchMeetings = async (client: SupabaseClient) => {
    // 1. Fetch base meetings
    const { data: meetingsData, error: meetingsError } = await client.from('meetings').select('*');
    if (meetingsError) {
        console.error("Error fetching meetings table:", meetingsError);
        throw meetingsError;
    }
    if (!meetingsData || meetingsData.length === 0) {
        return [];
    }

    const meetingIds = meetingsData.map(m => m.id);

    // 2. Fetch participants for those meetings
    let participantsData: any[] | null;
    const { data: pData, error: participantsError } = await client
        .from('meeting_participants')
        .select('meeting_id, team_member_id')
        .in('meeting_id', meetingIds);

    if (participantsError) {
        console.error("Error fetching meeting participants:", participantsError);
        // Don't throw, just return meetings without participants
        participantsData = [];
    } else {
        participantsData = pData;
    }

    // 3. Join data on the client
    const participantsByMeetingId = (participantsData || []).reduce((acc, p) => {
        if (!acc[p.meeting_id]) {
            acc[p.meeting_id] = [];
        }
        acc[p.meeting_id].push(p.team_member_id);
        return acc;
    }, {} as Record<string, number[]>);

    const finalMeetings = meetingsData.map(meeting => ({
        ...meeting,
        participants: participantsByMeetingId[meeting.id] || [],
    }));

    return snakeToCamel(finalMeetings);
};

export const fetchExpenseClaims = (client: SupabaseClient) => fetchData(client, 'expense_claims');
export const fetchRoles = (client: SupabaseClient) => fetchData(client, 'roles');

export const fetchSiteSettings = async (client: SupabaseClient) => {
    const { data, error } = await client.from('site_settings').select('settings').eq('id', 1).single();
    if (error) {
        console.warn("Could not fetch site settings:", error.message);
        return null;
    }
    return data.settings;
};

// Generic CUD operations
export const insert = async (client: SupabaseClient, table: string, row: object) => {
    const { data, error } = await client.from(table).insert(camelToSnake(row)).select().single();
    if (error) throw error;
    return snakeToCamel(data);
};

export const insertMany = async (client: SupabaseClient, table: string, rows: object[]) => {
    const { data, error } = await client.from(table).insert(camelToSnake(rows)).select();
    if (error) throw error;
    return snakeToCamel(data);
};


export const update = async (client: SupabaseClient, table: string, id: string | number, updates: object) => {
    const { data, error } = await client.from(table).update(camelToSnake(updates)).eq('id', id).select();
    if (error) throw error;
    return snakeToCamel(data);
};

export const upsert = async (client: SupabaseClient, table: string, row: object) => {
    const { data, error } = await client.from(table).upsert(camelToSnake(row)).select().single();
    if (error) throw error;
    return snakeToCamel(data);
};

export const deleteById = async (client: SupabaseClient, table: string, id: string | number) => {
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) throw error;
};

// Special operations
export const createNewUser = async (client: SupabaseClient, userData: TeamMemberFormData) => {
    // 1. Create the auth user in Supabase Auth
    const { data: authData, error: authError } = await client.auth.signUp({
        email: userData.email!,
        password: userData.password!,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("User not created in Auth.");

    // 2. Create the user profile in our public table
    const profileData = {
        auth_user_id: authData.user.id,
        name: userData.name,
        email: userData.email,
        role_id: userData.roleId,
        reports_to: userData.reportsTo,
        avatar_url: userData.avatarUrl,
        salary: userData.salary,
        hourly_rate: userData.hourlyRate,
        // Default weekly plan
        weekly_plan: { status: 'approved', hours: {} }
    };
    
    const { error: profileError } = await client.from('team_members').insert(profileData);

    if (profileError) {
        // If profile creation fails, we should ideally delete the auth user to prevent orphans
        const { data, error } = await client.auth.admin.deleteUser(authData.user.id);
        if (error) console.error("Failed to clean up orphaned auth user:", error);
        throw profileError;
    }

    return snakeToCamel(profileData);
};


export const performGlobalSearch = async (client: SupabaseClient, searchTerm: string): Promise<GlobalSearchResults> => {
    const [
        { data: projects, error: projectsError },
        { data: tasks, error: tasksError },
        { data: teamMembers, error: membersError }
    ] = await Promise.all([
        client.from('projects').select('id, name').textSearch('name', `'${searchTerm}'`),
        client.from('tasks').select('id, title, project_id').textSearch('title', `'${searchTerm}'`),
        client.from('team_members').select('id, name').textSearch('name', `'${searchTerm}'`),
    ]);
    
    if (projectsError) console.error("Project search error", projectsError);
    if (tasksError) console.error("Task search error", tasksError);
    if (membersError) console.error("Member search error", membersError);

    return {
        projects: snakeToCamel(projects || []),
        tasks: snakeToCamel(tasks || []),
        teamMembers: snakeToCamel(teamMembers || []),
    };
};