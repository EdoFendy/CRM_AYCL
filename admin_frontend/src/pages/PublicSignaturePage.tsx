import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, FileText, Shield, Clock } from 'lucide-react';

interface SignatureRequest {
  id: string;
  token: string;
  status: string;
  expires_at: string;
  require_otp: boolean;
  contract_id: string;
  contract_status: string;
  company_id: string;
}

interface SignFormData {
  name: string;
  email: string;
  otp: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export default function PublicSignaturePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<SignatureRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [formData, setFormData] = useState<SignFormData>({
    name: '',
    email: '',
    otp: '',
    acceptTerms: false,
    acceptPrivacy: false,
  });

  // Carica dettagli richiesta firma
  useEffect(() => {
    if (!token) return;

    const fetchRequest = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/signatures/public/${token}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Richiesta non trovata');
        }
        const data = await response.json();
        setRequest(data);
        setFormData(prev => ({
          ...prev,
          name: data.signer_name || '',
          email: data.signer_email || '',
        }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [token]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !token) return;

    setSigning(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/signatures/public/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          otp: formData.otp || undefined,
          ip: 'unknown', // In produzione si ottiene dal server
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la firma');
      }

      const result = await response.json();
      setSigned(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-600" />
          <p className="text-slate-600">Caricamento documento...</p>
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

  if (signed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Documento Firmato!</h2>
          <p className="text-slate-600 mb-4">
            Il contratto è stato firmato con successo. Riceverai una copia via email.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.open('/uploads/contracts/signed.pdf', '_blank')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Scarica PDF Firmato
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Firma Digitale Sicura</h1>
              <p className="text-slate-600">Firma il documento contrattuale</p>
            </div>
          </div>

          {/* Info Documento */}
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-slate-600" />
              <span className="font-medium text-slate-900">Documento da Firmare</span>
            </div>
            <p className="text-sm text-slate-600">
              Contratto ID: {request.contract_id.substring(0, 8)}...
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500">
                Scadenza: {new Date(request.expires_at).toLocaleString('it-IT')}
              </span>
            </div>
          </div>

          {/* Status */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            request.status === 'pending' 
              ? 'bg-yellow-100 text-yellow-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {request.status === 'pending' ? (
              <>
                <Clock className="h-4 w-4" />
                In Attesa di Firma
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Firmato
              </>
            )}
          </div>
        </div>

        {/* Form Firma */}
        <form onSubmit={handleSign} className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Dati Firma</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Mario Rossi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email *
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

            {request.require_otp && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Codice OTP *
                </label>
                <input
                  type="text"
                  required
                  value={formData.otp}
                  onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="123456"
                  maxLength={6}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Inserisci il codice a 6 cifre inviato via email/SMS
                </p>
              </div>
            )}

            {/* Checkbox Accettazioni */}
            <div className="space-y-3">
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
                  Accetto i termini e condizioni del contratto *
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="acceptPrivacy"
                  required
                  checked={formData.acceptPrivacy}
                  onChange={(e) => setFormData(prev => ({ ...prev, acceptPrivacy: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="acceptPrivacy" className="text-sm text-slate-700">
                  Accetto il trattamento dei dati personali per la firma digitale *
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={signing || !formData.acceptTerms || !formData.acceptPrivacy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Firma in corso...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Firma Documento
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Firma digitale sicura gestita da AYCL CRM
          </p>
        </div>
      </div>
    </div>
  );
}
