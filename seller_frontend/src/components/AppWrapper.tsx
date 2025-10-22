import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';

export default function AppWrapper() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
