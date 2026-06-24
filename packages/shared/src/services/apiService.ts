import { SupabaseClient } from "@supabase/supabase-js";
import { TeamMember } from "../types";

export const PAGE_SIZE = 20;

// Memoization caches for key casing transitions to prevent regex and allocation overhead
const snakeToCamelCache = new Map<string, string>();
const camelToSnakeCache = new Map<string, string>();

// Helper to convert snake_case to camelCase with cached lookups
const snakeToCamel = (str: string) => {
  let cached = snakeToCamelCache.get(str);
  if (cached !== undefined) return cached;
  const result = str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace("-", "").replace("_", ""),
  );
  snakeToCamelCache.set(str, result);
  return result;
};

// Helper to convert camelCase to snake_case with cached lookups
const camelToSnake = (str: string) => {
  let cached = camelToSnakeCache.get(str);
  if (cached !== undefined) return cached;
  const result = str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  camelToSnakeCache.set(str, result);
  return result;
};

// Highly performance-optimized recursive key conversion from snake_case to camelCase
export const keysToCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamel);
  } else if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const acc: { [key: string]: any } = {};
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      acc[snakeToCamel(key)] = keysToCamel(obj[key]);
    }
    return acc;
  }
  return obj;
};

// Highly performance-optimized recursive key conversion from camelCase to snake_case
export const camelToSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnakeCase);
  } else if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const acc: { [key: string]: any } = {};
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      acc[camelToSnake(key)] = camelToSnakeCase(obj[key]);
    }
    return acc;
  }
  return obj;
};

export const refreshSchemaCache = async (
  client: SupabaseClient,
  tables: string[],
): Promise<void> => {
  // Mock schema cache refreshed handled by Supabase automatically usually
};

export const getAll = async <T>(
  client: SupabaseClient,
  table: string,
  columns: string = "*",
): Promise<T[]> => {
  if (
    table === "tasks" ||
    table === "projects" ||
    table === "team_members" ||
    table === "daily_logs" ||
    table === "task_comments" ||
    table === "task_attachments"
  ) {
    // Bypass RLS using our custom backend endpoint to ensure all records are fetched.
    // The filtering handles the visibility checks client-side.
    try {
      const { data: { session } } = await client.auth.getSession();
      const token = session?.access_token;
      
      const endpoint = table === "tasks" 
        ? "/api/admin/tasks" 
        : table === "projects" 
        ? "/api/admin/projects" 
        : table === "team_members" 
        ? "/api/admin/team_members" 
        : table === "daily_logs"
        ? "/api/admin/daily_logs"
        : table === "task_comments"
        ? "/api/admin/task_comments"
        : "/api/admin/task_attachments";
      const resp = await fetch(endpoint, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (resp.ok) {
        const data = await resp.json();
        const camelData = keysToCamel(data || []) as T[];
        if (camelData.length > 0 && (camelData[0] as any).id !== undefined) {
          const uniqueMap = new Map();
          camelData.forEach((item: any) => {
            uniqueMap.set(item.id, item);
          });
          return Array.from(uniqueMap.values()) as T[];
        }
        return camelData;
      } else {
        console.warn(`Admin endpoint for ${table} responded with status ${resp.status}, falling back to standard client`);
      }
    } catch(e) {
      console.warn(`Custom endpoint fetch warning or fallback for ${table}:`, e);
      // Fallback to Supabase
    }
  }

  const fetchPromise = client.from(table).select(columns);

  const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
    setTimeout(() => reject(new Error(`Get Request Timeout for ${table}`)), 30000),
  );

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
  if (error) throw error;

  const camelData = keysToCamel(data || []) as T[];
  if (camelData.length > 0 && (camelData[0] as any).id !== undefined) {
    const uniqueMap = new Map();
    camelData.forEach((item: any) => {
      uniqueMap.set(item.id, item);
    });
    return Array.from(uniqueMap.values()) as T[];
  }
  return camelData;
};

export const getPaginated = async <T>(
  client: SupabaseClient,
  table: string,
  page: number,
  columns: string = "*",
): Promise<T[]> => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await client
    .from(table)
    .select(columns)
    .range(from, to);
  if (error) throw error;

  const camelData = keysToCamel(data || []) as T[];
  if (camelData.length > 0 && (camelData[0] as any).id !== undefined) {
    const uniqueMap = new Map();
    camelData.forEach((item: any) => {
      uniqueMap.set(item.id, item);
    });
    return Array.from(uniqueMap.values()) as T[];
  }
  return camelData;
};

export const getById = async <T>(
  client: SupabaseClient,
  table: string,
  id: string | number,
): Promise<T | null> => {
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ? (keysToCamel(data) as T) : null;
};

export const insert = async <T>(
  client: SupabaseClient,
  table: string,
  item: Partial<T>,
): Promise<T> => {
  const payload = camelToSnakeCase(item);

  const insertPromise = client.from(table).insert(payload).select().single();
  const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
    setTimeout(() => reject(new Error("Insert Request Timeout")), 30000),
  );

  const { data, error } = await Promise.race([insertPromise, timeoutPromise]);
  if (error) throw error;
  return keysToCamel(data) as T;
};

export const update = async <T>(
  client: SupabaseClient,
  table: string,
  id: string | number,
  updates: Partial<T>,
): Promise<T> => {
  const payload = camelToSnakeCase(updates);

  const updatePromise = client
    .from(table)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
    setTimeout(() => reject(new Error("Update Request Timeout")), 30000),
  );

  const { data, error } = await Promise.race([updatePromise, timeoutPromise]);

  if (error) {
    if (error.code === "PGRST116" && error.message.includes("0 rows")) {
      throw new Error(
        "لا تملك الصلاحية لتعديل هذه البيانات (مرفوض من قاعدة البيانات).",
      );
    }
    throw error;
  }
  return keysToCamel(data) as T;
};

// Special handler for updating team members
type TeamMemberUpdateData = Partial<TeamMember & { password?: string }>;
export const updateTeamMemberWithPassword = async (
  client: SupabaseClient,
  member: TeamMember,
  updates: TeamMemberUpdateData,
): Promise<TeamMember> => {
  const { password, ...memberData } = updates;

  const { data: { session } } = await client.auth.getSession();
  const token = session?.access_token;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  let response;
  try {
    // Utilize the Express admin backend to bypass Frontend RLS locks
    response = await fetch("/api/team/admin-update-member", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        memberId: member.id,
        updates, // Pass ALL updates (including password if provided)
        email: member.email,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    if (!response.ok) {
       throw new Error(`إستجابة الخادم غير متوقعة: ${response.status} ${response.statusText}`);
    }
    throw new Error(`خطأ في معالجة البيانات: ${responseText.substring(0, 50)}...`);
  }

  if (!response.ok) {
    throw new Error(
      result?.error || "فشل التحديث. يرجى التحقق من اتصالك بالإنترنت.",
    );
  }

  // If the backend succeeded, return optimistic data
  return { ...member, ...memberData } as TeamMember;
};

export const createTeamMemberAdmin = async (
  client: SupabaseClient,
  memberData: Record<string, any>,
): Promise<TeamMember> => {
  const { data: { session } } = await client.auth.getSession();
  const token = session?.access_token;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  let response;
  try {
    response = await fetch("/api/team/admin-create-member", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ memberData }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    if (!response.ok) {
       throw new Error(`تعذر الإنشاء، إستجابة الخادم غير متوقعة: ${response.status} ${response.statusText}`);
    }
    throw new Error(`خطأ في معالجة البيانات: ${responseText.substring(0, 50)}...`);
  }

  if (!response.ok) {
    throw new Error(
      result?.error || "فشل الإنشاء. يرجى التحقق من اتصالك بالإنترنت.",
    );
  }

  return keysToCamel(result.member) as TeamMember;
};

export const updateRoleAdmin = async <T,>(
  client: SupabaseClient,
  roleId: string,
  updates: Partial<T>
): Promise<T> => {
  const { data: { session } } = await client.auth.getSession();
  const token = session?.access_token;

  const response = await fetch("/api/team/admin-update-role", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ roleId, updates }),
  });

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    if (!response.ok) {
       throw new Error(`إستجابة الخادم غير متوقعة: ${response.status} ${response.statusText}`);
    }
    throw new Error(`خطأ في معالجة البيانات: ${responseText.substring(0, 50)}...`);
  }

  if (!response.ok) {
    throw new Error(result?.error || "فشل تحديث الصلاحيات.");
  }

  return keysToCamel(result.data) as T;
};

export const upsertSiteSettingsAdmin = async <T,>(
  client: SupabaseClient,
  payload: Partial<T>
): Promise<T> => {
  const { data: { session } } = await client.auth.getSession();
  const token = session?.access_token;

  const response = await fetch("/api/admin/site-settings/upsert", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ payload }),
  });

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    if (!response.ok) {
       throw new Error(`إستجابة الخادم غير متوقعة: ${response.status} ${response.statusText}`);
    }
    throw new Error(`خطأ في معالجة البيانات: ${responseText.substring(0, 50)}...`);
  }

  if (!response.ok) {
    throw new Error(result?.error || "فشل تحديث الإعدادات.");
  }

  return keysToCamel(result.data) as T;
};

export const deleteById = async (
  client: SupabaseClient,
  table: string,
  id: string | number,
): Promise<void> => {
  const { error } = await client.from(table).delete().eq("id", id);
  if (error) throw error;
};

export const performGlobalSearch = async (
  client: SupabaseClient,
  term: string,
): Promise<any> => {
  const termQuery = `%${term}%`;
  const [projectsR, tasksR, teamMembersR] = await Promise.all([
    client.from("projects").select("*").ilike("name", termQuery),
    client.from("tasks").select("*").ilike("title", termQuery),
    client.from("team_members").select("*").ilike("name", termQuery),
  ]);
  return {
    projects: keysToCamel(projectsR.data || []),
    tasks: keysToCamel(tasksR.data || []),
    teamMembers: keysToCamel(teamMembersR.data || []),
  };
};

/**
 * Calls a Supabase RPC function designed to return a single JSON object.
 * @param client The Supabase client.
 * @param fn The name of the RPC function.
 * @param params The parameters for the RPC function.
 * @returns A single camelCased result object.
 */
export const callRpcSingle = async <T>(
  client: SupabaseClient,
  fn: string,
  params: object,
): Promise<T> => {
  const { data, error } = await client.rpc(fn, camelToSnakeCase(params));
  if (error) throw error;
  return keysToCamel(data) as T;
};

export const getUserPreference = async <T>(
  client: SupabaseClient,
  userId: number,
  key: string,
): Promise<T | null> => {
  return null; // Implemented via localStorage or specific table later
};

export const setUserPreference = async (
  client: SupabaseClient,
  userId: number,
  key: string,
  value: any,
): Promise<void> => {
  return; // Implemented via localStorage or specific table later
};
