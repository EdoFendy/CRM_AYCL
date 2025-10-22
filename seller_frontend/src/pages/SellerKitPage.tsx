import { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import '@/styles/seller-kit.css';

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
    .number()
    .refine((value) => !Number.isNaN(value), 'Prezzo non valido')
    .min(0.01, 'Prezzo non valido'),
  quantity: z
    .number()
    .refine((value) => Number.isInteger(value) && !Number.isNaN(value), 'Quantità non valida')
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
    .number()
    .refine((value) => !Number.isNaN(value), 'Prezzo non valido')
    .min(0.01, 'Prezzo non valido'),
  validityDays: z
    .number()
    .refine((value) => Number.isInteger(value) && !Number.isNaN(value), 'Validità non valida')
    .min(1)
    .max(30),
  notes: z.string().optional()
});

type DriveFormValues = z.infer<typeof driveSchema>;

const productSchema = z.object({
  name: z.string().min(2, 'Nome prodotto obbligatorio'),
  price: z
    .number()
    .refine((value) => !Number.isNaN(value), 'Prezzo non valido')
    .min(0.01, 'Prezzo non valido'),
  currency: z
    .string()
    .min(3, 'Inserisci la valuta (es. EUR)')
    .max(3, 'Inserisci la valuta (es. EUR)')
    .transform((value) => value.toUpperCase()),
  sku: z.string().optional(),
  description: z.string().optional()
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function SellerKitPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const referralQuery = useQuery({
    queryKey: ['referral'],
    queryFn: () => apiClient<ReferralResponse>('referrals/me', { token }),
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

  return (
    <div className="grid main-grid">
      <section className="card referral-card">
        <h2>Il tuo Referral Link</h2>
        <p>
          Condividi questo link con i clienti: ogni checkout e carrello generato manterrà automaticamente il tuo
          referral ID.
        </p>
        <ReferralDisplay
          referral={referralQuery.data ?? null}
          loading={referralQuery.isLoading}
          fallbackCode={user?.referralCode ?? null}
          fallbackLink={user?.referralLink ?? null}
        />
      </section>

      <section className="card">
        <h2>Crea Carrello Personalizzato</h2>
        <p className="helper">
          Genera un preventivo con prodotti WooCommerce e crea automaticamente il checkout associato al tuo referral.
        </p>
        <CartBuilderForm
          products={products}
          loading={productsQuery.isLoading}
          token={token}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['checkouts'] })}
        />
      </section>

      <section className="card">
        <h2>Crea Carrello Drive Test</h2>
        <p className="helper">
          Un solo drive test per cliente. Il checkout generato scadrà automaticamente in base alla durata impostata.
        </p>
        <DriveTestForm
          token={token}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['checkouts'] })}
        />
      </section>

      <section className="card">
        <h2>Nuovo Prodotto WooCommerce</h2>
        <p className="helper">
          Genera rapidamente prodotti virtuali da usare nei carrelli personalizzati o nelle upsell.
        </p>
        <ProductCreatorForm
          token={token}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['woocommerce', 'products'] })}
        />
      </section>

      <section className="card">
        <h2>Risorse Drive Test</h2>
        {docFilesQuery.isLoading ? (
          <p>Caricamento documenti...</p>
        ) : (
          <div className="doc-files">
            {(docFilesQuery.data ?? []).length === 0 ? (
              <p className="helper">Nessun documento disponibile per il pack Drive Test.</p>
            ) : (
              (docFilesQuery.data ?? []).map((file) => (
                <a key={file.id} className="doc-link" href={file.file_url} target="_blank" rel="noreferrer">
                  <span className="badge">{file.category === 'pitch' ? 'Pitch Deck' : 'Proposta'}</span>
                  {file.name}
                </a>
              ))
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Ultimi Checkout Generati</h2>
        <CheckoutTable loading={checkoutsQuery.isLoading} rows={checkoutsQuery.data ?? []} />
      </section>
    </div>
  );
}

function ReferralDisplay({
  referral,
  loading,
  fallbackCode,
  fallbackLink
}: {
  referral: ReferralResponse | null;
  loading: boolean;
  fallbackCode: string | null | undefined;
  fallbackLink: string | null | undefined;
}) {
  if (loading) {
    return <p>Recupero referral...</p>;
  }

  const code = referral?.code ?? fallbackCode ?? 'Non disponibile';
  const link = referral?.link ?? fallbackLink ?? '';

  const copy = async () => {
    if (!link) {
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.success('Referral link copiato negli appunti');
  };

  return (
    <div className="referral-display">
      <div>
        <p className="label">Codice referral</p>
        <div className="referral-code">{code}</div>
      </div>
      <div>
        <p className="label">Link diretto</p>
        <div className="referral-link">{link || '—'}</div>
      </div>
      <button className="button outline" disabled={!link} onClick={copy}>
        Copia link
      </button>
    </div>
  );
}

function CartBuilderForm({
  products,
  loading,
  token,
  onSuccess
}: {
  products: WooProduct[];
  loading: boolean;
  token: string | null;
  onSuccess: () => void;
}) {
  const form = useForm<CartFormValues, any, CartFormValues>({
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

  const createQuoteMutation = useMutation({
    mutationFn: async (values: CartFormValues) => {
      const payload = {
        kind: 'quote' as const,
        payload: {
          date: new Date().toISOString().slice(0, 10),
          customer: {
            name: values.customerName,
            email: values.customerEmail || undefined
          },
          lines: values.items.map((item, idx) => ({
            id: crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${idx}`,
            description: item.name,
            quantity: item.quantity,
            unitPrice: item.price
          })),
          notes: values.notes,
          taxRate: 0,
          showTax: false,
          currency: 'EUR'
        }
      };

      const quote = await apiClient<QuoteResponse>('docs/generate', {
        method: 'POST',
        token,
        body: payload
      });

      await apiClient<CheckoutRecord>('checkouts', {
        method: 'POST',
        token,
        body: {
          session: `quote-${quote.id}`,
          status: 'pending'
        }
      });

      return quote;
    },
    onSuccess: (quote) => {
      toast.success('Carrello generato con successo');
      onSuccess();
      form.reset({
        customerName: '',
        customerEmail: '',
        notes: '',
        items: [{ name: '', price: 0, quantity: 1 }]
      });
      if (quote.file_url) {
        window.open(quote.file_url, '_blank', 'noopener');
      }
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Impossibile generare il carrello');
    }
  });

  const handleProductSelect = (index: number, productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    form.setValue(`items.${index}.productId`, product.id);
    form.setValue(`items.${index}.name`, product.name);
    const price = parseFloat(product.price || product.regular_price || '0');
    form.setValue(`items.${index}.price`, Number.isFinite(price) ? price : 0);
  };

  return (
    <form className="grid form-grid" onSubmit={form.handleSubmit((values) => createQuoteMutation.mutate(values))}>
      <div className="grid two">
        <div>
          <label className="label" htmlFor="customerName">
            Nome cliente
          </label>
          <input id="customerName" className="input" {...form.register('customerName')} placeholder="Es. Rossi srl" />
          {form.formState.errors.customerName ? (
            <p className="error-text">{form.formState.errors.customerName.message}</p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="customerEmail">
            Email contatto (opzionale)
          </label>
          <input
            id="customerEmail"
            className="input"
            type="email"
            placeholder="cliente@email.com"
            {...form.register('customerEmail')}
          />
          {form.formState.errors.customerEmail ? (
            <p className="error-text">{form.formState.errors.customerEmail.message}</p>
          ) : null}
        </div>
      </div>

      <div className="cart-items">
        {fields.map((field, index) => (
          <div key={field.id} className="cart-item-row">
            <div className="grid two">
              <div>
                <label className="label">Prodotto WooCommerce</label>
                <select
                  className="select"
                  disabled={loading}
                  value={form.watch(`items.${index}.productId`) ?? ''}
                  onChange={(event) => handleProductSelect(index, Number(event.target.value))}
                >
                  <option value="">Seleziona prodotto...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.price} €)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nome personalizzato*</label>
                <input className="input" {...form.register(`items.${index}.name`)} placeholder="Nome prodotto" />
                {form.formState.errors.items?.[index]?.name ? (
                  <p className="error-text">{form.formState.errors.items[index]?.name?.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid two">
              <div>
                <label className="label">Prezzo *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  {...form.register(`items.${index}.price`, { valueAsNumber: true })}
                />
                {form.formState.errors.items?.[index]?.price ? (
                  <p className="error-text">{form.formState.errors.items[index]?.price?.message}</p>
                ) : null}
              </div>
              <div>
                <label className="label">Quantità *</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={99}
                  {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="item-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                Rimuovi
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="button outline"
          onClick={() => append({ name: '', price: 0, quantity: 1 })}
        >
          Aggiungi prodotto
        </button>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Note (opzionali)
        </label>
        <textarea id="notes" className="textarea" rows={3} {...form.register('notes')} />
      </div>

      <button className="button" type="submit" disabled={createQuoteMutation.isPending}>
        {createQuoteMutation.isPending ? 'Generazione in corso...' : 'Genera carrello'}
      </button>
    </form>
  );
}

function DriveTestForm({ token, onSuccess }: { token: string | null; onSuccess: () => void }) {
  const form = useForm<DriveFormValues, any, DriveFormValues>({
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

  const mutation = useMutation({
    mutationFn: async (values: DriveFormValues) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + values.validityDays);

      const quote = await apiClient<QuoteResponse>('docs/generate', {
        method: 'POST',
        token,
        body: {
          kind: 'quote',
          payload: {
            date: new Date().toISOString().slice(0, 10),
            dueDate: dueDate.toISOString().slice(0, 10),
            notes: `Drive Test personalizzato. Settori: ${values.sectors ?? '—'}.\n${values.notes ?? ''}`,
            customer: {
              name: values.companyName,
              email: values.contactEmail
            },
            lines: [
              {
                id: crypto.randomUUID ? crypto.randomUUID() : `drive-${Date.now()}`,
                description: `Drive Test per ${values.companyName}`,
                quantity: 1,
                unitPrice: values.price
              }
            ],
            taxRate: 0,
            showTax: false,
            currency: 'EUR'
          }
        }
      });

      await apiClient<CheckoutRecord>('checkouts', {
        method: 'POST',
        token,
        body: {
          session: `drive-${quote.id}`,
          status: 'drive_test',
          opportunity_id: null
        }
      });

      return quote;
    },
    onSuccess: (quote) => {
      toast.success('Drive test generato con successo');
      onSuccess();
      form.reset();
      if (quote.file_url) {
        window.open(quote.file_url, '_blank', 'noopener');
      }
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Impossibile creare il drive test');
    }
  });

  return (
    <form className="grid form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="grid two">
        <div>
          <label className="label" htmlFor="companyName">
            Azienda
          </label>
          <input id="companyName" className="input" {...form.register('companyName')} placeholder="Es. Alfa Spa" />
          {form.formState.errors.companyName ? (
            <p className="error-text">{form.formState.errors.companyName.message}</p>
          ) : null}
        </div>
        <div>
          <label className="label" htmlFor="contactEmail">
            Email cliente
          </label>
          <input id="contactEmail" className="input" {...form.register('contactEmail')} placeholder="contatto@azienda.it" />
          {form.formState.errors.contactEmail ? (
            <p className="error-text">{form.formState.errors.contactEmail.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid two">
        <div>
          <label className="label" htmlFor="price">
            Prezzo promozionale
          </label>
          <input id="price" className="input" type="number" step="0.01" {...form.register('price', { valueAsNumber: true })} />
          {form.formState.errors.price ? <p className="error-text">{form.formState.errors.price.message}</p> : null}
        </div>
        <div>
          <label className="label" htmlFor="validityDays">
            Durata offerta (giorni)
          </label>
          <input
            id="validityDays"
            className="input"
            type="number"
            min={1}
            max={30}
            {...form.register('validityDays', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="sectors">
          Settori coinvolti
        </label>
        <input id="sectors" className="input" {...form.register('sectors')} placeholder="Es. Tech, Finance" />
      </div>

      <div>
        <label className="label" htmlFor="driveNotes">
          Note interne
        </label>
        <textarea id="driveNotes" className="textarea" rows={3} {...form.register('notes')} />
      </div>

      <button className="button" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Generazione...' : 'Genera drive test'}
      </button>
    </form>
  );
}

function ProductCreatorForm({ token, onSuccess }: { token: string | null; onSuccess: () => void }) {
  const form = useForm<ProductFormValues, any, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      currency: 'EUR',
      sku: '',
      description: ''
    }
  });

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      apiClient('woocommerce/products', {
        method: 'POST',
        token,
        body: {
          name: values.name,
          price: values.price.toFixed(2),
          currency: values.currency,
          sku: values.sku || undefined,
          description: values.description || undefined,
          shortDescription: values.description || undefined
        }
      }),
    onSuccess: () => {
      toast.success('Prodotto creato con successo');
      form.reset({
        name: '',
        price: 0,
        currency: 'EUR',
        sku: '',
        description: ''
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Impossibile creare il prodotto');
    }
  });

  return (
    <form className="grid form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="grid two">
        <div>
          <label className="label" htmlFor="productName">
            Nome prodotto
          </label>
          <input id="productName" className="input" {...form.register('name')} placeholder="Es. Bundle 500 lead" />
          {form.formState.errors.name ? <p className="error-text">{form.formState.errors.name.message}</p> : null}
        </div>
        <div>
          <label className="label" htmlFor="productPrice">
            Prezzo
          </label>
          <input
            id="productPrice"
            className="input"
            type="number"
            step="0.01"
            {...form.register('price', { valueAsNumber: true })}
          />
          {form.formState.errors.price ? <p className="error-text">{form.formState.errors.price.message}</p> : null}
        </div>
      </div>

      <div className="grid two">
        <div>
          <label className="label" htmlFor="productCurrency">
            Valuta
          </label>
          <input
            id="productCurrency"
            className="input"
            maxLength={3}
            {...form.register('currency')}
            style={{ textTransform: 'uppercase' }}
          />
        </div>
        <div>
          <label className="label" htmlFor="productSku">
            SKU (opzionale)
          </label>
          <input id="productSku" className="input" {...form.register('sku')} placeholder="Es. AYCL-DRIVE-01" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="productDescription">
          Descrizione
        </label>
        <textarea id="productDescription" className="textarea" rows={3} {...form.register('description')} />
      </div>

      <button className="button" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creazione...' : 'Salva prodotto'}
      </button>
    </form>
  );
}

function CheckoutTable({ rows, loading }: { rows: CheckoutRecord[]; loading: boolean }) {
  const items = useMemo(() => rows.slice(0, 6), [rows]);

  if (loading) {
    return <p>Caricamento checkouts...</p>;
  }

  if (items.length === 0) {
    return <p className="helper">Genera un carrello o drive test per visualizzare qui lo storico.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Sessione</th>
            <th>Stato</th>
            <th>Referral</th>
            <th>Creato</th>
          </tr>
        </thead>
        <tbody>
          {items.map((checkout) => (
            <tr key={checkout.id}>
              <td>{checkout.session}</td>
              <td>
                <span className={`status-badge status-${checkout.status}`}>
                  {checkout.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td>
                {checkout.referral_code ? (
                  <a href={checkout.referral_link ?? '#'} target="_blank" rel="noreferrer">
                    {checkout.referral_code}
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td>{new Date(checkout.created_at).toLocaleString('it-IT')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
