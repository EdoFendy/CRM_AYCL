import { useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { ClientSelector } from '@components/kit/ClientSelector';
import { PropSellUpSellSection } from '@components/kit/PropSellUpSellSection';
import { DiscountCodesSection } from '@components/kit/DiscountCodesSection';
import { BundleSection } from '@components/kit/BundleSection';
import '@styles/seller-kit.css';

type WooProduct = {
  id: number;
  name: string;
  price: string;
  regular_price?: string;
  sku?: string;
};

type CheckoutRecord = {
  id: string;
  session: string;
  status: string;
  referral_code?: string | null;
  referral_link?: string | null;
  created_at: string;
  updated_at: string;
};

type ReferralResponse = {
  id: string;
  code: string;
  link: string;
};

type DocFile = {
  id: string;
  name: string;
  file_url: string;
  category: string;
};

type QuoteResponse = {
  success: boolean;
  id: string;
  file_url: string;
  message?: string;
};

const cartItemSchema = z.object({
  productId: z.number().optional(),
  name: z.string().min(1, 'Inserisci il nome del prodotto'),
  price: z
    .number({ invalid_type_error: 'Prezzo non valido' })
    .positive('Prezzo deve essere positivo'),
  quantity: z
    .number({ invalid_type_error: 'Quantità non valida' })
    .int('Deve essere un numero intero')
    .min(1)
    .max(99)
});

const cartSchema = z.object({
  customerName: z.string().min(2, 'Inserisci il nome cliente'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  items: z.array(cartItemSchema).min(1, 'Aggiungi almeno un elemento')
});

type CartFormValues = z.infer<typeof cartSchema>;

const driveSchema = z.object({
  companyName: z.string().min(2, 'Inserisci il nome azienda'),
  contactEmail: z.string().email('Email non valida'),
  sectors: z.string().optional(),
  price: z
    .number({ invalid_type_error: 'Prezzo non valido' })
    .positive('Prezzo deve essere positivo'),
  validityDays: z
    .number({ invalid_type_error: 'Validità non valida' })
    .int('Deve essere un numero intero')
    .min(1)
    .max(30),
  notes: z.string().optional()
});

type DriveFormValues = z.infer<typeof driveSchema>;

const productSchema = z.object({
  name: z.string().min(2, 'Nome prodotto obbligatorio'),
  price: z
    .number({ invalid_type_error: 'Prezzo non valido' })
    .positive('Prezzo deve essere positivo'),
  currency: z
    .string()
    .min(3, 'Inserisci la valuta (es. EUR)')
    .max(3, 'Inserisci la valuta (es. EUR)')
    .transform((value) => value.toUpperCase()),
  sku: z.string().optional(),
  description: z.string().optional()
});

type ProductFormValues = z.infer<typeof productSchema>;

type Section = 'client' | 'referral' | 'cart' | 'drive' | 'propsell-upsell' | 'products' | 'discount-codes' | 'bundles' | 'resources' | 'checkouts';

export default function SellerKitPage() {
  const { token, user } = useAuth();
  const { hasClient } = useSelectedClient();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>('client');

  const referralQuery = useQuery({
    queryKey: ['referral'],
    queryFn: () => apiClient<ReferralResponse>('referral/me', { token }),
    enabled: Boolean(token)
  });

  const productsQuery = useQuery({
    queryKey: ['woocommerce', 'products'],
    queryFn: () =>
      apiClient<{ data: WooProduct[] }>('woocommerce/products', {
        token,
        searchParams: { per_page: 50 }
      }),
    select: (res) => res.data ?? [],
    enabled: Boolean(token)
  });

  const docFilesQuery = useQuery({
    queryKey: ['doc-files', 'drive-test'],
    queryFn: () =>
      apiClient<{ data: DocFile[] }>('doc-files', {
        token,
        searchParams: { pack: 'Drive Test' }
      }),
    select: (res) => res.data ?? [],
    enabled: Boolean(token)
  });

  const checkoutsQuery = useQuery({
    queryKey: ['checkouts'],
    queryFn: () => apiClient<{ data: CheckoutRecord[] }>('checkouts', { token }),
    select: (res) => res.data ?? [],
    enabled: Boolean(token)
  });

  const products = productsQuery.data ?? [];

  const sections = [
    { id: 'client' as Section, label: 'Cliente', icon: '👤' },
    { id: 'referral' as Section, label: 'Referral Link', icon: '🔗' },
    { id: 'cart' as Section, label: 'Crea Carrello', icon: '🛒' },
    { id: 'drive' as Section, label: 'Drive Test', icon: '🚗' },
    { id: 'propsell-upsell' as Section, label: 'PropSell/UpSell', icon: '📈' },
    { id: 'products' as Section, label: 'Prodotti', icon: '📦' },
    { id: 'discount-codes' as Section, label: 'Codici Sconto', icon: '🎟️' },
    { id: 'bundles' as Section, label: 'Bundle', icon: '📦' },
    { id: 'resources' as Section, label: 'Risorse', icon: '📚' },
    { id: 'checkouts' as Section, label: 'Checkouts', icon: '💳' },
  ];

  return (
    <div className="starter-kit-container">
      {/* Header */}
      <div className="starter-kit-header">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Starter Kit</h1>
          <p className="text-sm text-slate-600">Strumenti per la vendita e gestione clienti</p>
        </div>
        {user?.referralCode && (
          <div className="rounded-lg bg-blue-50 px-4 py-2 border border-blue-200">
            <p className="text-xs font-medium text-blue-600">Il tuo codice</p>
            <p className="text-lg font-bold text-blue-900">{user.referralCode}</p>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <nav className="starter-kit-nav">
        <div className="nav-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`nav-tab ${activeSection === section.id ? 'active' : ''}`}
            >
              <span className="nav-tab-icon">{section.icon}</span>
              <span className="nav-tab-label">{section.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content Area */}
      <div className="starter-kit-content">
        {activeSection === 'client' && (
          <ClientSelector />
        )}
        
        {activeSection === 'referral' && (
          <ReferralSection referralQuery={referralQuery} />
        )}
        
        {activeSection === 'cart' && (
          <CartBuilderSection products={products} token={token} queryClient={queryClient} hasClient={hasClient} />
        )}
        
        {activeSection === 'drive' && (
          <DriveTestSection token={token} queryClient={queryClient} hasClient={hasClient} />
        )}
        
        {activeSection === 'propsell-upsell' && (
          <PropSellUpSellSection />
        )}
        
        {activeSection === 'products' && (
          <ProductsSection products={products} productsQuery={productsQuery} token={token} queryClient={queryClient} />
        )}
        
        {activeSection === 'discount-codes' && (
          <DiscountCodesSection />
        )}
        
        {activeSection === 'bundles' && (
          <BundleSection />
        )}
        
        {activeSection === 'resources' && (
          <ResourcesSection docFilesQuery={docFilesQuery} />
        )}
        
        {activeSection === 'checkouts' && (
          <CheckoutsSection checkoutsQuery={checkoutsQuery} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// REFERRAL SECTION
// ============================================================================

function ReferralSection({ referralQuery }: { referralQuery: any }) {
  const { data: referral, isLoading, error, refetch } = referralQuery;
  const { token } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const createReferralLink = async () => {
    setIsCreating(true);
    try {
      const response = await apiClient('referral/create', {
        token,
        method: 'POST',
        body: {
          base_url: 'https://allyoucanleads.com'
        }
      });
      
      toast.success('Link referral creato con successo!');
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Errore nella creazione del link');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiato negli appunti!');
    } catch (error) {
      toast.error('Errore nella copia');
    }
  };

  return (
    <div className="section-container">
      <div className="section-header">
      <div>
          <h2 className="section-title">🔗 Il tuo Referral Link</h2>
          <p className="section-description">
            Condividi questo link con i clienti: ogni checkout e carrello generato manterrà automaticamente il tuo referral ID.
          </p>
      </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Caricamento referral...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>❌ Errore nel caricamento del referral</p>
        </div>
      ) : referral ? (
        <div className="referral-content">
          <div className="referral-card">
            <div className="referral-info">
              <label className="referral-label">Codice Referral</label>
              <div className="referral-value-group">
                <code className="referral-code">{referral.referral_code}</code>
                <button
                  onClick={() => copyToClipboard(referral.referral_code)}
                  className="copy-button"
                  title="Copia codice"
                >
                  📋
      </button>
              </div>
            </div>

            <div className="referral-info">
              <label className="referral-label">Link Completo</label>
              <div className="referral-value-group">
                <input
                  type="text"
                  value={referral.checkout_url}
                  readOnly
                  className="referral-link-input"
                />
                <button
                  onClick={() => copyToClipboard(referral.checkout_url)}
                  className="copy-button-primary"
                >
                  Copia Link
                </button>
              </div>
            </div>
          </div>

          <div className="info-box">
            <h4 className="info-box-title">💡 Come funziona</h4>
            <ul className="info-list">
              <li>Condividi il link con i tuoi clienti</li>
              <li>Ogni carrello o checkout creato tramite il tuo link sarà automaticamente tracciato</li>
              <li>Monitora le conversioni nella sezione "Checkouts"</li>
              <li>Ricevi le commissioni sui prodotti venduti</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>Nessun link referral attivo</p>
          <p className="text-sm text-slate-500 mt-2 mb-4">
            Crea il tuo link referral per iniziare a ricevere richieste di checkout
          </p>
          <button
            onClick={createReferralLink}
            disabled={isCreating}
            className="submit-button"
          >
            {isCreating ? 'Creazione...' : 'Crea Link Referral'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CART BUILDER SECTION
// ============================================================================

function CartBuilderSection({ products, token, queryClient, hasClient }: any) {
  const { selectedClient } = useSelectedClient();
  const form = useForm<CartFormValues>({
    resolver: zodResolver(cartSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      notes: '',
      items: [{ name: '', price: 0, quantity: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const createCartMutation = useMutation({
    mutationFn: async (values: CartFormValues) => {
      // 1. Create quote/cart
      const quoteResponse = await apiClient<QuoteResponse>('quotes', {
        token,
        method: 'POST',
        body: {
          customer_name: values.customerName,
          customer_email: values.customerEmail || null,
          notes: values.notes || null,
          quote_type: 'cart',
          company_id: selectedClient?.type === 'company' ? selectedClient.data.id : undefined,
          items: values.items.map((item) => ({
            product_id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        }
      });

      // 2. Create 4 associated contracts
      const contractPacks = ['Setup-Fee', 'Performance', 'Performance', 'Performance'];
      const contractPromises = contractPacks.map((pack, index) =>
        apiClient('contracts', {
        token,
          method: 'POST',
        body: {
            company_id: selectedClient?.type === 'company' ? selectedClient.data.id : undefined,
            pack,
            quote_id: quoteResponse.id,
            cart_reference: `CART-${quoteResponse.id}`,
            requires_payment: true,
            payment_amount: index === 0 ? 3000 : 5000,
            payment_currency: 'EUR',
            notes: `Contratto ${index + 1}/4 generato da carrello`
          }
        })
      );

      await Promise.all(contractPromises);

      return { ...quoteResponse, contractsCreated: 4 };
    },
    onSuccess: (data) => {
      toast.success(`Carrello creato con ${data.contractsCreated} contratti associati!`);
      if (data.file_url) {
        window.open(data.file_url, '_blank');
      }
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella creazione del carrello');
    }
  });

  const onSubmit = (values: CartFormValues) => {
    createCartMutation.mutate(values);
  };

  const addProductToCart = (product: WooProduct) => {
    append({
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price) || 0,
      quantity: 1
    });
    toast.success(`${product.name} aggiunto al carrello`);
  };

  const totalValue = useMemo(() => {
    return fields.reduce((sum, field, index) => {
      const item = form.watch(`items.${index}`);
      return sum + (item.price || 0) * (item.quantity || 0);
    }, 0);
  }, [fields, form.watch('items')]);

  if (!hasClient) {
  return (
      <div className="section-container">
        <div className="empty-state">
          <p className="text-lg font-semibold">⚠️ Nessun cliente selezionato</p>
          <p className="text-sm text-slate-500 mt-2">
            Seleziona un cliente nella sezione "Cliente" prima di creare carrelli
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">🛒 Crea Carrello Personalizzato</h2>
          <p className="section-description">
            Crea un carrello personalizzato per il cliente con prodotti dal catalogo o custom
          </p>
        </div>
        </div>

      <div className="cart-builder-layout">
        {/* Products Catalog */}
        <div className="products-catalog">
          <h3 className="catalog-title">Catalogo Prodotti</h3>
          {products.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun prodotto disponibile</p>
          ) : (
            <div className="products-grid">
              {products.map((product: WooProduct) => (
                <div key={product.id} className="product-card">
                  <div className="product-info">
                    <h4 className="product-name">{product.name}</h4>
                    {product.sku && <p className="product-sku">SKU: {product.sku}</p>}
                    <p className="product-price">€{parseFloat(product.price).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => addProductToCart(product)}
                    className="add-to-cart-button"
                    type="button"
                  >
                    + Aggiungi
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Form */}
        <div className="cart-form-container">
          <form onSubmit={form.handleSubmit(onSubmit)} className="cart-form">
            <div className="form-section">
              <h3 className="form-section-title">Informazioni Cliente</h3>
              
              <div className="form-group">
                <label className="form-label">Nome Cliente *</label>
          <input
                  {...form.register('customerName')}
                  className="form-input"
                  placeholder="Mario Rossi"
                />
                {form.formState.errors.customerName && (
                  <p className="form-error">{form.formState.errors.customerName.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email Cliente</label>
                <input
            {...form.register('customerEmail')}
                  type="email"
                  className="form-input"
                  placeholder="mario.rossi@example.com"
                />
                {form.formState.errors.customerEmail && (
                  <p className="form-error">{form.formState.errors.customerEmail.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Note</label>
                <textarea
                  {...form.register('notes')}
                  className="form-textarea"
                  rows={3}
                  placeholder="Note aggiuntive..."
                />
        </div>
      </div>

            <div className="form-section">
              <div className="flex items-center justify-between mb-3">
                <h3 className="form-section-title">Prodotti nel Carrello</h3>
                <button
                  type="button"
                  onClick={() => append({ name: '', price: 0, quantity: 1 })}
                  className="add-item-button"
                >
                  + Aggiungi Prodotto
                </button>
              </div>

              {fields.length === 0 ? (
                <p className="text-sm text-slate-500">Nessun prodotto nel carrello</p>
              ) : (
      <div className="cart-items">
        {fields.map((field, index) => (
                    <div key={field.id} className="cart-item">
                      <div className="cart-item-fields">
                        <div className="form-group flex-1">
                          <label className="form-label-sm">Nome Prodotto</label>
                          <input
                            {...form.register(`items.${index}.name`)}
                            className="form-input-sm"
                            placeholder="Nome prodotto"
                          />
            </div>

                        <div className="form-group" style={{ width: '120px' }}>
                          <label className="form-label-sm">Prezzo (€)</label>
                <input
                            {...form.register(`items.${index}.price`, { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                            className="form-input-sm"
                            placeholder="0.00"
                />
              </div>

                        <div className="form-group" style={{ width: '80px' }}>
                          <label className="form-label-sm">Qtà</label>
                <input
                  {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                            type="number"
                            className="form-input-sm"
                            placeholder="1"
                />
            </div>

              <button
                type="button"
                onClick={() => remove(index)}
                          className="remove-item-button"
                          title="Rimuovi"
              >
                          🗑️
              </button>
            </div>
                      {form.formState.errors.items?.[index] && (
                        <p className="form-error text-xs mt-1">
                          {form.formState.errors.items[index]?.name?.message ||
                            form.formState.errors.items[index]?.price?.message ||
                            form.formState.errors.items[index]?.quantity?.message}
                        </p>
                      )}
          </div>
        ))}
      </div>
              )}

              {form.formState.errors.items && (
                <p className="form-error">{form.formState.errors.items.message}</p>
              )}
      </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span className="summary-label">Totale Carrello:</span>
                <span className="summary-value">€{totalValue.toFixed(2)}</span>
              </div>
              <button
                type="submit"
                disabled={createCartMutation.isPending}
                className="submit-button"
              >
                {createCartMutation.isPending ? 'Creazione in corso...' : 'Genera Carrello PDF'}
      </button>
            </div>
    </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DRIVE TEST SECTION
// ============================================================================

function DriveTestSection({ token, queryClient, hasClient }: any) {
  const { selectedClient } = useSelectedClient();
  const form = useForm<DriveFormValues>({
    resolver: zodResolver(driveSchema),
    defaultValues: {
      companyName: '',
      contactEmail: '',
      sectors: '',
      price: 0,
      validityDays: 7,
      notes: ''
    }
  });

  const createDriveMutation = useMutation({
    mutationFn: async (values: DriveFormValues) => {
      // Calculate expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const response = await apiClient<QuoteResponse>('quotes/drive-test', {
        token,
        method: 'POST',
        body: {
          company_name: values.companyName,
          contact_email: values.contactEmail,
          sectors: values.sectors || null,
          price: Number(values.price),
          validity_days: Number(values.validityDays),
          notes: values.notes || null,
          quote_type: 'drive_test',
          expires_at: expiresAt.toISOString(),
          company_id: selectedClient?.type === 'company' ? selectedClient.data.id : undefined
        }
      });
      return response;
    },
    onSuccess: (data) => {
      toast.success('Drive Test creato! Scade in 7 giorni.');
      if (data.file_url) {
        window.open(data.file_url, '_blank');
      }
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella creazione del Drive Test');
    }
  });

  const onSubmit = (values: DriveFormValues) => {
    createDriveMutation.mutate(values);
  };

  if (!hasClient) {
  return (
      <div className="section-container">
        <div className="empty-state">
          <p className="text-lg font-semibold">⚠️ Nessun cliente selezionato</p>
          <p className="text-sm text-slate-500 mt-2">
            Seleziona un cliente nella sezione "Cliente" prima di creare Drive Test
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">🚗 Crea Drive Test</h2>
          <p className="section-description">
            Genera un preventivo Drive Test personalizzato per il cliente (scade in 7 giorni)
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="drive-form">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nome Azienda *</label>
            <input
              {...form.register('companyName')}
              className="form-input"
              placeholder="Acme Corp"
            />
            {form.formState.errors.companyName && (
              <p className="form-error">{form.formState.errors.companyName.message}</p>
            )}
        </div>

          <div className="form-group">
            <label className="form-label">Email Contatto *</label>
          <input
              {...form.register('contactEmail')}
              type="email"
              className="form-input"
              placeholder="contatto@acme.com"
            />
            {form.formState.errors.contactEmail && (
              <p className="form-error">{form.formState.errors.contactEmail.message}</p>
            )}
        </div>

          <div className="form-group">
            <label className="form-label">Settori</label>
          <input
              {...form.register('sectors')}
              className="form-input"
              placeholder="Es: Automotive, Retail"
            />
      </div>

          <div className="form-group">
            <label className="form-label">Prezzo (€) *</label>
            <input
              {...form.register('price', { valueAsNumber: true })}
            type="number"
              step="0.01"
              className="form-input"
              placeholder="0.00"
            />
            {form.formState.errors.price && (
              <p className="form-error">{form.formState.errors.price.message}</p>
            )}
      </div>

          <div className="form-group">
            <label className="form-label">Validità (giorni) *</label>
            <input
              {...form.register('validityDays', { valueAsNumber: true })}
              type="number"
              className="form-input"
              placeholder="7"
            />
            {form.formState.errors.validityDays && (
              <p className="form-error">{form.formState.errors.validityDays.message}</p>
            )}
      </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Note</label>
            <textarea
              {...form.register('notes')}
              className="form-textarea"
              rows={4}
              placeholder="Note aggiuntive per il cliente..."
            />
          </div>
      </div>

        <button
          type="submit"
          disabled={createDriveMutation.isPending}
          className="submit-button"
        >
          {createDriveMutation.isPending ? 'Creazione in corso...' : 'Genera Drive Test PDF'}
      </button>
    </form>
    </div>
  );
}

// ============================================================================
// PRODUCTS SECTION
// ============================================================================

function ProductsSection({ products, productsQuery, token, queryClient }: any) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      currency: 'EUR',
      sku: '',
      description: ''
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const response = await apiClient('woocommerce/products', {
        token,
        method: 'POST',
        body: {
          name: values.name,
          regular_price: values.price.toString(),
          price: values.price.toString(),
          sku: values.sku || undefined,
          description: values.description || undefined
        }
      });
      return response;
    },
    onSuccess: () => {
      toast.success('Prodotto creato con successo!');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['woocommerce', 'products'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella creazione del prodotto');
    }
  });

  const onSubmit = (values: ProductFormValues) => {
    createProductMutation.mutate(values);
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">📦 Gestione Prodotti</h2>
          <p className="section-description">
            Crea nuovi prodotti o visualizza il catalogo esistente
          </p>
        </div>
      </div>

      <div className="products-section-layout">
        {/* Create Product Form */}
        <div className="create-product-card">
          <h3 className="card-title">Crea Nuovo Prodotto</h3>
          <form onSubmit={form.handleSubmit(onSubmit)} className="product-form">
            <div className="form-group">
              <label className="form-label">Nome Prodotto *</label>
          <input
                {...form.register('name')}
                className="form-input"
                placeholder="Nome del prodotto"
              />
              {form.formState.errors.name && (
                <p className="form-error">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">Prezzo *</label>
                <input
                  {...form.register('price', { valueAsNumber: true })}
            type="number"
            step="0.01"
                  className="form-input"
                  placeholder="0.00"
          />
                {form.formState.errors.price && (
                  <p className="form-error">{form.formState.errors.price.message}</p>
                )}
      </div>

              <div className="form-group" style={{ width: '100px' }}>
                <label className="form-label">Valuta *</label>
          <input
            {...form.register('currency')}
                  className="form-input"
                  placeholder="EUR"
                  maxLength={3}
          />
                {form.formState.errors.currency && (
                  <p className="form-error">{form.formState.errors.currency.message}</p>
                )}
        </div>
        </div>

            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                {...form.register('sku')}
                className="form-input"
                placeholder="PROD-001"
              />
      </div>

            <div className="form-group">
              <label className="form-label">Descrizione</label>
              <textarea
                {...form.register('description')}
                className="form-textarea"
                rows={3}
                placeholder="Descrizione del prodotto..."
              />
      </div>

            <button
              type="submit"
              disabled={createProductMutation.isPending}
              className="submit-button"
            >
              {createProductMutation.isPending ? 'Creazione...' : 'Crea Prodotto'}
      </button>
    </form>
        </div>

        {/* Products List */}
        <div className="products-list-card">
          <h3 className="card-title">Catalogo Prodotti ({products.length})</h3>
          {productsQuery.isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Caricamento prodotti...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <p>Nessun prodotto disponibile</p>
            </div>
          ) : (
            <div className="products-table">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>SKU</th>
                    <th>Prezzo</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: WooProduct) => (
                    <tr key={product.id}>
                      <td className="font-medium">{product.name}</td>
                      <td className="text-slate-600">{product.sku || '—'}</td>
                      <td className="font-semibold text-blue-600">
                        €{parseFloat(product.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RESOURCES SECTION
// ============================================================================

function ResourcesSection({ docFilesQuery }: any) {
  const docFiles = docFilesQuery.data ?? [];

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">📚 Risorse e Documenti</h2>
          <p className="section-description">
            Accedi ai documenti e risorse per il Drive Test
          </p>
        </div>
      </div>

      {docFilesQuery.isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Caricamento risorse...</p>
        </div>
      ) : docFiles.length === 0 ? (
        <div className="empty-state">
          <p>Nessuna risorsa disponibile</p>
        </div>
      ) : (
        <div className="resources-grid">
          {docFiles.map((file: DocFile) => (
            <a
              key={file.id}
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="resource-card"
            >
              <div className="resource-icon">📄</div>
              <div className="resource-info">
                <h4 className="resource-name">{file.name}</h4>
                <p className="resource-category">{file.category}</p>
              </div>
              <div className="resource-action">
                <span className="text-blue-600 text-sm font-medium">Apri →</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CHECKOUTS SECTION
// ============================================================================

function CheckoutsSection({ checkoutsQuery }: any) {
  const checkouts = checkoutsQuery.data ?? [];

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">💳 Storico Checkouts</h2>
          <p className="section-description">
            Visualizza tutti i checkout generati con il tuo referral
          </p>
        </div>
      </div>

      {checkoutsQuery.isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Caricamento checkouts...</p>
        </div>
      ) : checkouts.length === 0 ? (
        <div className="empty-state">
          <p>Nessun checkout disponibile</p>
          <p className="text-sm text-slate-500 mt-2">
            I checkout generati tramite il tuo referral link appariranno qui
          </p>
        </div>
      ) : (
        <div className="checkouts-table-container">
          <table className="checkouts-table">
        <thead>
          <tr>
                <th>Session ID</th>
                <th>Status</th>
                <th>Referral Code</th>
                <th>Data Creazione</th>
                <th>Ultimo Aggiornamento</th>
          </tr>
        </thead>
        <tbody>
              {checkouts.map((checkout: CheckoutRecord) => (
            <tr key={checkout.id}>
                  <td className="font-mono text-sm">{checkout.session.substring(0, 20)}...</td>
              <td>
                <span className={`status-badge status-${checkout.status}`}>
                      {checkout.status}
                </span>
              </td>
                  <td className="font-medium text-blue-600">
                    {checkout.referral_code || '—'}
              </td>
                  <td className="text-slate-600">
                    {new Date(checkout.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td className="text-slate-600">
                    {new Date(checkout.updated_at).toLocaleDateString('it-IT')}
                  </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      )}
    </div>
  );
}
