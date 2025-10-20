import { lazy } from 'react';

const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const PortfolioListPage = lazy(() => import('@pages/PortfolioListPage'));
const PortfolioDetailPage = lazy(() => import('@pages/PortfolioDetailPage'));
const SellersPage = lazy(() => import('@pages/SellersPage'));
const ResellersPage = lazy(() => import('@pages/ResellersPage'));
const AYCLKItPage = lazy(() => import('@pages/AYCLKitPage'));
const StartKitPage = lazy(() => import('@pages/StartKitPage'));
const UsersPage = lazy(() => import('@pages/UsersPage'));
const ReportsPage = lazy(() => import('@pages/ReportsPage'));
const TicketsPage = lazy(() => import('@pages/TicketsPage'));
const PaymentsPage = lazy(() => import('@pages/PaymentsPage'));
const ContractsPage = lazy(() => import('@pages/ContractsPage'));
const InvoicesPage = lazy(() => import('@pages/InvoicesPage'));
const AuditPage = lazy(() => import('@pages/AuditPage'));
const LoginPage = lazy(() => import('@pages/LoginPage'));
const SupportPage = lazy(() => import('@pages/SupportPage'));

export const routes = {
  dashboard: <DashboardPage />,
  portfolioList: <PortfolioListPage />,
  portfolioDetail: <PortfolioDetailPage />,
  sellers: <SellersPage />,
  resellers: <ResellersPage />,
  ayclKit: <AYCLKItPage />,
  startKit: <StartKitPage />,
  users: <UsersPage />,
  reports: <ReportsPage />,
  tickets: <TicketsPage />,
  payments: <PaymentsPage />,
  contracts: <ContractsPage />,
  invoices: <InvoicesPage />,
  audit: <AuditPage />,
  login: <LoginPage />,
  support: <SupportPage />,
};
