export type AuditLogStatus = 'Success' | 'Warning' | 'Failed';

export interface AuditLogEntry {
  id: number;
  module: string;
  event: string;
  actor: string;
  role: string;
  target: string;
  summary: string;
  dateTime: string;
  status: AuditLogStatus;
}

interface CurrentUserLike {
  id?: string | number;
  pk?: string | number;
  username?: string;
  fullName?: string;
  role?: string;
}

type AuditLogInput = Omit<AuditLogEntry, 'id' | 'actor' | 'role' | 'dateTime'> & {
  actor?: string;
  role?: string;
};

const SETTINGS_AUDIT_STORAGE_KEY = 'petshieldSettingsAuditLogs';
const MAX_STORED_AUDIT_LOGS = 80;
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000';

const normalizeRole = (role?: string) => {
  const roleValue = role?.trim() || 'Admin';
  if (/admin/i.test(roleValue)) return 'Admin';
  if (/vet|doctor/i.test(roleValue)) return 'Veterinarian';
  if (/reception|front/i.test(roleValue)) return 'Receptionist';
  if (/user|client|patient/i.test(roleValue)) return 'User';
  return roleValue;
};

export const getStoredAuditLogs = (): AuditLogEntry[] => {
  try {
    const rawLogs = localStorage.getItem(SETTINGS_AUDIT_STORAGE_KEY);
    if (!rawLogs) return [];

    const parsedLogs = JSON.parse(rawLogs);
    if (!Array.isArray(parsedLogs)) return [];

    return parsedLogs.filter((log): log is AuditLogEntry => (
      typeof log?.id === 'number' &&
      typeof log?.module === 'string' &&
      typeof log?.event === 'string' &&
      typeof log?.actor === 'string' &&
      typeof log?.role === 'string' &&
      typeof log?.target === 'string' &&
      typeof log?.summary === 'string' &&
      typeof log?.dateTime === 'string' &&
      ['Success', 'Warning', 'Failed'].includes(log?.status)
    ));
  } catch (error) {
    console.error('Failed to load settings audit logs', error);
    return [];
  }
};

export const recordSettingsAuditLog = (input: AuditLogInput, currentUser?: CurrentUserLike | null) => {
  const actor = input.actor || currentUser?.username || currentUser?.fullName || 'developer.settings';
  const role = normalizeRole(input.role || currentUser?.role);

  const nextLog: AuditLogEntry = {
    ...input,
    id: Date.now(),
    actor,
    role,
    dateTime: new Date().toISOString()
  };

  try {
    const nextLogs = [nextLog, ...getStoredAuditLogs()].slice(0, MAX_STORED_AUDIT_LOGS);
    localStorage.setItem(SETTINGS_AUDIT_STORAGE_KEY, JSON.stringify(nextLogs));
  } catch (error) {
    console.error('Failed to save settings audit log', error);
  }

  fetch(`${API_URL}/api/audit-notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...nextLog,
      actorId: currentUser?.id || currentUser?.pk || null,
    }),
  }).catch((error) => {
    console.error('Failed to create audit notification', error);
  });

  return nextLog;
};
