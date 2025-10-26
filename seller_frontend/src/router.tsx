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

// Kit pages
const SellerKitUnifiedPage = lazy(() => import('@pages/SellerKitUnifiedPage'));
const DriveTestPage = lazy(() => import('@pages/kit/DriveTestPage'));
const BundleBuilderPage = lazy(() => import('@pages/kit/BundleBuilderPage'));
const DiscountCodesPage = lazy(() => import('@pages/kit/DiscountCodesPage'));
const ProposalGeneratorPage = lazy(() => import('@pages/kit/ProposalGeneratorPage'));
const QuoteGeneratorPage = lazy(() => import('@pages/kit/QuoteGeneratorPage'));
const ContractsPage = lazy(() => import('@pages/kit/ContractsPage'));
const InvoicesPage = lazy(() => import('@pages/kit/InvoicesPage'));
const ResourcesPage = lazy(() => import('@pages/kit/ResourcesPage'));

// Placeholder pages (will be created)
const ContactsPage = lazy(() => import('@pages/ContactsPage'));
const TasksPage = lazy(() => import('@pages/TasksPage'));
const ActivitiesPage = lazy(() => import('@pages/ActivitiesPage'));
const CompaniesPage = lazy(() => import('@pages/CompaniesPage'));
const SmartViewsPage = lazy(() => import('@pages/SmartViewsPage'));
const PortfolioPage = lazy(() => import('@pages/PortfolioPage'));

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
          { path: '/companies', element: <CompaniesPage /> },
          { path: '/smart-views', element: <SmartViewsPage /> },
          { path: '/portfolio', element: <PortfolioPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/activities', element: <ActivitiesPage /> },
          { path: '/seller-kit', element: <SellerKitUnifiedPage /> },
          { path: '/kit/drive-test', element: <DriveTestPage /> },
          { path: '/kit/bundles', element: <BundleBuilderPage /> },
          { path: '/kit/discount-codes', element: <DiscountCodesPage /> },
          { path: '/kit/proposals', element: <ProposalGeneratorPage /> },
          { path: '/kit/quotes', element: <QuoteGeneratorPage /> },
          { path: '/kit/contracts', element: <ContractsPage /> },
          { path: '/kit/invoices', element: <InvoicesPage /> },
          { path: '/kit/resources', element: <ResourcesPage /> },
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
