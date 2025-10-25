import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@context/AuthContext';
import { SelectedClientProvider } from '@context/SelectedClientContext';
import { ErrorBoundary } from './ErrorBoundary';

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SelectedClientProvider>
          <Outlet />
        </SelectedClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
