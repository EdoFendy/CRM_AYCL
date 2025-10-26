import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ReferralData {
  referral_code: string;
  referral_link: string;
  checkout_url: string;
}

interface CheckoutStats {
  total: number;
  this_month: number;
  total_revenue: number;
  monthly_revenue: number;
  conversion_rate: number;
}

interface Checkout {
  id: string;
  order_data: any;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function ReferralPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [showQR, setShowQR] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch referral data
  const referralQuery = useQuery({
    queryKey: ['referral', 'me'],
    queryFn: () => apiClient<ReferralData>('referral/me', { token }),
    enabled: Boolean(token),
  });

  // Fetch checkouts with referral
  const checkoutsQuery = useQuery({
    queryKey: ['checkouts', 'referral'],
    queryFn: () =>
      apiClient<{ data: Checkout[] }>('checkouts', {
        token,
        searchParams: { seller_user_id: user?.id },
      }),
    enabled: Boolean(token && user?.id),
    select: (res) => res.data ?? [],
  });

  // Create referral mutation
  const createReferralMutation = useMutation({
    mutationFn: () => apiClient('referral', { token, method: 'POST' }),
    onSuccess: () => {
      toast.success('Referral link creato con successo!');
      queryClient.invalidateQueries({ queryKey: ['referral'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella creazione del referral link');
    },
  });

  const referralData = referralQuery.data;
  const checkouts = checkoutsQuery.data ?? [];

  // Calculate stats
  const stats: CheckoutStats = {
    total: checkouts.length,
    this_month: checkouts.filter(c => {
      const checkoutMonth = new Date(c.created_at).getMonth();
      return checkoutMonth === new Date().getMonth();
    }).length,
    total_revenue: checkouts.reduce((sum, c) => sum + (c.amount || 0), 0),
    monthly_revenue: checkouts.filter(c => {
      const checkoutMonth = new Date(c.created_at).getMonth();
      return checkoutMonth === new Date().getMonth();
    }).reduce((sum, c) => sum + (c.amount || 0), 0),
    conversion_rate: 0, // TODO: Calculate from checkout_requests
  };

  const handleCopyLink = () => {
    if (referralData?.checkout_url) {
      navigator.clipboard.writeText(referralData.checkout_url);
      toast.success('Link copiato negli appunti!');
    }
  };

  const handleCopyCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code);
      toast.success('Codice copiato negli appunti!');
    }
  };

  const generateQRCode = async () => {
    if (!referralData?.checkout_url || !qrCanvasRef.current) return;

    try {
      // Using QRCode.js library (need to install: npm install qrcode)
      const QRCode = (await import('qrcode')).default;
      await QRCode.toCanvas(qrCanvasRef.current, referralData.checkout_url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      });
      setShowQR(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Errore nella generazione del QR code. Installa la libreria qrcode.');
    }
  };

  const downloadQRCode = () => {
    if (!qrCanvasRef.current) return;
    
    const url = qrCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `referral-qr-${referralData?.referral_code}.png`;
    link.href = url;
    link.click();
    toast.success('QR Code scaricato!');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: it });
    } catch {
      return dateString;
    }
  };

  if (referralQuery.isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento referral...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Referral Analytics</h1>
        <p className="text-slate-600">
          Monitora le performance del tuo link referral e le conversioni
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-medium opacity-90 mb-2">Fatturato Totale</div>
          <div className="text-3xl font-bold">{formatCurrency(stats.total_revenue)}</div>
          <div className="text-xs opacity-75 mt-2">
            Questo mese: {formatCurrency(stats.monthly_revenue)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-medium opacity-90 mb-2">Checkouts Totali</div>
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-xs opacity-75 mt-2">
            Questo mese: {stats.this_month}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-medium opacity-90 mb-2">Tasso Conversione</div>
          <div className="text-3xl font-bold">{stats.conversion_rate.toFixed(1)}%</div>
          <div className="text-xs opacity-75 mt-2">Media settore: 2.5%</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-medium opacity-90 mb-2">Valore Medio</div>
          <div className="text-3xl font-bold">
            {stats.total > 0 ? formatCurrency(stats.total_revenue / stats.total) : formatCurrency(0)}
          </div>
          <div className="text-xs opacity-75 mt-2">Per checkout</div>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Il Tuo Link Referral</h2>

        {!referralData ? (
          <div className="text-center py-8">
            <p className="text-slate-600 mb-4">Non hai ancora un link referral</p>
            <button
              onClick={() => createReferralMutation.mutate()}
              disabled={createReferralMutation.isPending}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {createReferralMutation.isPending ? 'Creazione...' : 'Crea Link Referral'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Referral Code */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Codice Referral
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={referralData.referral_code}
                  readOnly
                  className="flex-1 rounded-md border border-slate-300 px-4 py-2 bg-slate-50 font-mono text-sm"
                />
                <button
                  onClick={handleCopyCode}
                  className="bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700 font-medium"
                >
                  Copia Codice
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Link Checkout
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={referralData.checkout_url}
                  readOnly
                  className="flex-1 rounded-md border border-slate-300 px-4 py-2 bg-slate-50 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                >
                  Copia Link
                </button>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">QR Code</h3>
                <div className="flex gap-2">
                  <button
                    onClick={generateQRCode}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium text-sm"
                  >
                    Genera QR Code
                  </button>
                  {showQR && (
                    <button
                      onClick={downloadQRCode}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium text-sm"
                    >
                      Scarica QR
                    </button>
                  )}
                </div>
              </div>

              {showQR && (
                <div className="flex justify-center p-6 bg-slate-50 rounded-lg">
                  <canvas ref={qrCanvasRef} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Checkouts */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Checkouts Recenti ({checkouts.length})
        </h2>

        {checkoutsQuery.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Caricamento checkouts...</p>
          </div>
        ) : checkouts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Nessun checkout registrato</p>
            <p className="text-sm text-slate-400 mt-2">
              Condividi il tuo link referral per iniziare a tracciare le conversioni
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkouts.slice(0, 10).map((checkout) => (
              <div
                key={checkout.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    {checkout.order_data?.package || 'Checkout'}
                  </div>
                  <div className="text-sm text-slate-500">
                    {formatDate(checkout.created_at)}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        checkout.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : checkout.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {checkout.status}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-semibold text-slate-900">
                    {formatCurrency(checkout.amount)}
                  </div>
                  <div className="text-xs text-slate-500">{checkout.currency}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}