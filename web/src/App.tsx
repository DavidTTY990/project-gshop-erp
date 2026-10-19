import { HashRouter, Route, Routes } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import RequireAuth from '@/components/RequireAuth';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/queryClient';
import LoginPage from '@/pages/LoginPage';
import PlaceholderPage from '@/pages/PlaceholderPage';

// GitHub Pages 沒有伺服器端路由，使用 HashRouter（網址形如 /#/orders）
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<PlaceholderPage title="首頁" />} />
              <Route path="/customers/new" element={<PlaceholderPage title="新增客人" />} />
              <Route path="/customers/:id" element={<PlaceholderPage title="客人資料" />} />
              <Route path="/orders/new" element={<PlaceholderPage title="新增訂單" />} />
              <Route path="/orders/:id" element={<PlaceholderPage title="訂單詳情" />} />
              <Route path="/repairs/new" element={<PlaceholderPage title="新增維修單" />} />
              <Route path="/repairs/:id" element={<PlaceholderPage title="維修單詳情" />} />
              <Route path="*" element={<PlaceholderPage title="找不到頁面" />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}

export default App;
