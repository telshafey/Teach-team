import { SupabaseClient } from '@supabase/supabase-js';

// Helper to convert snake_case to camelCase
const snakeToCamel = (str: string) => str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));

// Helper to convert camelCase to snake_case
const camelToSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Recursively convert object keys from snake_case to camelCase
export const keysToCamel = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => keysToCamel(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            acc[snakeToCamel(key)] = keysToCamel(obj[key]);
            return acc;
        }, {} as { [key: string]: any });
    }
    return obj;
};

// Recursively convert object keys from camelCase to snake_case
export const camelToSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => camelToSnakeCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            acc[camelToSnake(key)] = camelToSnakeCase(obj[key]);
            return acc;
        }, {} as { [key: string]: any });
    }
    return obj;
};

/**
 * Attempts to refresh the PostgREST schema cache for specified tables.
 * This is a workaround for potential stale cache issues where PostgREST
 * doesn't recognize newly added columns. It works by sending a lightweight select query.
 */
export const refreshSchemaCache = async (client: SupabaseClient, tables: string[]): Promise<void> => {
    try {
        const promises = tables.map(table => client.from(table).select('*', { count: 'exact', head: true }));
        await Promise.all(promises);
        console.log("Schema cache for tables may have been refreshed:", tables);
    } catch (error) {
        console.warn("Schema cache refresh attempt failed:", error);
    }
};


export const getAll = async <T>(client: SupabaseClient, table: string): Promise<T[]> => {
    const { data, error } = await client.from(table).select('*');
    if (error) throw error;
    return keysToCamel(data) as T[];
};

export const getById = async <T>(client: SupabaseClient, table: string, id: string | number): Promise<T | null> => {
    const { data, error } = await client.from(table).select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // PostgREST error for "Not found"
        throw error;
    }
    return keysToCamel(data) as T;
};

export const insert = async <T>(client: SupabaseClient, table: string, item: Partial<T>): Promise<T> => {
    const { data, error } = await client
        .from(table)
        .insert([camelToSnakeCase(item)])
        .select()
        .single();

    if (error) throw error;
    if (!data) throw new Error("Insert operation did not return data.");

    return keysToCamel(data) as T;
};


export const update = async <T>(client: SupabaseClient, table: string, id: string | number, updates: Partial<T>): Promise<T> => {
    const { data, error } = await client
        .from(table)
        .update(camelToSnakeCase(updates))
        .eq('id', id)
        .select()
        .single();
        
    if (error) throw error;
    return keysToCamel(data) as T;
};

export const deleteById = async (client: SupabaseClient, table: string, id: string | number): Promise<void> => {
    // For projects, deletion is handled via RPC due to cascading deletes.
    if (table === 'projects') {
        const { error } = await client.rpc('delete_project_and_related_data', { p_id: id });
        if (error) throw error;
        return;
    }
    
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) throw error;
};

export const performGlobalSearch = async (client: SupabaseClient, term: string): Promise<any> => {
    const { data, error } = await client.rpc('perform_global_search', { search_term: term });
    if (error) {
        console.error('RPC Error:', error);
        throw error;
    }
    return keysToCamel(data);
};

/**
 * Calls a Supabase RPC function designed to return a single JSON object.
 * @param client The Supabase client.
 * @param fn The name of the RPC function.
 * @param params The parameters for the RPC function.
 * @returns A single camelCased result object.
 */
export const callRpcSingle = async <T>(client: SupabaseClient, fn: string, params: object): Promise<T> => {
    const { data, error } = await client.rpc(fn, params);
    
    if (error) {
        console.error("RPC Error:", error);
        throw error;
    }

    if (data === null || data === undefined) {
        throw new Error("RPC call returned no data. The target row might not exist or an internal error occurred.");
    }

    return keysToCamel(data) as T;
};