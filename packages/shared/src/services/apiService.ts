import { SupabaseClient } from "@supabase/supabase-js";
import { TeamMember } from "../types";

export const PAGE_SIZE = 20;

// Helper to convert snake_case to camelCase
const snakeToCamel = (str: string) =>
  str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace("-", "").replace("_", ""),
  );

// Helper to convert camelCase to snake_case
const camelToSnake = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// Recursively convert object keys from snake_case to camelCase
export const keysToCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamel(v));
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce(
      (acc, key) => {
        acc[snakeToCamel(key)] = keysToCamel(obj[key]);
        return acc;
      },
      {} as { [key: string]: any },
    );
  }
  return obj;
};

// Recursively convert object keys from camelCase to snake_case
export const camelToSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map((v) => camelToSnakeCase(v));
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce(
      (acc, key) => {
        acc[camelToSnake(key)] = camelToSnakeCase(obj[key]);
        return acc;
      },
      {} as { [key: string]: any },
    );
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
  const { data, error } = await client.from(table).select(columns);
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
    setTimeout(() => reject(new Error("Insert Request Timeout")), 15000),
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
    setTimeout(() => reject(new Error("Update Request Timeout")), 10000),
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

  // Utilize the Express admin backend to bypass Frontend RLS locks
  const response = await fetch("/api/team/admin-update-member", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      memberId: member.id,
      updates, // Pass ALL updates (including password if provided)
      email: member.email,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.error || "فشل التحديث. يرجى التحقق من اتصالك بالإنترنت.",
    );
  }

  // If the backend succeeded, return optimistic data
  return { ...member, ...memberData } as TeamMember;
};

export const createTeamMemberAdmin = async (
  client: SupabaseClient,
  memberData: Record<string, any>,
): Promise<TeamMember> => {
  const response = await fetch("/api/team/admin-create-member", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberData }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.error || "فشل الإنشاء. يرجى التحقق من اتصالك بالإنترنت.",
    );
  }

  return keysToCamel(result.member) as TeamMember;
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
