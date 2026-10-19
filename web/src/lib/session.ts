import { useSyncExternalStore } from 'react';

/** 登入狀態存在 localStorage，按「登出」才清除 */
export type Auth = { user: string; key: string };
type Session = { auth: Auth | null; staff: string | null };

const AUTH_KEY = 'gshop.auth';
const STAFF_KEY = 'gshop.staff';

// localStorage 在無痕模式等情況可能無法使用，一律包 try/catch
function load(): Session {
  try {
    const auth = localStorage.getItem(AUTH_KEY);
    return { auth: auth ? JSON.parse(auth) : null, staff: localStorage.getItem(STAFF_KEY) };
  } catch {
    return { auth: null, staff: null };
  }
}

function save(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 無法保存時僅在本次開啟期間有效
  }
}

let session = load();
const listeners = new Set<() => void>();

function update(next: Partial<Session>) {
  session = { ...session, ...next };
  listeners.forEach((l) => l());
}

export function getSession() {
  return session;
}

export function setAuth(auth: Auth) {
  save(AUTH_KEY, JSON.stringify(auth));
  update({ auth });
}

export function setStaff(staff: string) {
  save(STAFF_KEY, staff);
  update({ staff });
}

export function clearSession() {
  save(AUTH_KEY, null);
  save(STAFF_KEY, null);
  update({ auth: null, staff: null });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSession() {
  return useSyncExternalStore(subscribe, getSession);
}
