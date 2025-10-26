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
          <Route path="/public/sign/:token" element={routes.publicSignature} />
          <Route path="/public/pay/:token" element={routes.publicPayment} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={routes.dashboard} />
            <Route path="/portfolio" element={routes.portfolioList} />
            <Route path="/portfolio/:companyId" element={routes.portfolioDetail} />
            <Route path="/opportunities" element={routes.opportunities} />
            <Route path="/contacts" element={routes.contacts} />
            <Route path="/contacts/:contactId" element={routes.contactDetail} />
            <Route path="/tasks" element={routes.tasks} />
            <Route path="/activities" element={routes.activities} />
            <Route path="/sellers" element={routes.sellers} />
            <Route path="/seller-assignments" element={routes.sellerAssignments} />
            <Route path="/resellers" element={routes.resellers} />
            <Route path="/teams" element={routes.teams} />
            <Route path="/teams/:teamId" element={routes.teamDetail} />
            <Route path="/offers" element={routes.offers} />
            <Route path="/aycl-kit" element={routes.ayclKit} />
            <Route path="/start-kit" element={routes.startKit} />
            <Route path="/users" element={routes.users} />
            <Route path="/roles" element={routes.roles} />
            <Route path="/reports" element={routes.reports} />
            <Route path="/tickets" element={routes.tickets} />
            <Route path="/payments" element={routes.payments} />
            <Route path="/contracts" element={routes.contracts} />
            <Route path="/quotes" element={routes.quotes} />
            <Route path="/invoices" element={routes.invoices} />
            <Route path="/receipts" element={routes.receipts} />
            <Route path="/checkouts" element={routes.checkouts} />
            <Route path="/signatures" element={routes.signatures} />
            <Route path="/files" element={routes.files} />
            <Route path="/referrals" element={routes.referrals} />
            <Route path="/notifications" element={routes.notifications} />
            <Route path="/webhooks" element={routes.webhooks} />
            <Route path="/pdf-templates" element={routes.pdfTemplates} />
            <Route path="/audit" element={routes.audit} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
