import { useQuery } from '@tanstack/react-query';
import { ApiError } from './apiError';
import { queryClient } from './queryClient';
import { clearSession, getSession, useSession, type Auth } from './session';

const API_URL = import.meta.env.VITE_API_URL;

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string; code?: string; data?: unknown };

/**
 * 呼叫後端。一律 POST，Content-Type 用 text/plain 以避開 CORS preflight。
 * 未指定 auth 時使用已登入的帳密；此時若後端回傳 AUTH（例如密碼已更換）會自動登出。
 */
export async function callApi<T>(action: string, params?: object, auth?: Auth): Promise<T> {
  const useSessionAuth = !auth;
  const body = JSON.stringify({ action, auth: auth ?? getSession().auth, params });

  let json: ApiResponse<T>;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
    });
    json = await res.json();
  } catch {
    throw new ApiError('無法連線到伺服器，請稍後再試', 'NETWORK');
  }

  if (json.ok) return json.data;
  if (json.code === 'AUTH' && useSessionAuth) {
    clearSession();
    queryClient.clear();
    throw new ApiError('登入已失效，請重新登入', 'AUTH');
  }
  throw new ApiError(json.error, json.code, json.data);
}

/** Settings 分頁的下拉選項，例：{ staff: ['小明'], category: [...] } */
export type Settings = Record<string, string[]>;

/** 每次開啟網頁讀取一次，之後使用快取 */
export function useSettings() {
  const { auth } = useSession();
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => callApi<Settings>('settings'),
    enabled: !!auth,
    staleTime: Infinity,
  });
}
