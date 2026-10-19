import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './apiError';

const showError = (err: Error) => toast.error(err.message);

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: showError }),
  mutationCache: new MutationCache({ onError: showError }),
  defaultOptions: {
    queries: {
      // 後端錯誤（含密碼錯誤）重試也不會成功，只重試一次網路錯誤
      retry: (count, err) => err instanceof ApiError && err.code === 'NETWORK' && count < 1,
      refetchOnWindowFocus: false,
    },
  },
});
