import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/kit/cart', label: 'Carrelli personalizzati' },
  { to: '/kit/drive-test', label: 'Drive Test' },
  { to: '/kit/products', label: 'Prodotti WooCommerce' },
  { to: '/kit/resources', label: 'Risorse' }
];

const TAB_CLASS = ({ isActive }: { isActive: boolean }) =>
  [
    'kit-tab',
    isActive ? 'kit-tab-active' : 'kit-tab-idle'
  ].join(' ');

export default function KitLayout() {
  return (
    <div className="grid gap-6">
      <div className="card">
        <h1>Seller Kit</h1>
        <p className="helper">
          Gestisci tutti gli strumenti per chiudere i clienti: carrelli, drive test, prodotti e risorse.
        </p>
        <div className="kit-tabs">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={TAB_CLASS}>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
