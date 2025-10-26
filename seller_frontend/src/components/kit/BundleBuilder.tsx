import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { apiClient } from '@lib/apiClient';
import { toast } from 'sonner';
import { encryptCheckoutOrder, resolveCheckoutBaseUrl } from '@utils/checkoutEncryption';
import { Package, Plus, Minus, Trash2, Percent, DollarSign, Link as LinkIcon, Copy } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: string;
  description?: string;
  sku?: string;
}

interface BundleItem {
  product: Product;
  quantity: number;
  discount: {
    type: 'percentage' | 'fixed';
    value: number;
  };
}

export function BundleBuilder() {
  const { token } = useAuth();
  const { selectedClient } = useSelectedClient();
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [globalDiscount, setGlobalDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number }>({
    type: 'percentage',
    value: 0
  });
  const [generatedCheckoutUrl, setGeneratedCheckoutUrl] = useState<string>('');

  // Fetch products
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient<{ data: Product[] }>('woocommerce/products', { 
      token,
      searchParams: { per_page: 100 }
    }),
    select: (res) => res.data ?? [],
    enabled: Boolean(token)
  });

  // Get referral data
  const referralQuery = useQuery({
    queryKey: ['referral'],
    queryFn: () => apiClient<{ referral_code: string; checkout_url: string }>('referral/me', { token }),
    enabled: Boolean(token)
  });

  const products = productsQuery.data ?? [];

  const addProduct = () => {
    if (!selectedProductId) {
      toast.error('Seleziona un prodotto');
      return;
    }

    const product = products.find(p => p.id.toString() === selectedProductId);
    if (!product) return;

    // Check if already in bundle
    if (bundleItems.some(item => item.product.id === product.id)) {
      toast.error('Prodotto già nel bundle');
      return;
    }

    setBundleItems([
      ...bundleItems,
      {
        product,
        quantity: 1,
        discount: { type: 'percentage', value: 0 }
      }
    ]);
    setSelectedProductId('');
    toast.success(`${product.name} aggiunto al bundle`);
  };

  const removeProduct = (productId: number) => {
    setBundleItems(bundleItems.filter(item => item.product.id !== productId));
    toast.success('Prodotto rimosso dal bundle');
  };

  const updateQuantity = (productId: number, delta: number) => {
    setBundleItems(bundleItems.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateItemDiscount = (productId: number, type: 'percentage' | 'fixed', value: number) => {
    setBundleItems(bundleItems.map(item => {
      if (item.product.id === productId) {
        return { ...item, discount: { type, value: Math.max(0, value) } };
      }
      return item;
    }));
  };

  const calculateItemPrice = (item: BundleItem): number => {
    const basePrice = parseFloat(item.product.price) * item.quantity;
    if (item.discount.type === 'percentage') {
      return basePrice * (1 - item.discount.value / 100);
    } else {
      return Math.max(0, basePrice - item.discount.value);
    }
  };

  const totals = useMemo(() => {
    const subtotal = bundleItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
    let total = subtotal;
    
    if (globalDiscount.value > 0) {
      if (globalDiscount.type === 'percentage') {
        total = subtotal * (1 - globalDiscount.value / 100);
      } else {
        total = Math.max(0, subtotal - globalDiscount.value);
      }
    }

    const savings = subtotal - total;
    
    return { subtotal, total, savings };
  }, [bundleItems, globalDiscount]);

  const generateCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (bundleItems.length === 0) {
        throw new Error('Aggiungi almeno un prodotto al bundle');
      }

      if (!referralQuery.data?.referral_code) {
        throw new Error('Codice referral non disponibile');
      }

      if (!selectedClient) {
        throw new Error('Seleziona un cliente');
      }

      // Create checkout order
      const checkoutOrder = {
        type: 'bundle' as const,
        items: bundleItems.map(item => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: parseFloat(item.product.price),
          discount: item.discount
        })),
        global_discount: globalDiscount,
        total: totals.total,
        client: selectedClient,
        metadata: {
          bundle_name: `Bundle personalizzato - ${new Date().toLocaleDateString()}`,
          created_by: 'seller'
        }
      };

      // Encrypt the order via API (server-side encryption)
      const encryptedToken = await encryptCheckoutOrder(checkoutOrder as any, token || undefined);
      
      // Build checkout URL
      const baseUrl = resolveCheckoutBaseUrl();
      const checkoutUrl = `${baseUrl}/checkout?order=${encryptedToken}&ref=${referralQuery.data.referral_code}&type=bundle`;
      
      return checkoutUrl;
    },
    onSuccess: (checkoutUrl) => {
      setGeneratedCheckoutUrl(checkoutUrl);
      toast.success('Link checkout generato!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante la generazione del link');
    }
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCheckoutUrl);
    toast.success('Link copiato negli appunti!');
  };

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Aggiungi Prodotti
        </h3>
        <div className="flex gap-3">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={productsQuery.isLoading}
          >
            <option value="">Seleziona un prodotto...</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - €{parseFloat(product.price).toFixed(2)}
              </option>
            ))}
          </select>
          <button
            onClick={addProduct}
            disabled={!selectedProductId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Aggiungi
          </button>
        </div>
      </div>

      {/* Bundle Items */}
      {bundleItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Prodotti nel Bundle ({bundleItems.length})
          </h3>
          
          {bundleItems.map((item) => (
            <div key={item.product.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{item.product.name}</h4>
                  <p className="text-sm text-slate-600">
                    Prezzo unitario: €{parseFloat(item.product.price).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => removeProduct(item.product.id)}
                  className="text-red-600 hover:text-red-800 p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quantità</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-8 h-8 bg-slate-200 rounded-lg hover:bg-slate-300 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-8 h-8 bg-slate-200 rounded-lg hover:bg-slate-300 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Discount Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo Sconto</label>
                  <select
                    value={item.discount.type}
                    onChange={(e) => updateItemDiscount(item.product.id, e.target.value as 'percentage' | 'fixed', item.discount.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentuale</option>
                    <option value="fixed">Fisso</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Valore Sconto</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={item.discount.value}
                      onChange={(e) => updateItemDiscount(item.product.id, item.discount.type, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {item.discount.type === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-sm text-slate-600">Subtotale prodotto:</span>
                <span className="font-bold text-lg text-slate-900">
                  €{calculateItemPrice(item).toFixed(2)}
                </span>
              </div>
            </div>
          ))}

          {/* Global Discount */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-600" />
              Sconto Globale (opzionale)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo Sconto</label>
                <select
                  value={globalDiscount.type}
                  onChange={(e) => setGlobalDiscount({ ...globalDiscount, type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="percentage">Percentuale</option>
                  <option value="fixed">Fisso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Valore Sconto</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={globalDiscount.value}
                    onChange={(e) => setGlobalDiscount({ ...globalDiscount, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    {globalDiscount.type === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Subtotale:</span>
                <span className="text-xl font-semibold">€{totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.savings > 0 && (
                <div className="flex justify-between items-center text-green-400">
                  <span>Risparmio:</span>
                  <span className="text-xl font-semibold">-€{totals.savings.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="text-lg">Totale:</span>
                <span className="text-3xl font-bold">€{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Generate Checkout Button */}
          <button
            onClick={() => generateCheckoutMutation.mutate()}
            disabled={generateCheckoutMutation.isPending || bundleItems.length === 0}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all font-bold text-lg shadow-lg hover:shadow-xl"
          >
            {generateCheckoutMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generazione in corso...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Genera Link Checkout
              </span>
            )}
          </button>

          {/* Generated Checkout URL */}
          {generatedCheckoutUrl && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                ✅ Link Checkout Generato
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedCheckoutUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-white border border-green-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copia
                </button>
              </div>
              <p className="text-sm text-green-700 mt-3">
                Invia questo link al cliente per completare l'acquisto del bundle.
              </p>
            </div>
          )}
        </div>
      )}

      {bundleItems.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
          <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Nessun prodotto nel bundle</p>
          <p className="text-sm text-slate-500 mt-2">Aggiungi prodotti per iniziare a costruire il tuo bundle</p>
        </div>
      )}
    </div>
  );
}

