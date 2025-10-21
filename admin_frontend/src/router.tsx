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
const QuotesPage = lazy(() => import('@pages/QuotesPage'));
const AuditPage = lazy(() => import('@pages/AuditPage'));
const LoginPage = lazy(() => import('@pages/LoginPage'));
const SupportPage = lazy(() => import('@pages/SupportPage'));
const OpportunitiesPage = lazy(() => import('@pages/OpportunitiesPage'));
const ContactsPage = lazy(() => import('@pages/ContactsPage'));
const ContactDetailPage = lazy(() => import('@pages/ContactDetailPage'));
const TasksPage = lazy(() => import('@pages/TasksPage'));
const TeamsPage = lazy(() => import('@pages/TeamsPage'));
const TeamDetailPage = lazy(() => import('@pages/TeamDetailPage'));
const OffersPage = lazy(() => import('@pages/OffersPage'));
const ActivitiesPage = lazy(() => import('@pages/ActivitiesPage'));
const FilesPage = lazy(() => import('@pages/FilesPage'));
const ReferralsPage = lazy(() => import('@pages/ReferralsPage'));
const CheckoutsPage = lazy(() => import('@pages/CheckoutsPage'));
const ReceiptsPage = lazy(() => import('@pages/ReceiptsPage'));
const SignaturesPage = lazy(() => import('@pages/SignaturesPage'));
const PublicSignaturePage = lazy(() => import('@pages/PublicSignaturePage'));
const PublicPaymentPage = lazy(() => import('@pages/PublicPaymentPage'));
const NotificationsPage = lazy(() => import('@pages/NotificationsPage'));
const WebhooksPage = lazy(() => import('@pages/WebhooksPage'));
const RolesPage = lazy(() => import('@pages/RolesPage'));

export const routes = {
  dashboard: <DashboardPage />,
  portfolioList: <PortfolioListPage />,
  portfolioDetail: <PortfolioDetailPage />,
  opportunities: <OpportunitiesPage />,
  contacts: <ContactsPage />,
  contactDetail: <ContactDetailPage />,
  tasks: <TasksPage />,
  activities: <ActivitiesPage />,
  sellers: <SellersPage />,
  resellers: <ResellersPage />,
  teams: <TeamsPage />,
  teamDetail: <TeamDetailPage />,
  offers: <OffersPage />,
  ayclKit: <AYCLKItPage />,
  startKit: <StartKitPage />,
  users: <UsersPage />,
  roles: <RolesPage />,
  reports: <ReportsPage />,
  tickets: <TicketsPage />,
  payments: <PaymentsPage />,
  contracts: <ContractsPage />,
  quotes: <QuotesPage />,
  invoices: <InvoicesPage />,
  receipts: <ReceiptsPage />,
  checkouts: <CheckoutsPage />,
  signatures: <SignaturesPage />,
  publicSignature: <PublicSignaturePage />,
  publicPayment: <PublicPaymentPage />,
  files: <FilesPage />,
  referrals: <ReferralsPage />,
  notifications: <NotificationsPage />,
  webhooks: <WebhooksPage />,
  audit: <AuditPage />,
  login: <LoginPage />,
  support: <SupportPage />,
};
