import { getSupabaseClient } from '../stores/supabaseStore';

export interface AuditLogEntry {
  actorId?: number;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const logAudit = async (entry: AuditLogEntry) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await supabase.from('audit_logs').insert([{
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    old_values: entry.oldValues,
    new_values: entry.newValues,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
  }]);
};
