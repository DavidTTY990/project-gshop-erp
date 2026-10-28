import { HashRouter, Route, Routes } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import RequireAuth from '@/components/RequireAuth';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/queryClient';
import CustomerDetailPage from '@/pages/CustomerDetailPage';
import CustomerNewPage from '@/pages/CustomerNewPage';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import OrderNewPage from '@/pages/OrderNewPage';
import RepairDetailPage from '@/pages/RepairDetailPage';
import RepairNewPage from '@/pages/RepairNewPage';
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
              <Route path="/" element={<HomePage />} />
              <Route path="/customers/new" element={<CustomerNewPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/orders/new" element={<OrderNewPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/repairs/new" element={<RepairNewPage />} />
              <Route path="/repairs/:id" element={<RepairDetailPage />} />
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
