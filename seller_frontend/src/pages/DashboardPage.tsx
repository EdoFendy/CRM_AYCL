import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface DashboardMetrics {
  total_contacts: number;
  total_companies: number;
  total_opportunities: number;
  total_quotes: number;
  total_contracts: number;
  total_invoices: number;
  pending_invoices: number;
  total_checkouts: number;
  total_revenue: number;
  monthly_revenue: number;
}

interface RecentActivity {
  id: string;
  type: 'contact' | 'company' | 'opportunity' | 'quote' | 'contract' | 'invoice' | 'checkout';
  title: string;
  description: string;
  created_at: string;
  status?: string;
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  company_name?: string;
  expected_close_date?: string;
}

export default function DashboardPage() {
  const { token, user } = useAuth();

  // Fetch dashboard metrics
  const metricsQuery = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const [contacts, companies, opportunities, quotes, contracts, invoices, checkouts] = await Promise.all([
        apiClient<{ data: any[] }>('contacts', { token, searchParams: { owner_id: user?.id } }),
        apiClient<{ data: any[] }>('companies', { token, searchParams: { owner_id: user?.id } }),
        apiClient<{ data: any[] }>('opportunities', { token, searchParams: { owner_id: user?.id } }),
        apiClient<{ data: any[] }>('quotes', { token, searchParams: { seller_id: user?.id } }),
        apiClient<{ data: any[] }>('contracts', { token, searchParams: { seller_id: user?.id } }),
        apiClient<{ data: any[] }>('invoices', { token, searchParams: { seller_id: user?.id } }),
        apiClient<{ data: any[] }>('checkouts', { token, searchParams: { seller_user_id: user?.id } }),
      ]);

      const totalRevenue = checkouts.data?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
      const currentMonth = new Date().getMonth();
      const monthlyRevenue = checkouts.data?.filter((c: any) => {
        const checkoutMonth = new Date(c.created_at).getMonth();
        return checkoutMonth === currentMonth;
      }).reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;

      const pendingInvoices = invoices.data?.filter((i: any) => i.status === 'pending').length || 0;

      return {
        total_contacts: contacts.data?.length || 0,
        total_companies: companies.data?.length || 0,
        total_opportunities: opportunities.data?.length || 0,
        total_quotes: quotes.data?.length || 0,
        total_contracts: contracts.data?.length || 0,
        total_invoices: invoices.data?.length || 0,
        pending_invoices: pendingInvoices,
        total_checkouts: checkouts.data?.length || 0,
        total_revenue: totalRevenue,
        monthly_revenue: monthlyRevenue,
      } as DashboardMetrics;
    },
    enabled: Boolean(token && user?.id),
  });

  // Fetch recent opportunities
  const opportunitiesQuery = useQuery({
    queryKey: ['opportunities', 'recent'],
    queryFn: () =>
      apiClient<{ data: Opportunity[] }>('opportunities', {
        token,
        searchParams: { owner_id: user?.id, limit: '5' },
      }),
    enabled: Boolean(token && user?.id),
    select: (res) => res.data ?? [],
  });

  const metrics = metricsQuery.data;
  const opportunities = opportunitiesQuery.data ?? [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: it });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">
          Benvenuto, <strong>{user?.full_name || user?.email}</strong>
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium opacity-90">Fatturato Totale</div>
            <div className="text-2xl">💰</div>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(metrics?.total_revenue || 0)}</div>
          <div className="text-xs opacity-75 mt-2">
            Questo mese: {formatCurrency(metrics?.monthly_revenue || 0)}
          </div>
        </div>

        {/* Checkouts Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium opacity-90">Checkouts</div>
            <div className="text-2xl">🛒</div>
          </div>
          <div className="text-3xl font-bold">{metrics?.total_checkouts || 0}</div>
          <div className="text-xs opacity-75 mt-2">Totale vendite completate</div>
        </div>

        {/* Opportunities Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium opacity-90">Trattative</div>
            <div className="text-2xl">📊</div>
          </div>
          <div className="text-3xl font-bold">{metrics?.total_opportunities || 0}</div>
          <div className="text-xs opacity-75 mt-2">Opportunità attive</div>
        </div>

        {/* Invoices Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium opacity-90">Fatture</div>
            <div className="text-2xl">📄</div>
          </div>
          <div className="text-3xl font-bold">{metrics?.total_invoices || 0}</div>
          <div className="text-xs opacity-75 mt-2">
            {metrics?.pending_invoices || 0} in attesa di approvazione
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link to="/contacts" className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-slate-600">Contatti</div>
            <div className="text-2xl">👤</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.total_contacts || 0}</div>
        </Link>

        <Link to="/portfolio" className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-slate-600">Aziende</div>
            <div className="text-2xl">🏢</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.total_companies || 0}</div>
        </Link>

        <Link to="/kit/quotes" className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-slate-600">Preventivi</div>
            <div className="text-2xl">📋</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.total_quotes || 0}</div>
        </Link>

        <Link to="/kit/contracts" className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-slate-600">Contratti</div>
            <div className="text-2xl">📝</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.total_contracts || 0}</div>
        </Link>
      </div>

      {/* Recent Opportunities */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Trattative Recenti</h2>
          <Link to="/opportunities" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Vedi tutte →
          </Link>
        </div>

        {opportunitiesQuery.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Caricamento...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Nessuna trattativa attiva</p>
            <Link to="/opportunities" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
              Crea la tua prima trattativa
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div key={opp.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{opp.title}</h3>
                  {opp.company_name && (
                    <p className="text-sm text-slate-500">{opp.company_name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {opp.stage}
                    </span>
                    {opp.expected_close_date && (
                      <span className="text-xs text-slate-500">
                        Chiusura prevista: {formatDate(opp.expected_close_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-semibold text-slate-900">
                    {formatCurrency(opp.value)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link to="/kit/drive-test" className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-6 text-white hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">🚗</div>
          <h3 className="text-lg font-semibold mb-1">Configura Drive Test</h3>
          <p className="text-sm opacity-90">Crea un preventivo Drive Test personalizzato</p>
        </Link>

        <Link to="/kit/bundles" className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-6 text-white hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">📦</div>
          <h3 className="text-lg font-semibold mb-1">Crea Bundle</h3>
          <p className="text-sm opacity-90">Costruisci un bundle personalizzato con sconti</p>
        </Link>

        <Link to="/kit/proposals" className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-6 text-white hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">📝</div>
          <h3 className="text-lg font-semibold mb-1">Genera Proposta</h3>
          <p className="text-sm opacity-90">Crea una proposta commerciale professionale</p>
        </Link>
      </div>
    </div>
  );
}