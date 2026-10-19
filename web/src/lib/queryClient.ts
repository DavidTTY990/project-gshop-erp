import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './apiError';

/** 由表單自行顯示在欄位旁的錯誤，不另跳通知 */
const INLINE_ERROR_CODES = new Set(['DUPLICATE_PHONE']);

const showError = (err: Error) => {
  if (err instanceof ApiError && err.code && INLINE_ERROR_CODES.has(err.code)) return;
  toast.error(err.message);
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: showError }),
  mutationCache: new MutationCache({ onError: showError }),
  defaultOptions: {
    queries: {
      // 後端錯誤（含密碼錯誤）重試也不會成功，只重試一次網路錯誤
      retry: (count, err) => err instanceof ApiError && err.code === 'NETWORK' && count < 1,
      // 1 分鐘內視為最新、不重新讀取；之後切回分頁或重新進入頁面時在背景更新
      staleTime: 60_000,
    },
  },
});
