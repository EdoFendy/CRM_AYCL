import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import '@/styles/layout.css';

export default function ProtectedLayout() {
  const location = useLocation();
  const { isAuthenticated, loading, user, logout } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">AYCL Seller Kit</h1>
          <p className="app-subtitle">Gestisci carrelli, prodotti e drive test in autonomia</p>
        </div>

        <div className="header-actions">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            {user?.referralCode ? (
              <span className="user-referral">Referral: {user.referralCode}</span>
            ) : null}
          </div>
          <button className="button ghost" onClick={logout}>
            Esci
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
