/**
 * EcomHub OS — Audit Trail & Safe Deletion Service
 * Product: EcomHub OS | Tagline: Your Business, One Hub.
 *
 * Provides tenant-isolated audit logging for all destructive actions:
 * delete, archive, cancel, deactivate, soft-delete, and restore.
 */

import { AuditLogEntry, AuditActionType, BusinessRole, Profile } from '../types';
import { getSupabaseClient } from './supabase';

const LS_AUDIT_PREFIX = 'ecomhub_audit_logs_';

export interface LogAuditParams {
  businessId: string;
  userId: string;
  userProfile?: Profile | null;
  userRole?: BusinessRole | null;
  module: string;
  action: AuditActionType;
  recordId: string;
  recordTitle?: string | null;
  reason?: string | null;
  metadata?: Record<string, any>;
}

export interface AuditLogFilterOptions {
  module?: string;
  action?: AuditActionType;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Log a destructive or administrative action to the business audit trail
 */
export async function logAuditEvent(params: LogAuditParams): Promise<{ success: boolean; entry?: AuditLogEntry; error?: string }> {
  const { businessId, userId, userProfile, userRole, module, action, recordId, recordTitle, reason, metadata } = params;

  if (!businessId || !userId) {
    return { success: false, error: 'Missing businessId or userId for audit log' };
  }

  const newEntry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    business_id: businessId,
    user_id: userId,
    user_profile: userProfile || null,
    user_role: userRole || null,
    module,
    action,
    record_id: recordId,
    record_title: recordTitle || null,
    reason: reason || null,
    metadata: metadata || {},
    created_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('audit_logs').insert({
        id: newEntry.id,
        business_id: businessId,
        user_id: userId,
        module,
        action,
        record_id: recordId,
        record_title: recordTitle,
        reason,
        metadata: metadata || {},
        created_at: newEntry.created_at,
      });

      if (!error) {
        return { success: true, entry: newEntry };
      }
      console.warn('Supabase audit log insert fallback to local:', error);
    } catch (err) {
      console.warn('Supabase audit log network error, saving locally:', err);
    }
  }

  // Local Storage Fallback
  try {
    const key = `${LS_AUDIT_PREFIX}${businessId}`;
    const raw = localStorage.getItem(key);
    const existing: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    existing.unshift(newEntry);
    // Keep last 500 audit entries
    const trimmed = existing.slice(0, 500);
    localStorage.setItem(key, JSON.stringify(trimmed));
    return { success: true, entry: newEntry };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Retrieve tenant-isolated audit logs
 */
export async function getAuditLogs(businessId: string, options?: AuditLogFilterOptions): Promise<AuditLogEntry[]> {
  if (!businessId) return [];

  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client
        .from('audit_logs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (options?.module) query = query.eq('module', options.module);
      if (options?.action) query = query.eq('action', options.action);
      if (options?.userId) query = query.eq('user_id', options.userId);
      if (options?.limit) query = query.limit(options.limit);

      const { data, error } = await query;
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          business_id: d.business_id,
          user_id: d.user_id,
          user_profile: {
            id: d.user_id,
            full_name: 'User',
            email: '',
            avatar_url: null,
            created_at: d.created_at,
            updated_at: d.created_at,
            email_confirmed_at: null,
          },
          module: d.module,
          action: d.action,
          record_id: d.record_id,
          record_title: d.record_title,
          reason: d.reason,
          metadata: d.metadata,
          created_at: d.created_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase getAuditLogs fallback to local:', err);
    }
  }

  // Local Storage retrieval
  try {
    const key = `${LS_AUDIT_PREFIX}${businessId}`;
    const raw = localStorage.getItem(key);
    let logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];

    // Filter
    if (options?.module) {
      logs = logs.filter((l) => l.module.toLowerCase() === options.module?.toLowerCase());
    }
    if (options?.action) {
      logs = logs.filter((l) => l.action === options.action);
    }
    if (options?.userId) {
      logs = logs.filter((l) => l.user_id === options.userId);
    }
    if (options?.startDate) {
      const start = new Date(options.startDate).getTime();
      logs = logs.filter((l) => new Date(l.created_at).getTime() >= start);
    }
    if (options?.endDate) {
      const end = new Date(options.endDate).getTime();
      logs = logs.filter((l) => new Date(l.created_at).getTime() <= end);
    }

    if (options?.limit) {
      const offset = options.offset || 0;
      return logs.slice(offset, offset + options.limit);
    }

    return logs;
  } catch {
    return [];
  }
}
