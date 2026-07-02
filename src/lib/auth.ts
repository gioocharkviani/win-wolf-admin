import type { Admin } from './api';

export function getToken(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem('admin_token') ?? '';
}

export function getMe(): Admin | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('admin_me');
    return raw ? (JSON.parse(raw) as Admin) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, admin: Admin) {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_me', JSON.stringify(admin));
}

export function clearSession() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_me');
}

export function isSuperAdmin(): boolean {
  return getMe()?.role === 'super_admin';
}
