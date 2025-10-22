import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppWrapper from '@/components/AppWrapper';
import LoginPage from '@/pages/LoginPage';
import SellerKitPage from '@/pages/SellerKitPage';
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
          { index: true, element: <SellerKitPage /> }
        ]
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
]);
