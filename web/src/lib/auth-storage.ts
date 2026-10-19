import type { AuthUser } from '../types/api';

const ACCESS_TOKEN_KEY = 'wastewise.accessToken';
const USER_KEY = 'wastewise.user';

export const authStorage = {
  getToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getUser(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
  setSession(token: string, user: AuthUser) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};
