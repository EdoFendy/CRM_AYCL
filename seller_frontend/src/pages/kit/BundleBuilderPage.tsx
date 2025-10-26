import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { BundleProductSelector } from '@components/kit/BundleProductSelector';
import { BundleDiscountConfigurator } from '@components/kit/BundleDiscountConfigurator';
import { encryptCheckoutOrder, resolveCheckoutBaseUrl } from '@utils/checkoutEncryption';
import type { Bundle, BundleFormData, BundleProduct, BundleDiscount, BundleCheckoutOrder } from '@types/bundle';

export default function BundleBuilderPage() {
  const { token, user } = useAuth();
  const { selectedClient } = useSelectedClient();
  const queryClient = useQueryClient();
  
  const [products, setProducts] = useState<BundleProduct[]>([]);
  const [discount, setDiscount] = useState<BundleDiscount>({
    cartDiscount: { type: 'percentage', value: 0 },
    productDiscounts: []
  });
  const [generatedCheckoutUrl, setGeneratedCheckoutUrl] = useState<string | null>(null);

  const form = useForm<BundleFormData>({
    defaultValues: {
      name: '',
      description: '',
      products: [],
      discount_type: 'percentage',
      discount_value: 0,
      currency: 'EUR',
      includes_upsell: false,
      company_id: selectedClient?.type === 'company' ? selectedClient.data.id : undefined
    }
  });

  // Get referral data
  const referralQuery = useQuery({
    queryKey: ['referral'],
    queryFn: () => apiClient<{ referral_code: string; checkout_url: string }>('referral/me', { token }),
    enabled: Boolean(token)
  });

  // Get existing bundles
  const bundlesQuery = useQuery({
    queryKey: ['bundles'],
    queryFn: () => apiClient<{ data: Bundle[] }>('bundles', { token }),
    select: (res) => res.data ?? [],
    enabled: Boolean(token)
  });

  const createBundleMutation = useMutation({
    mutationFn: async (data: BundleFormData) => {
      const response = await apiClient<Bundle>('bundles', {
        token,
        method: 'POST',
        body: {
          ...data,
          products: products,
          discount_type: discount.cartDiscount.type,
          discount_value: discount.cartDiscount.value,
          company_id: selectedClient?.type === 'company' ? selectedClient.data.id : undefined
        }
      });
      return response;
    },
    onSuccess: (bundle) => {
      toast.success('Bundle creato con successo!');
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      generateCheckoutLink(bundle);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella creazione del bundle');
    }
  });

  const generateCheckoutLink = async (bundle: Bundle) => {
    if (!referralQuery.data) {
      toast.error('Referral code non disponibile');
      return;
    }

    try {
      // Calculate totals
      const subtotal = products.reduce((sum, product) => sum + product.total, 0);
      const cartDiscountAmount = discount.cartDiscount.type === 'percentage' 
        ? (subtotal * discount.cartDiscount.value) / 100
        : discount.cartDiscount.value;
      
      const productDiscountAmount = discount.productDiscounts.reduce((sum, discountItem) => {
        const product = products.find(p => p.product_id === discountItem.productId);
        if (!product) return sum;
        
        const discountAmount = discountItem.discountType === 'percentage'
          ? (product.total * discountItem.discountValue) / 100
          : discountItem.discountValue;
        
        return sum + Math.min(discountAmount, product.total);
      }, 0);

      const totalDiscount = cartDiscountAmount + productDiscountAmount;
      const finalTotal = Math.max(0, subtotal - totalDiscount);

      const checkoutOrder: BundleCheckoutOrder = {
        type: 'bundle',
        bundle_id: bundle.id,
        bundle_name: bundle.name,
        products: products,
        discount_type: discount.cartDiscount.type,
        discount_value: discount.cartDiscount.value,
        subtotal,
        discount_amount: totalDiscount,
        total: finalTotal,
        currency: 'EUR',
        metadata: {
          locale: 'it-IT',
          generatedAt: new Date().toISOString(),
          seller_referral_code: referralQuery.data.referral_code
        }
      };

      // Encrypt the order via API (server-side encryption)
      const encryptedToken = await encryptCheckoutOrder(checkoutOrder as any, token || undefined);
      
      // Build checkout URL
      const baseUrl = resolveCheckoutBaseUrl();
      const checkoutUrl = `${baseUrl}/checkout?order=${encryptedToken}&ref=${referralQuery.data.referral_code}&type=bundle`;
      
      setGeneratedCheckoutUrl(checkoutUrl);
      toast.success('Link checkout generato!');
      
    } catch (error) {
      console.error('Error generating checkout link:', error);
      toast.error('Errore nella generazione del link checkout');
    }
  };

  const onSubmit = (data: BundleFormData) => {
    if (products.length === 0) {
      toast.error('Aggiungi almeno un prodotto al bundle');
      return;
    }

    createBundleMutation.mutate({
      ...data,
      products,
      discount_type: discount.cartDiscount.type,
      discount_value: discount.cartDiscount.value
    });
  };

  if (!selectedClient) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-lg font-semibold text-slate-900 mb-2">⚠️ Nessun cliente selezionato</div>
          <div className="text-sm text-slate-500">
            Seleziona un cliente per creare bundle personalizzati
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Bundle Builder</h1>
        <p className="text-slate-600">
          Crea bundle personalizzati per <strong>{selectedClient.data.name}</strong>
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Bundle Info */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Informazioni Bundle</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome Bundle *
              </label>
              <input
                {...form.register('name', { required: 'Nome bundle obbligatorio' })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Es: Pacchetto Premium Q1 2024"
              />
              {form.formState.errors.name && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Valuta
              </label>
              <select
                {...form.register('currency')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrizione
            </label>
            <textarea
              {...form.register('description')}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Descrizione del bundle..."
            />
          </div>

          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              {...form.register('includes_upsell')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-slate-700">
              Include offerte di upselling
            </label>
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Selezione Prodotti</h2>
          <BundleProductSelector
            selectedProducts={products}
            onProductsChange={setProducts}
          />
        </div>

        {/* Discount Configuration */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Configurazione Sconti</h2>
            <BundleDiscountConfigurator
              products={products}
              onDiscountChange={setDiscount}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createBundleMutation.isPending || products.length === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createBundleMutation.isPending ? 'Creazione...' : 'Crea Bundle e Genera Link'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setProducts([]);
              setDiscount({ cartDiscount: { type: 'percentage', value: 0 }, productDiscounts: [] });
              form.reset();
            }}
            className="bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Generated Checkout Link */}
      {generatedCheckoutUrl && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">✅ Bundle e Link Checkout Generati</h3>
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
                  toast.success('Link copiato negli appunti!');
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

      {/* Existing Bundles */}
      {bundlesQuery.data && bundlesQuery.data.length > 0 && (
        <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Bundle Esistenti</h3>
          <div className="space-y-3">
            {bundlesQuery.data.map((bundle) => (
              <div key={bundle.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">{bundle.name}</h4>
                    <p className="text-sm text-slate-600">
                      {bundle.products.length} prodotti • 
                      Sconto {bundle.discount_type === 'percentage' ? `${bundle.discount_value}%` : `€${bundle.discount_value}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => generateCheckoutLink(bundle)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Genera Link
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
