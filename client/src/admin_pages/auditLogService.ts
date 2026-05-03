import API_URL from '../API';

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
  username?: string;
  fullName?: string;
  role?: string;
}

type AuditLogInput = Omit<AuditLogEntry, 'id' | 'actor' | 'role' | 'dateTime'> & {
  actor?: string;
  role?: string;
};

interface AuditLogsResponse {
  logs?: unknown[];
  warning?: string;
}

const SETTINGS_AUDIT_STORAGE_KEY = 'petshieldSettingsAuditLogs';
const MAX_STORED_AUDIT_LOGS = 80;

const normalizeRole = (role?: string) => {
  const roleValue = role?.trim() || 'Admin';
  if (/admin/i.test(roleValue)) return 'Admin';
  if (/vet|doctor/i.test(roleValue)) return 'Veterinarian';
  if (/reception|front|clinical|clinic staff/i.test(roleValue)) return 'Clinic Staff';
  if (/user|client|patient/i.test(roleValue)) return 'User';
  return roleValue;
};

const isAuditLogStatus = (status: unknown): status is AuditLogStatus => (
  status === 'Success' || status === 'Warning' || status === 'Failed'
);

const normalizeAuditLog = (log: any): AuditLogEntry | null => {
  const id = Number(log?.id ?? log?.audit_log_id);
  const status = log?.status;

  if (
    !Number.isFinite(id) ||
    typeof log?.module !== 'string' ||
    typeof log?.event !== 'string' ||
    typeof log?.actor !== 'string' ||
    typeof (log?.role ?? log?.actor_role) !== 'string' ||
    typeof log?.target !== 'string' ||
    typeof log?.summary !== 'string' ||
    typeof (log?.dateTime ?? log?.created_at) !== 'string' ||
    !isAuditLogStatus(status)
  ) {
    return null;
  }

  return {
    id,
    module: log.module,
    event: log.event,
    actor: log.actor,
    role: log.role ?? log.actor_role,
    target: log.target,
    summary: log.summary,
    dateTime: log.dateTime ?? log.created_at,
    status
  };
};

const getCurrentUserId = (currentUser?: CurrentUserLike | null) => (
  (currentUser as any)?.id ?? (currentUser as any)?.pk
);

const saveLocalFallbackLog = (log: AuditLogEntry) => {
  try {
    const nextLogs = [log, ...getStoredAuditLogs()].slice(0, MAX_STORED_AUDIT_LOGS);
    localStorage.setItem(SETTINGS_AUDIT_STORAGE_KEY, JSON.stringify(nextLogs));
  } catch (error) {
    console.error('Failed to save settings audit log fallback', error);
  }
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

export const fetchAuditLogs = async (limit = 500): Promise<{ logs: AuditLogEntry[]; warning?: string }> => {
  const response = await fetch(`${API_URL}/api/audit-logs?limit=${encodeURIComponent(limit)}`);
  const payload: AuditLogsResponse = await response.json().catch(() => ({} as AuditLogsResponse));

  if (!response.ok) {
    throw new Error((payload as any).error || 'Unable to load audit logs.');
  }

  const logs = Array.isArray(payload.logs)
    ? payload.logs
      .map((rawLog: unknown) => normalizeAuditLog(rawLog))
      .filter((log: AuditLogEntry | null): log is AuditLogEntry => Boolean(log))
    : [];

  return {
    logs,
    warning: payload.warning
  };
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

  void fetch(`${API_URL}/api/audit-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      actor,
      role,
      actorId: getCurrentUserId(currentUser),
      actorAccountType: 'employee',
      currentUser
    })
  }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Audit log request failed.');
    }
  }).catch((error) => {
    console.error('Failed to save settings audit log to the backend', error);
    saveLocalFallbackLog(nextLog);
  });

  return nextLog;
};
