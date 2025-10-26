import { useState } from 'react';
import { DriveTestCalculator } from '@components/kit/DriveTestCalculator';

export default function DriveTestPage() {
  const [generatedCheckoutUrl, setGeneratedCheckoutUrl] = useState<string | null>(null);

  const handleCheckoutGenerated = (checkoutUrl: string) => {
    setGeneratedCheckoutUrl(checkoutUrl);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Drive Test</h1>
        <p className="text-slate-600">
          Configura e genera link checkout per Drive Test personalizzati
        </p>
      </div>

      <DriveTestCalculator onCheckoutGenerated={handleCheckoutGenerated} />

      {generatedCheckoutUrl && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">✅ Link Checkout Generato</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-700 mb-2">
                Link da condividere con il cliente:
              </label>
              <div className="bg-white rounded border p-3 text-sm font-mono text-slate-600 break-all">
                {generatedCheckoutUrl}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedCheckoutUrl);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Copia Link
              </button>
              
              <button
                type="button"
                onClick={() => window.open(generatedCheckoutUrl, '_blank')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Apri in Nuova Scheda
              </button>
            </div>

            <div className="text-sm text-green-700">
              <strong>Prossimi passi:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Condividi il link con il cliente</li>
                <li>Il cliente completerà il checkout su allyoucanleads.com</li>
                <li>Riceverai una notifica quando il pagamento sarà completato</li>
                <li>Monitora lo stato nella sezione "Checkouts"</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

