import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@/lib/session';

/** 未登入或尚未選擇店員時導向 /login，並記住原本要去的頁面 */
export default function RequireAuth() {
  const { auth, staff } = useSession();
  const location = useLocation();

  if (!auth || !staff) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
