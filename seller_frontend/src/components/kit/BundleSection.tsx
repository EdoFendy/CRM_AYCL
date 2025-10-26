import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';

interface WooProduct {
  id: number;
  name: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  description?: string;
  short_description?: string;
}

const bundleProductSchema = z.object({
  woo_product_id: z.number().optional(),
  product_name: z.string().min(1),
  product_sku: z.string().optional(),
  product_description: z.string().optional(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive()
});

const bundleSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  products: z.array(bundleProductSchema).min(1),
  discount_type: z.enum(['percentage', 'fixed', 'none']),
  discount_value: z.number().min(0).default(0),
  valid_until: z.string().optional(),
  includes_upsell: z.boolean(),
  upsell_name: z.string().optional(),
  upsell_description: z.string().optional(),
  upsell_price: z.number().positive().optional()
});

type BundleFormValues = z.infer<typeof bundleSchema>;

export function BundleSection() {
  const { token } = useAuth();
  const { selectedClient, hasClient } = useSelectedClient();
  const queryClient = useQueryClient();
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  // Fetch WooCommerce products
  const productsQuery = useQuery({
    queryKey: ['woocommerce', 'products'],
    queryFn: () =>
      apiClient<{ data: WooProduct[] }>('woocommerce/products', {
        token,
        searchParams: { per_page: 100 }
      }),
    select: (res) => res.data ?? [],
    enabled: Boolean(token)
  });

  const form = useForm<BundleFormValues>({
    resolver: zodResolver(bundleSchema),
    defaultValues: {
      name: '',
      products: [{ product_name: '', quantity: 1, unit_price: 0 }],
      discount_type: 'none',
      discount_value: 0,
      includes_upsell: false
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products'
  });

  const createBundleMutation = useMutation({
    mutationFn: (values: BundleFormValues) =>
      apiClient('bundles', {
        token,
        method: 'POST',
        body: {
          ...values,
          company_id: selectedClient?.type === 'company' ? selectedClient.data.id : undefined,
          contact_id: selectedClient?.type === 'contact' ? selectedClient.data.id : undefined
        }
      }),
    onSuccess: () => {
      toast.success('Bundle creato con successo!');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore creazione bundle');
    }
  });

  const generateCheckoutMutation = useMutation({
    mutationFn: async (bundleId: string) => {
      const response = await apiClient<{ checkout_url: string }>(`bundles/${bundleId}/checkout-url`, {
        token,
        method: 'POST',
        body: { base_url: 'https://allyoucanleads.com' }
      });
      return response.checkout_url;
    },
    onSuccess: (checkoutUrl) => {
      navigator.clipboard.writeText(checkoutUrl);
      toast.success('Link checkout copiato negli appunti!');
      window.open(checkoutUrl, '_blank');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore generazione checkout');
    }
  });

  const products = productsQuery.data ?? [];

  const handleSelectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      const price = parseFloat(product.regular_price || product.price || '0');
      form.setValue(`products.${index}.woo_product_id`, product.id);
      form.setValue(`products.${index}.product_name`, product.name);
      form.setValue(`products.${index}.product_sku`, product.sku || '');
      form.setValue(`products.${index}.product_description`, product.short_description || '');
      form.setValue(`products.${index}.unit_price`, price);
    }
  };

  if (!hasClient) {
    return (
      <div className="section-container">
        <div className="empty-state">
          <p className="text-lg font-semibold">⚠️ Nessun cliente selezionato</p>
          <p className="text-sm text-slate-500 mt-2">
            Seleziona un cliente prima di configurare bundle
          </p>
        </div>
      </div>
    );
  }

  const subtotal = fields.reduce((sum, _, idx) => {
    const product = form.watch(`products.${idx}`);
    return sum + ((product.unit_price || 0) * (product.quantity || 0));
  }, 0);

  const discountType = form.watch('discount_type');
  const discountValue = form.watch('discount_value') || 0;
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discountValue) / 100 
    : discountType === 'fixed'
    ? discountValue
    : 0;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">📦 Configura Bundle</h2>
          <p className="section-description">
            Crea pacchetti con più prodotti, sconto sul totale e opzione UpSell
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit((data) => createBundleMutation.mutate(data))} className="bundle-form">
        <div className="form-group">
          <label className="form-label">Nome Bundle *</label>
          <input
            {...form.register('name')}
            className="form-input"
            placeholder="Pacchetto Enterprise Premium"
          />
          {form.formState.errors.name && (
            <p className="form-error">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Descrizione</label>
          <textarea
            {...form.register('description')}
            className="form-textarea"
            rows={2}
            placeholder="Descrizione del bundle..."
          />
        </div>

        {/* Products */}
        <div className="form-section">
          <div className="flex items-center justify-between mb-3">
            <h3 className="form-section-title">Prodotti nel Bundle</h3>
            <button
              type="button"
              onClick={() => append({ name: '', quantity: 1, unit_price: 0, total: 0 })}
              className="add-item-button"
            >
              + Aggiungi Prodotto
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="cart-item">
              <div className="cart-item-fields">
                <div className="form-group flex-1">
                  <label className="form-label text-xs">Seleziona Prodotto WooCommerce</label>
                  <select
                    className="form-input-sm"
                    onChange={(e) => handleSelectProduct(index, e.target.value)}
                    defaultValue=""
                  >
                    <option value="">-- Seleziona prodotto --</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - €{product.regular_price || product.price || '0'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="cart-item-fields mt-2">
                <div className="form-group flex-1">
                  <input
                    {...form.register(`products.${index}.product_name`)}
                    className="form-input-sm"
                    placeholder="Nome prodotto"
                  />
                </div>
                <div className="form-group" style={{ width: '80px' }}>
                  <input
                    {...form.register(`products.${index}.quantity`, { valueAsNumber: true })}
                    type="number"
                    className="form-input-sm"
                    placeholder="Qtà"
                    min="1"
                  />
                </div>
                <div className="form-group" style={{ width: '120px' }}>
                  <input
                    {...form.register(`products.${index}.unit_price`, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="form-input-sm"
                    placeholder="Prezzo €"
                    min="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="remove-item-button"
                  disabled={fields.length === 1}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Discount */}
        <div className="form-section">
          <h3 className="form-section-title">Sconto Bundle</h3>
          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Tipo Sconto</label>
              <select {...form.register('discount_type')} className="form-input">
                <option value="none">Nessuno Sconto</option>
                <option value="percentage">Percentuale (%)</option>
                <option value="fixed">Fisso (€)</option>
              </select>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Valore Sconto</label>
              <input
                {...form.register('discount_value', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                disabled={form.watch('discount_type') === 'none'}
              />
            </div>
          </div>
        </div>

        {/* UpSell */}
        <div className="form-section">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              {...form.register('includes_upsell')}
              id="includes_upsell"
            />
            <label htmlFor="includes_upsell" className="form-section-title cursor-pointer">
              Includi UpSell
            </label>
          </div>

          {form.watch('includes_upsell') && (
            <div className="space-y-3">
              <div className="form-group">
                <input
                  {...form.register('upsell_name')}
                  className="form-input"
                  placeholder="Nome UpSell"
                />
              </div>
              <div className="form-group">
                <textarea
                  {...form.register('upsell_description')}
                  className="form-textarea"
                  rows={2}
                  placeholder="Descrizione UpSell"
                />
              </div>
              <div className="form-group">
                <input
                  {...form.register('upsell_price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="Prezzo UpSell €"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="cart-summary">
          <div className="summary-row">
            <span>Subtotale:</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Sconto:</span>
            <span className="text-red-600">-€{discountAmount.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Totale Bundle:</span>
            <span className="summary-value">€{total.toFixed(2)}</span>
          </div>
          <button
            type="submit"
            disabled={createBundleMutation.isPending}
            className="submit-button"
          >
            {createBundleMutation.isPending ? 'Creazione...' : 'Crea Bundle'}
          </button>
        </div>
      </form>
    </div>
  );
}

