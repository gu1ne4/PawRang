// ─────────────────────────────────────────────
// authUtils.ts
// Shared helpers for auth state across all pages.
// Login stores keys "user" and "access_token" in localStorage.
// All pages should use these helpers instead of reading localStorage directly.
// ─────────────────────────────────────────────

export interface AuthUser {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    contact_number: string;
    role: string;
    status: string;
}

/** Returns the logged-in user object, or null if not logged in. */
export function getUser(): AuthUser | null {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/** Returns the JWT access token, or empty string if not logged in. */
export function getToken(): string {
    return localStorage.getItem('access_token') || '';
}

/** Returns axios-ready Authorization header object. */
export function authHeader(): { Authorization: string } {
    return { Authorization: `Bearer ${getToken()}` };
}

/** Clears all auth state from localStorage. */
export function clearAuth(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
}

/** Returns display name (firstName lastName, or username, or "User"). */
export function getDisplayName(user: AuthUser | null): string {
    if (!user) return '';
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return full || user.username || 'User';
}