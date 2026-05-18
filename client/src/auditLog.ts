const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000';

type AuditLogPayload = {
  module: string;
  event: string;
  target?: string;
  targetType?: string;
  targetId?: string | number | null;
  branchId?: string | number | null;
  summary?: string;
  status?: 'Success' | 'Warning' | 'Failed';
  metadata?: Record<string, any>;
};

const getCurrentAuditUser = () => {
  try {
    const session = localStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
};

export const recordAuditLog = async (payload: AuditLogPayload): Promise<void> => {
  const currentUser = getCurrentAuditUser();
  const userId = currentUser?.id || currentUser?.pk;
  const role = currentUser?.role;
  const normalizedRole = String(role || '').toLowerCase();
  const accountType =
    currentUser?.account_type ||
    currentUser?.accountType ||
    (normalizedRole.includes('patient') || normalizedRole.includes('owner') || normalizedRole.includes('user')
      ? 'patient'
      : 'employee');

  try {
    await fetch(`${API_URL}/api/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        actorId: userId,
        userId,
        actorAccountType: currentUser ? accountType : undefined,
        userType: currentUser ? accountType : undefined,
        username: currentUser?.username || currentUser?.fullName || currentUser?.fullname,
        role,
        currentUser,
      }),
    });
  } catch (error) {
    console.warn('Audit log request failed:', error);
  }
};
