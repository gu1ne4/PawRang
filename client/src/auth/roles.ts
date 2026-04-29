export interface SessionUser {
  id?: string | number;
  pk?: string | number;
  username?: string;
  fullname?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  userType?: string;
  userImage?: string;
  image?: string;
}

export const normalizeRole = (role?: string | null): string =>
  (role || '').toString().trim().toLowerCase().replace(/[\s_-]+/g, '');

export const isAdminRole = (role?: string | null): boolean => {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'administrator';
};

export const isDoctorRole = (role?: string | null): boolean => {
  const normalized = normalizeRole(role);
  return normalized === 'doctor' || normalized === 'vet' || normalized === 'veterinarian';
};

export const isPatientUser = (user?: SessionUser | null): boolean =>
  normalizeRole(user?.role) === 'user' || normalizeRole(user?.userType) === 'patient';

export const getSessionUser = (): SessionUser | null => {
  try {
    const rawSession = localStorage.getItem('userSession');
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
};

export const getDefaultRouteForUser = (user?: SessionUser | null): string => {
  if (!user) return '/login';
  if (isAdminRole(user.role)) return '/admin/home';
  if (isDoctorRole(user.role)) return '/doctor/home';
  return '/user/home';
};

export const userHasAllowedRole = (user: SessionUser | null, allowedRoles?: string[]): boolean => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const allowed = allowedRoles.map(normalizeRole);

  if (isAdminRole(user?.role)) {
    return allowed.some((role) => role === 'admin' || role === 'administrator');
  }

  if (isDoctorRole(user?.role)) {
    return allowed.some((role) => role === 'doctor' || role === 'vet' || role === 'veterinarian');
  }

  if (isPatientUser(user)) {
    return allowed.some((role) => role === 'user' || role === 'patient');
  }

  return allowed.includes(normalizeRole(user?.role));
};
