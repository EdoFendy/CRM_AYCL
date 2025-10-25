import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@context/AuthContext';

const NAV_LINK_CLASSES = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-100 text-blue-600'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

interface NavSection {
  title: string;
  items: { to: string; label: string }[];
}

export function SidebarNavigation() {
  const { logout } = useAuth();

  const sections = useMemo<NavSection[]>(
    () => [
      {
        title: 'Dashboard',
        items: [
          { to: '/dashboard', label: 'Dashboard' },
        ],
      },
      {
        title: 'Sales & CRM',
        items: [
          { to: '/opportunities', label: 'Opportunità' },
          { to: '/contacts', label: 'Contatti' },
          { to: '/tasks', label: 'Task' },
          { to: '/activities', label: 'Attività' },
        ],
      },
      {
        title: 'Prodotti',
        items: [
          { to: '/starter-kit', label: 'Starter Kit' },
          { to: '/aycl-kit', label: 'AYCL Kit' },
          { to: '/referrals', label: 'Referral Program' },
        ],
      },
      {
        title: 'Team & Finance',
        items: [
          { to: '/team', label: 'Team' },
          { to: '/checkouts', label: 'Checkouts' },
          { to: '/checkout-requests', label: 'Richieste Checkout' },
          { to: '/invoices', label: 'Fatture' },
          { to: '/payments', label: 'Pagamenti' },
        ],
      },
      {
        title: 'Support',
        items: [
          { to: '/support', label: 'Centro Supporto' },
        ],
      },
    ],
    []
  );

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
          <span className="text-sm font-bold text-white">AC</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">AYCL Seller</p>
          <p className="text-xs text-slate-500">CRM Platform</p>
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
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      
      <button
        className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100"
        onClick={logout}
        type="button"
      >
        Esci
      </button>
    </aside>
  );
}
