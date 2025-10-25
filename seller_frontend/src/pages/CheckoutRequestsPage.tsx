import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { DataTable } from '@components/data/DataTable';
import { StatusBadge } from '@components/ui/StatusBadge';

interface CheckoutRequest {
  id: string;
  referral_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company_name?: string;
  request_type: 'drive_test' | 'custom' | 'bundle';
  product_data: Record<string, any>;
  pricing_data: Record<string, any>;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at?: string;
  seller_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function CheckoutRequestsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ['checkout-requests'],
    queryFn: () => apiClient<{ data: CheckoutRequest[] }>('checkout-requests', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? []
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiClient(`checkout-requests/${requestId}`, {
        token,
        method: 'PATCH',
        body: {
          status: 'accepted',
          seller_id: token // This should be the user ID, but for now using token
        }
      });
    },
    onSuccess: () => {
      toast.success('Richiesta accettata');
      queryClient.invalidateQueries({ queryKey: ['checkout-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nell\'accettazione');
    }
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiClient(`checkout-requests/${requestId}`, {
        token,
        method: 'PATCH',
        body: {
          status: 'rejected'
        }
      });
    },
    onSuccess: () => {
      toast.success('Richiesta rifiutata');
      queryClient.invalidateQueries({ queryKey: ['checkout-requests'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nel rifiuto');
    }
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'expired': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'drive_test': return 'Drive Test';
      case 'custom': return 'Personalizzato';
      case 'bundle': return 'Bundle';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      key: 'customer_name',
      label: 'Cliente',
      render: (request: CheckoutRequest) => (
        <div>
          <div className="font-medium">{request.customer_name}</div>
          <div className="text-sm text-gray-500">{request.customer_email}</div>
          {request.company_name && (
            <div className="text-sm text-gray-400">{request.company_name}</div>
          )}
        </div>
      )
    },
    {
      key: 'request_type',
      label: 'Tipo',
      render: (request: CheckoutRequest) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {getRequestTypeLabel(request.request_type)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Stato',
      render: (request: CheckoutRequest) => (
        <StatusBadge status={getStatusVariant(request.status)}>
          {request.status === 'pending' ? 'In attesa' :
           request.status === 'accepted' ? 'Accettata' :
           request.status === 'rejected' ? 'Rifiutata' :
           request.status === 'expired' ? 'Scaduta' : request.status}
        </StatusBadge>
      )
    },
    {
      key: 'created_at',
      label: 'Data',
      render: (request: CheckoutRequest) => formatDate(request.created_at)
    },
    {
      key: 'actions',
      label: 'Azioni',
      render: (request: CheckoutRequest) => (
        <div className="flex gap-2">
          {request.status === 'pending' && (
            <>
              <button
                onClick={() => acceptRequestMutation.mutate(request.id)}
                disabled={acceptRequestMutation.isPending}
                className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 disabled:opacity-50"
              >
                Accetta
              </button>
              <button
                onClick={() => rejectRequestMutation.mutate(request.id)}
                disabled={rejectRequestMutation.isPending}
                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50"
              >
                Rifiuta
              </button>
            </>
          )}
          {request.status === 'accepted' && (
            <span className="text-xs text-green-600 font-medium">
              ✓ Gestita
            </span>
          )}
        </div>
      )
    }
  ];

  if (requestsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" />
        <p className="ml-3 text-slate-600">Caricamento richieste...</p>
      </div>
    );
  }

  if (requestsQuery.isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Errore nel caricamento delle richieste</p>
      </div>
    );
  }

  const requests = requestsQuery.data ?? [];
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const acceptedRequests = requests.filter(r => r.status === 'accepted');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Richieste Checkout</h1>
        <p className="text-slate-600">
          Gestisci le richieste di Drive Test e checkout personalizzati dai tuoi clienti
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">{requests.length}</div>
          <div className="text-sm text-slate-600">Totale Richieste</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-amber-600">{pendingRequests.length}</div>
          <div className="text-sm text-slate-600">In Attesa</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-2xl font-bold text-green-600">{acceptedRequests.length}</div>
          <div className="text-sm text-slate-600">Accettate</div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <DataTable
          data={requests}
          columns={columns}
          emptyMessage="Nessuna richiesta trovata"
        />
      </div>
    </div>
  );
}
