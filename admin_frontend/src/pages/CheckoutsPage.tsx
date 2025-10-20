import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';

interface CheckoutRow {
  id: string;
  session: string;
  referral_id: string | null;
  opportunity_id: string | null;
  status: string;
  metadata: any;
  created_at: string;
}

interface Referral {
  id: string;
  code: string;
  owner_user_id: string | null;
}

interface Opportunity {
  id: string;
  title: string;
  company_id: string;
  value: number;
  currency: string;
  stage: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
}

export default function CheckoutsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const [checkoutsQuery, referralsQuery, opportunitiesQuery, companiesQuery] = useQueries({
    queries: [
      {
        queryKey: ['checkouts'],
        queryFn: async () => {
          setError(null);
          try {
            return await apiClient<{ data: CheckoutRow[] }>('checkouts', { token });
          } catch (err: any) {
            setError(err.message);
            throw err;
          }
        },
      },
      {
        queryKey: ['referrals'],
        queryFn: () => apiClient<{ data: Referral[] }>('referrals', { token }),
      },
      {
        queryKey: ['opportunities-list'],
        queryFn: () => apiClient<{ data: Opportunity[] }>('opportunities', { token, searchParams: { limit: 1000 } }),
      },
      {
        queryKey: ['companies-list'],
        queryFn: () => apiClient<{ data: Company[] }>('companies', { token, searchParams: { limit: 1000 } }),
      },
    ],
  });

  const rows = checkoutsQuery.data?.data ?? [];
  const referrals = referralsQuery.data?.data ?? [];
  const opportunities = opportunitiesQuery.data?.data ?? [];
  const companies = companiesQuery.data?.data ?? [];

  // Helper functions to get related data
  const getReferralCode = (referralId: string | null) => {
    if (!referralId) return '—';
    const referral = referrals.find(r => r.id === referralId);
    return referral?.code || 'Unknown';
  };

  const getOpportunityInfo = (opportunityId: string | null) => {
    if (!opportunityId) return null;
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return null;
    
    const company = companies.find(c => c.id === opportunity.company_id);
    return {
      title: opportunity.title,
      company: company?.ragione_sociale || 'Unknown',
      companyId: opportunity.company_id,
      value: opportunity.value,
      currency: opportunity.currency,
    };
  };

  // Calculate metrics
  const completedCheckouts = rows.filter(checkout => checkout.status === 'completed').length;
  const withReferrals = rows.filter(checkout => checkout.referral_id).length;
  const withOpportunities = rows.filter(checkout => checkout.opportunity_id).length;

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Checkout Sessions</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Checkouts</p>
          <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completedCheckouts}</p>
          <p className="text-xs text-slate-400 mt-1">
            {rows.length > 0 ? `${((completedCheckouts / rows.length) * 100).toFixed(1)}%` : '0%'} success rate
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">With Referrals</p>
          <p className="text-2xl font-bold text-blue-600">{withReferrals}</p>
          <p className="text-xs text-slate-400 mt-1">
            {rows.length > 0 ? `${((withReferrals / rows.length) * 100).toFixed(1)}%` : '0%'} referral rate
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Linked to Opportunities</p>
          <p className="text-2xl font-bold text-purple-600">{withOpportunities}</p>
          <p className="text-xs text-slate-400 mt-1">
            {rows.length > 0 ? `${((withOpportunities / rows.length) * 100).toFixed(1)}%` : '0%'} linked
          </p>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={[
          { 
            id: 'session', 
            header: 'Session ID', 
            cell: (checkout) => (
              <div>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                  {checkout.session.substring(0, 20)}...
                </code>
              </div>
            )
          },
          {
            id: 'status',
            header: 'Status',
            cell: (checkout) => (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                checkout.status === 'completed' 
                  ? 'bg-green-100 text-green-700' 
                  : checkout.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {checkout.status}
              </span>
            ),
          },
          { 
            id: 'referral', 
            header: 'Referral Code', 
            cell: (checkout) => (
              <span className="text-sm font-medium text-slate-700">
                {getReferralCode(checkout.referral_id)}
              </span>
            )
          },
          { 
            id: 'opportunity', 
            header: 'Opportunity', 
            cell: (checkout) => {
              const oppInfo = getOpportunityInfo(checkout.opportunity_id);
              if (!oppInfo) return '—';
              
              return (
                <div className="text-sm">
                  <p className="font-medium text-slate-900">{oppInfo.title}</p>
                  <Link 
                    to={`/portfolio/${oppInfo.companyId}`} 
                    className="text-xs text-primary hover:underline"
                  >
                    {oppInfo.company}
                  </Link>
                  <p className="text-xs text-green-600 font-semibold">
                    €{oppInfo.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            }
          },
          { 
            id: 'created', 
            header: 'Created', 
            cell: (checkout) => (
              <div className="text-sm text-slate-600">
                {new Date(checkout.created_at).toLocaleDateString()}
                <div className="text-xs text-slate-400">
                  {new Date(checkout.created_at).toLocaleTimeString()}
                </div>
              </div>
            )
          },
        ]}
        emptyState={<span>{t('tables.empty')}</span>}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

