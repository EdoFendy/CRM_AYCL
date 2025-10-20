import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useI18n } from '@i18n/I18nContext';
import { useAuth } from '@context/AuthContext';

const NAV_LINK_CLASSES = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function SidebarNavigation() {
  const { t } = useI18n();
  const { logout } = useAuth();

  const items = useMemo(
    () => [
      { to: '/dashboard', label: t('nav.dashboard') },
      { to: '/portfolio', label: t('nav.portfolio') },
      { to: '/sellers', label: t('nav.sellers') },
      { to: '/resellers', label: t('nav.resellers') },
      { to: '/aycl-kit', label: t('nav.ayclKit') },
      { to: '/start-kit', label: t('nav.startKit') },
      { to: '/users', label: t('nav.users') },
      { to: '/reports', label: t('nav.reports') },
      { to: '/tickets', label: t('nav.tickets') },
      { to: '/payments', label: t('nav.payments') },
      { to: '/contracts', label: t('nav.contracts') },
      { to: '/invoices', label: t('nav.invoices') },
      { to: '/audit', label: t('nav.audit') },
    ],
    [t]
  );

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
      <div className="mb-8 flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-primary/20"></div>
        <div>
          <p className="text-sm font-semibold text-primary">{t('layout.productName')}</p>
          <p className="text-xs text-slate-500">{t('layout.productDomain')}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={NAV_LINK_CLASSES} end>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <button
        className="mt-auto rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100"
        onClick={logout}
        type="button"
      >
        {t('nav.logout')}
      </button>
    </aside>
  );
}
