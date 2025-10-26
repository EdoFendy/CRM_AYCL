import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { apiClient } from '@lib/apiClient';
import { toast } from 'sonner';
import { Receipt, Download, Plus, Trash2, Loader2 } from 'lucide-react';

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
}

interface QuoteData {
  quoteNumber: string;
  date: string;
  validUntil: string;
  items: QuoteItem[];
  notes: string;
  paymentTerms: string;
}

export function QuoteGenerator() {
  const { token } = useAuth();
  const { selectedClient } = useSelectedClient();
  const [quoteData, setQuoteData] = useState<QuoteData>({
    quoteNumber: `QUOT-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, unitPrice: 0, tax: 22 }],
    notes: '',
    paymentTerms: 'Pagamento a 30 giorni dalla data del preventivo'
  });
  const [generatedQuote, setGeneratedQuote] = useState<any>(null);

  // Pre-fill payment terms
  useEffect(() => {
    if (selectedClient && !quoteData.paymentTerms) {
      setQuoteData(prev => ({
        ...prev,
        paymentTerms: 'Pagamento a 30 giorni dalla data del preventivo. Bonifico bancario.'
      }));
    }
  }, [selectedClient]);

  const addItem = () => {
    setQuoteData({
      ...quoteData,
      items: [...quoteData.items, { description: '', quantity: 1, unitPrice: 0, tax: 22 }]
    });
  };

  const removeItem = (index: number) => {
    if (quoteData.items.length === 1) {
      toast.error('Deve esserci almeno un elemento');
      return;
    }
    setQuoteData({
      ...quoteData,
      items: quoteData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...quoteData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuoteData({ ...quoteData, items: newItems });
  };

  const calculateItemTotal = (item: QuoteItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const taxAmount = subtotal * (item.tax / 100);
    return subtotal + taxAmount;
  };

  const calculateTotals = () => {
    const subtotal = quoteData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxTotal = quoteData.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (itemSubtotal * (item.tax / 100));
    }, 0);
    const total = subtotal + taxTotal;
    return { subtotal, taxTotal, total };
  };

  const totals = calculateTotals();

  const generateQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) {
        throw new Error('Seleziona un cliente');
      }

      if (quoteData.items.some(item => !item.description || item.unitPrice <= 0)) {
        throw new Error('Compila tutti i campi degli elementi');
      }

      // Prepare customer data
      const customerData: any = {
        name: selectedClient.type === 'contact' 
          ? selectedClient.data.full_name 
          : selectedClient.data.ragione_sociale,
        email: selectedClient.data.email || '',
      };

      if (selectedClient.type === 'company') {
        customerData.address = (selectedClient.data as any).address || '';
        customerData.vat = (selectedClient.data as any).vat_number || '';
        customerData.pec = (selectedClient.data as any).pec || '';
      }

      // Prepare line items
      const lineItems = quoteData.items.map((item, index) => ({
        id: `item-${index + 1}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

      const payload = {
        kind: 'quote',
        payload: {
          kind: 'quote',
          number: quoteData.quoteNumber,
          date: quoteData.date,
          customer: customerData,
          lines: lineItems,
          notes: quoteData.notes,
          taxRate: 22, // Default IVA
          showTax: true,
          dueDate: quoteData.validUntil,
          currency: 'EUR',
          customerType: selectedClient.type,
          customerId: selectedClient.data.id
        }
      };

      const response = await apiClient<any>('docs/generate', {
        token,
        method: 'POST',
        body: payload
      });

      return response;
    },
    onSuccess: (data) => {
      setGeneratedQuote(data);
      toast.success('Preventivo generato con successo!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante la generazione del preventivo');
    }
  });

  if (!selectedClient) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
        <Receipt className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Seleziona un cliente per generare un preventivo</p>
        <p className="text-sm text-slate-500 mt-2">
          Torna alla selezione cliente per iniziare
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Info */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-orange-900">
          <Receipt className="w-5 h-5" />
          <span className="font-semibold">
            Preventivo per:{' '}
            {selectedClient.type === 'contact' 
              ? selectedClient.data.full_name 
              : selectedClient.data.ragione_sociale}
          </span>
        </div>
        {selectedClient.data.email && (
          <p className="text-sm text-orange-700 mt-1">Email: {selectedClient.data.email}</p>
        )}
      </div>

      {/* Quote Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Dati Preventivo</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Numero Preventivo</label>
            <input
              type="text"
              value={quoteData.quoteNumber}
              onChange={(e) => setQuoteData({ ...quoteData, quoteNumber: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Data</label>
            <input
              type="date"
              value={quoteData.date}
              onChange={(e) => setQuoteData({ ...quoteData, date: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Valido fino al</label>
            <input
              type="date"
              value={quoteData.validUntil}
              onChange={(e) => setQuoteData({ ...quoteData, validUntil: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Quote Items */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Elementi del Preventivo</h3>
          <button
            onClick={addItem}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Aggiungi Elemento
          </button>
        </div>

        <div className="space-y-4">
          {quoteData.items.map((item, index) => (
            <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Elemento {index + 1}</span>
                {quoteData.items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Descrizione prodotto/servizio"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantità</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prezzo Unit. (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">IVA %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.tax}
                    onChange={(e) => updateItem(index, 'tax', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Totale</label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-semibold text-slate-900">
                    €{calculateItemTotal(item).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Terms */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Condizioni di Pagamento</h3>
        <textarea
          value={quoteData.paymentTerms}
          onChange={(e) => setQuoteData({ ...quoteData, paymentTerms: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="Condizioni di pagamento..."
        />
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Note Aggiuntive</h3>
        <textarea
          value={quoteData.notes}
          onChange={(e) => setQuoteData({ ...quoteData, notes: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="Note, specifiche tecniche, garanzie..."
        />
      </div>

      {/* Totals */}
      <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-xl p-6 text-white">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span>Imponibile:</span>
            <span className="text-xl font-semibold">€{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>IVA:</span>
            <span className="text-xl font-semibold">€{totals.taxTotal.toFixed(2)}</span>
          </div>
          <div className="pt-3 border-t border-orange-700 flex justify-between items-center">
            <span className="text-lg">Totale:</span>
            <span className="text-3xl font-bold">€{totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={() => generateQuoteMutation.mutate()}
        disabled={generateQuoteMutation.isPending}
        className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all font-bold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        {generateQuoteMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generazione in corso...
          </>
        ) : (
          <>
            <Receipt className="w-5 h-5" />
            Genera Preventivo
          </>
        )}
      </button>

      {/* Generated Quote Info */}
      {generatedQuote && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 animate-in fade-in duration-300">
          <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
            ✅ Preventivo Generato con Successo
          </h3>
          <div className="space-y-2 text-sm text-orange-800">
            <p><strong>ID:</strong> {generatedQuote.id}</p>
            <p><strong>Salvato nel database</strong></p>
            <div className="mt-4">
              <a
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/quotes/${generatedQuote.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Scarica PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}