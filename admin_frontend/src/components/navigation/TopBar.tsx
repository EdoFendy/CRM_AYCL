import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useI18n } from '@i18n/I18nContext';

export function TopBar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{t('layout.currentRoute')}</p>
        <h1 className="text-xl font-semibold text-slate-900">
          {t(`nav.${location.pathname.split('/')[1] || 'dashboard'}`, {
            defaultValue: t('nav.dashboard'),
          })}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <Link
          to="/support"
          className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          {t('layout.supportLink')}
        </Link>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
          <p className="text-xs text-slate-500">{user?.role}</p>
        </div>
      </div>
    </header>
  );
}
