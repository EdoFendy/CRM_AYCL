import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, CreditCard, Bank, Clock, Shield } from 'lucide-react';

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  contract_number: string;
  company_name: string;
  created_at: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface PaymentFormData {
  method: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
  email: string;
  acceptTerms: boolean;
}

export default function PublicPaymentPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    method: 'card',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    email: '',
    acceptTerms: false,
  });

  // Carica dati pagamento
  useEffect(() => {
    if (!token) return;

    const fetchPaymentData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/public/payments/${token}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Link di pagamento non valido');
        }
        const data = await response.json();
        setPaymentData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [token]);

  // Carica metodi di pagamento
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/payments/methods`);
        if (response.ok) {
          const data = await response.json();
          setPaymentMethods(data.data || []);
        }
      } catch (err) {
        console.error('Failed to load payment methods:', err);
      }
    };

    fetchPaymentMethods();
  }, []);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData || !token) return;

    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/public/payments/${token}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: formData.method,
          cardToken: formData.method === 'card' ? 'tok_test_' + Math.random().toString(36).substr(2, 9) : undefined,
          customerEmail: formData.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante il pagamento');
      }

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Pagamento fallito');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-600" />
          <p className="text-slate-600">Caricamento pagamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Errore</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Pagamento Completato!</h2>
          <p className="text-slate-600 mb-4">
            Il pagamento è stato processato con successo. Riceverai una ricevuta via email.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentData) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Pagamento Sicuro</h1>
              <p className="text-slate-600">Completa il pagamento per il tuo contratto</p>
            </div>
          </div>

          {/* Info Pagamento */}
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-900">Contratto</span>
              <span className="text-slate-600">{paymentData.contract_number}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-900">Cliente</span>
              <span className="text-slate-600">{paymentData.company_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">Importo</span>
              <span className="text-xl font-bold text-green-600">
                {formatAmount(paymentData.amount, paymentData.currency)}
              </span>
            </div>
          </div>

          {/* Status */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            paymentData.status === 'pending' 
              ? 'bg-yellow-100 text-yellow-800' 
              : paymentData.status === 'succeeded'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {paymentData.status === 'pending' ? (
              <>
                <Clock className="h-4 w-4" />
                In Attesa di Pagamento
              </>
            ) : paymentData.status === 'succeeded' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Pagato
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                Fallito
              </>
            )}
          </div>
        </div>

        {/* Form Pagamento */}
        <form onSubmit={handlePayment} className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Dati Pagamento</h2>

          <div className="space-y-4">
            {/* Metodo di Pagamento */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Metodo di Pagamento *
              </label>
              <div className="grid grid-cols-1 gap-3">
                {paymentMethods.map((method) => (
                  <label key={method.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="method"
                      value={method.id}
                      checked={formData.method === method.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                      className="text-blue-600"
                    />
                    <div className="flex items-center gap-2">
                      {method.type === 'card' && <CreditCard className="h-5 w-5 text-slate-600" />}
                      {method.type === 'sepa' && <Bank className="h-5 w-5 text-slate-600" />}
                      <div>
                        <div className="font-medium text-slate-900">{method.name}</div>
                        <div className="text-sm text-slate-600">{method.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Dati Carta (se selezionata) */}
            {formData.method === 'card' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Numero Carta *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cardNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Scadenza *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={formData.expiryMonth}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiryMonth: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="MM"
                        maxLength={2}
                      />
                      <input
                        type="text"
                        required
                        value={formData.expiryYear}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiryYear: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="YY"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CVV *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cvv}
                      onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value }))}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome Intestatario *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cardholderName}
                    onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Mario Rossi"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email per Ricevuta *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="mario.rossi@email.com"
              />
            </div>

            {/* Checkbox Accettazioni */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="acceptTerms"
                required
                checked={formData.acceptTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                className="mt-1"
              />
              <label htmlFor="acceptTerms" className="text-sm text-slate-700">
                Accetto i termini e condizioni di pagamento *
              </label>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={processing || !formData.acceptTerms}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Elaborazione pagamento...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Paga {formatAmount(paymentData.amount, paymentData.currency)}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Pagamento sicuro gestito da AYCL CRM
          </p>
        </div>
      </div>
    </div>
  );
}
