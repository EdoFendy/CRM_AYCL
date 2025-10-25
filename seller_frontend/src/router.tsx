import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import AppWrapper from '@components/AppWrapper';
import LoginPage from '@pages/LoginPage';
import ProtectedLayout from '@components/layout/ProtectedLayout';

// Lazy load pages for better performance
const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const OpportunitiesPage = lazy(() => import('@pages/OpportunitiesPage'));
const SellerKitPage = lazy(() => import('@pages/SellerKitPage'));
const ReferralPage = lazy(() => import('@pages/ReferralPage'));
const CheckoutsPage = lazy(() => import('@pages/CheckoutsPage'));
const CheckoutRequestsPage = lazy(() => import('@pages/CheckoutRequestsPage'));
const TeamPage = lazy(() => import('@pages/TeamPage'));
const SupportPage = lazy(() => import('@pages/SupportPage'));

// Placeholder pages (will be created)
const ContactsPage = lazy(() => import('@pages/ContactsPage'));
const TasksPage = lazy(() => import('@pages/TasksPage'));
const ActivitiesPage = lazy(() => import('@pages/ActivitiesPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppWrapper />,
    children: [
      {
        path: '/login',
        element: <LoginPage />
      },
      {
        path: '/',
        element: <ProtectedLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/opportunities', element: <OpportunitiesPage /> },
          { path: '/contacts', element: <ContactsPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/activities', element: <ActivitiesPage /> },
          { path: '/starter-kit', element: <SellerKitPage /> },
          { path: '/referrals', element: <ReferralPage /> },
          { path: '/checkouts', element: <CheckoutsPage /> },
          { path: '/checkout-requests', element: <CheckoutRequestsPage /> },
          { path: '/team', element: <TeamPage /> },
          { path: '/support', element: <SupportPage /> },
          { index: true, element: <Navigate to="/dashboard" replace /> }
        ]
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
]);
