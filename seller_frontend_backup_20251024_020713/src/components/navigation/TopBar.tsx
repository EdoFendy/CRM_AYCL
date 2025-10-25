import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function TopBar() {
  const { user } = useAuth();
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    
    const pageMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'opportunities': 'Opportunities',
      'contacts': 'Contacts',
      'tasks': 'Tasks',
      'activities': 'Activities',
      'team': 'My Team',
      'referrals': 'Referrals',
      'aycl-kit': 'AYCL Kit',
      'start-kit': 'Start Kit',
      'contracts': 'Contracts',
      'quotes': 'Quotes',
      'payments': 'Payments',
      'tickets': 'Support Tickets',
      'files': 'Files',
    };
    
    return pageMap[segments[0]] || 'Dashboard';
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-sm font-medium text-slate-500">Current Page</p>
        <h1 className="text-xl font-semibold text-slate-900">
          {getPageTitle(location.pathname)}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <Link
          to="/tickets"
          className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          Support
        </Link>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
          <p className="text-xs text-slate-500">
            {user?.referralCode ? `Referral: ${user.referralCode}` : 'Seller'}
          </p>
        </div>
      </div>
    </header>
  );
}
