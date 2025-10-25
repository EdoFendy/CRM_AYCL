import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

const NAV_LINK_CLASSES = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

interface NavSection {
  title: string;
  items: { to: string; label: string; icon?: string }[];
}

export function SidebarNavigation() {
  const { logout, user } = useAuth();

  const sections = useMemo<NavSection[]>(
    () => [
      {
        title: 'Overview',
        items: [
          { to: '/dashboard', label: 'Dashboard', icon: '📊' },
        ],
      },
      {
        title: 'Sales & CRM',
        items: [
          { to: '/opportunities', label: 'Opportunities', icon: '🎯' },
          { to: '/contacts', label: 'Contacts', icon: '👥' },
          { to: '/tasks', label: 'Tasks', icon: '✅' },
          { to: '/activities', label: 'Activities', icon: '📈' },
        ],
      },
      {
        title: 'Team & Collaboration',
        items: [
          { to: '/team', label: 'My Team', icon: '👨‍👩‍👧‍👦' },
          { to: '/referrals', label: 'Referrals', icon: '🔗' },
        ],
      },
      {
        title: 'Products & Tools',
        items: [
          { to: '/aycl-kit', label: 'AYCL Kit', icon: '🛠️' },
          { to: '/start-kit', label: 'Start Kit', icon: '🚀' },
        ],
      },
      {
        title: 'Finance',
        items: [
          { to: '/contracts', label: 'Contracts', icon: '📄' },
          { to: '/quotes', label: 'Quotes', icon: '💰' },
          { to: '/payments', label: 'Payments', icon: '💳' },
        ],
      },
      {
        title: 'Support',
        items: [
          { to: '/tickets', label: 'Tickets', icon: '🎫' },
          { to: '/files', label: 'Files', icon: '📁' },
        ],
      },
    ],
    []
  );

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold text-lg">AY</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">AYCL Seller</p>
          <p className="text-xs text-slate-500">Seller Portal</p>
        </div>
      </div>
      
      <nav className="flex-1 space-y-4 overflow-y-auto pb-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavLink key={item.to} to={item.to} className={NAV_LINK_CLASSES} end>
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      
      <div className="mt-auto space-y-2">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-slate-500">
                {user?.referralCode ? `Ref: ${user.referralCode}` : 'Seller'}
              </p>
            </div>
          </div>
        </div>
        
        <button
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100"
          onClick={logout}
          type="button"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
