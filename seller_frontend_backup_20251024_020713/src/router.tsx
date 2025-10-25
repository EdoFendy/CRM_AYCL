import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppWrapper from '@/components/AppWrapper';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OpportunitiesPage from '@/pages/OpportunitiesPage';
import ContactsPage from '@/pages/ContactsPage';
import TeamPage from '@/pages/TeamPage';
import ProtectedLayout from '@/components/layout/ProtectedLayout';

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
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'opportunities', element: <OpportunitiesPage /> },
          { path: 'contacts', element: <ContactsPage /> },
          { path: 'team', element: <TeamPage /> },
        ]
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />
      }
    ]
  }
]);
