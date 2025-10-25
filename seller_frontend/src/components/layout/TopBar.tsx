import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';

const ROUTE_NAMES: Record<string, string> = {
  'dashboard': 'Dashboard',
  'opportunities': 'Opportunità',
  'contacts': 'Contatti',
  'tasks': 'Task',
  'activities': 'Attività',
  'starter-kit': 'Starter Kit',
  'aycl-kit': 'AYCL Kit',
  'referrals': 'Referral Program',
  'team': 'Team',
  'checkouts': 'Checkouts',
  'invoices': 'Fatture',
  'payments': 'Pagamenti',
  'support': 'Support',
};

export function TopBar() {
  const { user } = useAuth();
  const location = useLocation();
  
  const pathSegment = location.pathname.split('/')[1] || 'dashboard';
  const pageTitle = ROUTE_NAMES[pathSegment] || 'Dashboard';

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-sm font-medium text-slate-500">Sei qui</p>
        <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>
      </div>
      <div className="flex items-center gap-4">
        <Link
          to="/support"
          className="rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
        >
          Supporto
        </Link>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
          <p className="text-xs text-slate-500">
            {user?.role || 'Seller'}
            {user?.referralCode && ` • ${user.referralCode}`}
          </p>
        </div>
      </div>
    </header>
  );
}
