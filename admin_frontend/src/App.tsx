import { Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { AppShell } from '@components/layout/AppShell';
import { routes } from './router';
import { LoadingScreen } from '@components/feedback/LoadingScreen';
import { ErrorBoundary } from '@components/feedback/ErrorBoundary';

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}> 
        <Routes>
          <Route path="/login" element={routes.login} />
          <Route path="/support" element={routes.support} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={routes.dashboard} />
            <Route path="/portfolio" element={routes.portfolioList} />
            <Route path="/portfolio/:companyId" element={routes.portfolioDetail} />
            <Route path="/sellers" element={routes.sellers} />
            <Route path="/resellers" element={routes.resellers} />
            <Route path="/aycl-kit" element={routes.ayclKit} />
            <Route path="/start-kit" element={routes.startKit} />
            <Route path="/users" element={routes.users} />
            <Route path="/reports" element={routes.reports} />
            <Route path="/tickets" element={routes.tickets} />
            <Route path="/payments" element={routes.payments} />
            <Route path="/contracts" element={routes.contracts} />
            <Route path="/invoices" element={routes.invoices} />
            <Route path="/audit" element={routes.audit} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
