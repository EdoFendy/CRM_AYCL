"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileDown, Upload, FileText, Plus, Search, CheckCircle2 } from "lucide-react";
import { apiClient } from "../utils/apiClient";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";

/** ============================== TYPES ============================== */
type Pack = "Setup-Fee" | "Performance" | "Subscription" | "Drive Test";
type DocStaticCategory = "pitch" | "proposal";
type DocGenKind = "quote" | "invoice" | "receipt";

type DocTemplateFile = {
  id: string;
  pack: Pack;
  category: DocStaticCategory; // "pitch" | "proposal"
  name: string;
  file_url: string;
  uploaded_at: string;
};

type WooProduct = {
  id: number;
  name: string;
  price: string;
  currency?: string;
  sku?: string | null;
};

type LineItem = {
  id: string;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

type GenForm = {
  kind: DocGenKind;
  number?: string;
  date: string;
  customerType?: "contact" | "company";
  customerId?: string;
  customer: {
    name: string;
    address?: string;
    vat?: string;
    pec?: string;
  };
  lines: LineItem[];
  notes?: string;
  taxRate?: number; // es. 22
  showTax?: boolean;
  dueDate?: string;
  currency?: string; // default EUR
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_id?: string;
};

type Company = {
  id: string;
  ragione_sociale: string;
  website?: string;
  geo?: string;
};

/** ============================== HELPERS ============================== */
const PACKS: Pack[] = ["Setup-Fee", "Performance", "Subscription", "Drive Test"];

function fmtEUR(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}

/** ============================== PAGE ============================== */
export default function AYCLKitPage() {
  const { token } = useAuth();
  const { t, notify } = useI18n();
  const qc = useQueryClient();

  const [activePack, setActivePack] = useState<Pack>("Setup-Fee");
  const [genTab, setGenTab] = useState<DocGenKind>("quote");

  // -------- STATIC FILES (Pitch / Proposal) ----------
  const filesQuery = useQuery({
    queryKey: ["doc-files", activePack],
    queryFn: () =>
      apiClient<{ data: DocTemplateFile[] }>(
        `doc-files?pack=${encodeURIComponent(activePack)}`,
        { token }
      ),
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: { file: File; category: DocStaticCategory }) => {
      const form = new FormData();
      form.append("file", payload.file);
      form.append("pack", activePack);
      form.append("category", payload.category);
      return apiClient<{ success: boolean }>("doc-files/upload", {
        method: "POST",
        token,
        body: form,
        isFormData: true,
      });
    },
    onSuccess: () => {
      notify("file.upload.success");
      qc.invalidateQueries({ queryKey: ["doc-files", activePack] });
    },
    onError: (e: any) => notify(e.message ?? "Upload fallito"),
  });

  // -------- CONTACTS & COMPANIES ----------
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerType, setCustomerType] = useState<"contact" | "company">("contact");

  const contactsQuery = useQuery({
    queryKey: ["contacts", customerSearch],
    queryFn: () =>
      apiClient<{ data: Contact[] }>(
        `contacts?search=${encodeURIComponent(customerSearch)}`,
        { token }
      ),
    enabled: customerType === "contact" && customerSearch.length > 1,
  });

  const companiesQuery = useQuery({
    queryKey: ["companies", customerSearch],
    queryFn: () =>
      apiClient<{ data: Company[] }>(
        `companies?search=${encodeURIComponent(customerSearch)}`,
        { token }
      ),
    enabled: customerType === "company" && customerSearch.length > 1,
  });

  // -------- WOO PRODUCTS ----------
  const [productSearch, setProductSearch] = useState("");
  const productsQuery = useQuery({
    queryKey: ["woo-products", productSearch],
    queryFn: () =>
      apiClient<{ data: WooProduct[] }>(
        `woocommerce/products?search=${encodeURIComponent(productSearch)}`,
        { token }
      ),
    enabled: productSearch.length > 1,
  });

  const createProductMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      price: string;
      currency?: string;
      sku?: string;
      description?: string;
      shortDescription?: string;
    }) =>
      apiClient<{ success: boolean; product?: WooProduct }>("woocommerce/products", {
        method: "POST",
        token,
        body: payload,
      }),
    onSuccess: (res) => {
      notify("product.create.success");
      qc.invalidateQueries({ queryKey: ["woo-products"] });
      if (res.product) {
        // no-op: l'utente può selezionarlo dalla ricerca
      }
    },
    onError: (e: any) => notify(e.message ?? "Creazione prodotto fallita"),
  });

  // -------- GENERATION (QUOTE / INVOICE / RECEIPT) ----------
  const [genForm, setGenForm] = useState<GenForm>({
    kind: "quote",
    date: new Date().toISOString().slice(0, 10),
    customer: { name: "" },
    lines: [{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }],
    notes: "",
    taxRate: 22,
    showTax: true,
    currency: "EUR",
  });

  const totals = useMemo(() => {
    const sub = genForm.lines.reduce((acc, l) => acc + (l.quantity || 0) * (l.unitPrice || 0), 0);
    const iva = genForm.showTax ? ((genForm.taxRate ?? 0) / 100) * sub : 0;
    return { sub, iva, tot: sub + iva };
  }, [genForm.lines, genForm.taxRate, genForm.showTax]);

  const [generatedDoc, setGeneratedDoc] = useState<{
    id: string;
    kind: DocGenKind;
    message: string;
  } | null>(null);

  const generateMutation = useMutation({
    mutationFn: () =>
      apiClient<{ id: string; file_url: string; message: string; success: boolean }>("docs/generate", {
        method: "POST",
        token,
        body: {
          kind: genForm.kind, // "quote" | "invoice" | "receipt"
          payload: {
            ...genForm,
            customerType: genForm.customerType,
            customerId: genForm.customerId,
          },
        },
      }),
    onSuccess: (res) => {
      notify("document.generate.success");
      setGeneratedDoc({
        id: res.id,
        kind: genForm.kind,
        message: res.message || "Documento generato con successo"
      });
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
      // Reset form dopo generazione
      setTimeout(() => {
        setGenForm({
          kind: genForm.kind,
          date: new Date().toISOString().slice(0, 10),
          customer: { name: "" },
          lines: [{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }],
          notes: "",
          taxRate: 22,
          showTax: true,
          currency: "EUR",
        });
      }, 2000);
    },
    onError: (e: any) => notify(e.message ?? "Errore generazione documento"),
  });

  /** ============================== RENDER ============================== */
  return (
    <section className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{t("ayclKit.title") ?? "AYCL Seller Kit"}</h2>
          <p className="text-sm text-slate-500">
            Materiali pack caricati dall'admin + generazione Preventivo/Fattura/Ricevuta.
          </p>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {generatedDoc && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">
                  {generatedDoc.message}
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  ID documento: <code className="rounded bg-green-100 px-2 py-0.5">{generatedDoc.id}</code>
                </p>
                <p className="mt-2 text-sm text-green-600">
                  Il documento è stato salvato nel database. Puoi trovarlo nella sezione{" "}
                  {generatedDoc.kind === "quote" ? "Preventivi" : generatedDoc.kind === "invoice" ? "Fatture" : "Ricevute"}.
                </p>
              </div>
            </div>
            <button
              onClick={() => setGeneratedDoc(null)}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* PACK TABS */}
      <div className="flex flex-wrap gap-2">
        {PACKS.map((p) => (
          <button
            key={p}
            onClick={() => setActivePack(p)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              activePack === p ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* STATIC FILES: PITCH & PROPOSAL */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pitch */}
        <StaticFilesCard
          title="Pitch deck"
          description="Scarica il materiale del pack. Più file consentiti."
          category="pitch"
          files={filesQuery.data?.data?.filter((f) => f.category === "pitch") ?? []}
          loading={filesQuery.isLoading}
          onUpload={(file) => uploadMutation.mutate({ file, category: "pitch" })}
        />
        {/* Proposal */}
        <StaticFilesCard
          title="Proposta"
          description="Proposte contrattuali del pack (file caricati dall’admin)."
          category="proposal"
          files={filesQuery.data?.data?.filter((f) => f.category === "proposal") ?? []}
          loading={filesQuery.isLoading}
          onUpload={(file) => uploadMutation.mutate({ file, category: "proposal" })}
        />
      </div>

      {/* GENERAZIONE DOCS */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Genera documento
          </h3>

          <div className="flex gap-2">
            {(["quote", "invoice", "receipt"] as DocGenKind[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setGenTab(k);
                  setGenForm((prev) => ({ ...prev, kind: k }));
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                  genTab === k ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
                }`}
              >
                {k === "quote" ? "Preventivo" : k === "invoice" ? "Fattura" : "Ricevuta"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: FORM */}
          <div className="space-y-4">
            {/* Meta */}
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Numero"
                placeholder={genTab === "invoice" ? "AYCL-2025-0001" : "2025-PRV-0001"}
                value={genForm.number ?? ""}
                onChange={(v) => setGenForm((p) => ({ ...p, number: v }))}
              />
              <TextField
                type="date"
                label="Data"
                value={genForm.date}
                onChange={(v) => setGenForm((p) => ({ ...p, date: v }))}
              />
            </div>

            {/* Selezione Cliente/Azienda */}
            <div className="rounded-md border border-slate-200 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Seleziona cliente dal database
              </div>
              
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerType("contact")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    customerType === "contact"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Contatto
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType("company")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    customerType === "company"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Azienda
                </button>
              </div>

              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  className="w-full rounded-md border border-slate-300 pl-8 pr-3 py-2 text-sm"
                  placeholder={`Cerca ${customerType === "contact" ? "contatto" : "azienda"}...`}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>

              {/* Risultati ricerca */}
              {customerSearch.length > 1 ? (
                <div className="mb-3 max-h-44 overflow-auto rounded-md border border-slate-200">
                  {customerType === "contact" ? (
                    contactsQuery.isLoading ? (
                      <div className="p-3 text-sm text-slate-500">Ricerca in corso…</div>
                    ) : (contactsQuery.data?.data?.length ?? 0) === 0 ? (
                      <div className="p-3 text-sm text-slate-500">Nessun contatto trovato.</div>
                    ) : (
                      contactsQuery.data!.data.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-b border-slate-100 p-2 text-left hover:bg-slate-50"
                          onClick={() => {
                            setGenForm((prev) => ({
                              ...prev,
                              customerType: "contact",
                              customerId: c.id,
                              customer: {
                                name: `${c.first_name} ${c.last_name}`,
                                address: prev.customer.address,
                                vat: prev.customer.vat,
                                pec: c.email || prev.customer.pec,
                              },
                            }));
                            setCustomerSearch("");
                          }}
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {c.first_name} {c.last_name}
                            </div>
                            {c.email && <div className="text-xs text-slate-600">{c.email}</div>}
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </button>
                      ))
                    )
                  ) : (
                    companiesQuery.isLoading ? (
                      <div className="p-3 text-sm text-slate-500">Ricerca in corso…</div>
                    ) : (companiesQuery.data?.data?.length ?? 0) === 0 ? (
                      <div className="p-3 text-sm text-slate-500">Nessuna azienda trovata.</div>
                    ) : (
                      companiesQuery.data!.data.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-b border-slate-100 p-2 text-left hover:bg-slate-50"
                          onClick={() => {
                            setGenForm((prev) => ({
                              ...prev,
                              customerType: "company",
                              customerId: c.id,
                              customer: {
                                name: c.ragione_sociale,
                                address: prev.customer.address,
                                vat: prev.customer.vat,
                                pec: prev.customer.pec,
                              },
                            }));
                            setCustomerSearch("");
                          }}
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-800">{c.ragione_sociale}</div>
                            {c.geo && <div className="text-xs text-slate-600">{c.geo}</div>}
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </button>
                      ))
                    )
                  )}
                </div>
              ) : null}
            </div>

            {/* Cliente */}
            <div className="rounded-md border border-slate-200 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dati cliente
                {genForm.customerId && (
                  <span className="ml-2 text-xs font-normal text-green-600">
                    ✓ {genForm.customerType === "contact" ? "Contatto" : "Azienda"} selezionato
                  </span>
                )}
              </div>
              <TextField
                label="Ragione sociale / Nome"
                value={genForm.customer.name}
                onChange={(v) => setGenForm((p) => ({ ...p, customer: { ...p.customer, name: v } }))}
              />
              <TextField
                label="Indirizzo"
                value={genForm.customer.address ?? ""}
                onChange={(v) => setGenForm((p) => ({ ...p, customer: { ...p.customer, address: v } }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Partita IVA"
                  value={genForm.customer.vat ?? ""}
                  onChange={(v) => setGenForm((p) => ({ ...p, customer: { ...p.customer, vat: v } }))}
                />
                {genTab === "invoice" ? (
                  <TextField
                    label="PEC"
                    value={genForm.customer.pec ?? ""}
                    onChange={(v) => setGenForm((p) => ({ ...p, customer: { ...p.customer, pec: v } }))}
                  />
                ) : null}
              </div>
            </div>

            {/* Linee / Woo */}
            <div className="rounded-md border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Articoli / Servizi
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                  onClick={() =>
                    setGenForm((p) => ({
                      ...p,
                      lines: [
                        ...p.lines,
                        { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
                      ],
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Nuova riga
                </button>
              </div>

              {/* Ricerca Woo */}
              <div className="mb-2 flex items-center gap-2">
                <div className="relative grow">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    className="w-full rounded-md border border-slate-300 pl-8 pr-3 py-2 text-sm"
                    placeholder="Cerca prodotti su WooCommerce…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <QuickCreateProduct onCreate={(payload) => createProductMutation.mutate(payload)} />
              </div>

              {/* Risultati ricerca */}
              {productSearch.length > 1 ? (
                <div className="mb-3 max-h-44 overflow-auto rounded-md border border-slate-200">
                  {productsQuery.isLoading ? (
                    <div className="p-3 text-sm text-slate-500">Ricerca in corso…</div>
                  ) : (productsQuery.data?.data?.length ?? 0) === 0 ? (
                    <div className="p-3 text-sm text-slate-500">Nessun prodotto trovato.</div>
                  ) : (
                    productsQuery.data!.data.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 p-2 text-left hover:bg-slate-50"
                        onClick={() => {
                          // aggiungi come nuova riga
                          setGenForm((prev) => ({
                            ...prev,
                            lines: [
                              ...prev.lines,
                              {
                                id: crypto.randomUUID(),
                                productId: p.id,
                                description: p.name,
                                quantity: 1,
                                unitPrice: parseFloat(p.price) || 0,
                              },
                            ],
                            currency: p.currency ?? prev.currency ?? "EUR",
                          }));
                          // Pulisci ricerca dopo aggiunta
                          setProductSearch("");
                        }}
                      >
                        <span className="text-sm text-slate-800">{p.name}</span>
                        <span className="text-xs text-slate-600">
                          {fmtEUR(parseFloat(p.price || "0"), p.currency ?? "EUR")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {/* Righe */}
              <div className="space-y-3">
                {genForm.lines.map((l, idx) => (
                  <div key={l.id} className="rounded-md border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Articolo #{idx + 1}</span>
                      {genForm.lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setGenForm((p) => ({
                              ...p,
                              lines: p.lines.filter((_, i) => i !== idx),
                            }))
                          }
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Rimuovi
                        </button>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <SmallField
                        label="Descrizione"
                        value={l.description}
                        onChange={(v) =>
                          setGenForm((p) => {
                            const lines = [...p.lines];
                            lines[idx] = { ...lines[idx], description: v };
                            return { ...p, lines };
                          })
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <SmallField
                          label="Quantità"
                          type="number"
                          value={String(l.quantity)}
                          onChange={(v) =>
                            setGenForm((p) => {
                              const lines = [...p.lines];
                              lines[idx] = { ...lines[idx], quantity: Math.max(0, Number(v) || 0) };
                              return { ...p, lines };
                            })
                          }
                        />
                        <SmallField
                          label={`Prezzo unit. (${genForm.currency ?? "EUR"})`}
                          type="number"
                          step="0.01"
                          value={String(l.unitPrice)}
                          onChange={(v) =>
                            setGenForm((p) => {
                              const lines = [...p.lines];
                              lines[idx] = { ...lines[idx], unitPrice: Math.max(0, Number(v) || 0) };
                              return { ...p, lines };
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Totale riga</span>
                      <span className="font-semibold">
                        {fmtEUR((l.quantity || 0) * (l.unitPrice || 0), genForm.currency ?? "EUR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Impostazioni fiscali / note */}
            <div className="grid gap-3 sm:grid-cols-2">
              <SmallField
                label="Aliquota IVA %"
                type="number"
                value={String(genForm.taxRate ?? 22)}
                onChange={(v) => setGenForm((p) => ({ ...p, taxRate: Number(v) || 0 }))}
              />
              <div className="flex items-end gap-2">
                <input
                  id="showTax"
                  type="checkbox"
                  checked={!!genForm.showTax}
                  onChange={(e) => setGenForm((p) => ({ ...p, showTax: e.target.checked }))}
                />
                <label htmlFor="showTax" className="text-sm text-slate-700">
                  Mostra IVA in documento
                </label>
              </div>
            </div>
            <TextArea
              label="Note"
              value={genForm.notes ?? ""}
              onChange={(v) => setGenForm((p) => ({ ...p, notes: v }))}
            />

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                disabled={generateMutation.isPending || !genForm.customer.name || genForm.lines.length === 0}
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {genTab === "quote" ? "Genera Preventivo" : genTab === "invoice" ? "Genera Fattura" : "Genera Ricevuta"}
              </button>
            </div>
          </div>

          {/* RIGHT: ANTEPRIMA & RIEPILOGO */}
          <div className="space-y-4">
            {/* Anteprima Documento */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Anteprima Documento
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {/* Tipo documento */}
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="text-xs text-slate-500">Tipo</div>
                  <div className="font-semibold text-slate-900">
                    {genTab === "quote" ? "Preventivo" : genTab === "invoice" ? "Fattura" : "Ricevuta"}
                  </div>
                </div>

                {/* Cliente */}
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="text-xs text-slate-500">Cliente</div>
                  <div className="font-medium text-slate-900">
                    {genForm.customer.name || <span className="text-slate-400 italic">Non specificato</span>}
                  </div>
                  {genForm.customerId && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Collegato al database
                    </div>
                  )}
                </div>

                {/* Articoli */}
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="text-xs text-slate-500 mb-1">Articoli</div>
                  {genForm.lines.length === 0 || !genForm.lines[0].description ? (
                    <div className="text-slate-400 italic text-xs">Nessun articolo aggiunto</div>
                  ) : (
                    <div className="space-y-1">
                      {genForm.lines.filter(l => l.description).map((line, idx) => (
                        <div key={line.id} className="flex justify-between text-xs">
                          <span className="text-slate-700 truncate">
                            {idx + 1}. {line.description}
                          </span>
                          <span className="text-slate-600 ml-2 whitespace-nowrap">
                            {line.quantity}x {fmtEUR(line.unitPrice, genForm.currency ?? "EUR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Totali */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Riepilogo Importi
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotale</span>
                  <span className="font-medium">{fmtEUR(totals.sub, genForm.currency ?? "EUR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">IVA ({genForm.taxRate}%)</span>
                  <span className="font-medium">{fmtEUR(totals.iva, genForm.currency ?? "EUR")}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base">
                  <span className="font-semibold">Totale</span>
                  <span className="font-bold text-lg">{fmtEUR(totals.tot, genForm.currency ?? "EUR")}</span>
                </div>
              </div>
            </div>

            {/* Validazione */}
            {(!genForm.customer.name || genForm.lines.length === 0 || !genForm.lines[0].description) && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                <div className="font-semibold mb-1">⚠️ Completa il documento</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {!genForm.customer.name && <li>Seleziona o inserisci un cliente</li>}
                  {(genForm.lines.length === 0 || !genForm.lines[0].description) && (
                    <li>Aggiungi almeno un articolo</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** ============================== SUB-COMPONENTS ============================== */

// Card per Pitch/Proposal (file caricati admin)
function StaticFilesCard({
  title,
  description,
  category,
  files,
  loading,
  onUpload,
}: {
  title: string;
  description: string;
  category: DocStaticCategory;
  files: DocTemplateFile[];
  loading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h4 className="text-base font-semibold text-slate-900">{title}</h4>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
          <Upload className="h-4 w-4" />
          Carica file
          <input
            type="file"
            accept=".pdf,.ppt,.pptx,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <div className="rounded-md border border-slate-200">
        {loading ? (
          <div className="flex items-center gap-2 p-3 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento…
          </div>
        ) : files.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">Nessun file {category === "pitch" ? "pitch deck" : "proposta"} per questo pack.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{f.name}</div>
                  <div className="truncate text-xs text-slate-500">{new Date(f.uploaded_at).toLocaleString("it-IT")}</div>
                </div>
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  <FileDown className="h-4 w-4" />
                  Scarica
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Quick create (stile ispirato al tuo form prodotti) :contentReference[oaicite:4]{index=4}
function QuickCreateProduct({
  onCreate,
}: {
  onCreate: (p: {
    name: string;
    price: string;
    currency?: string;
    sku?: string;
    description?: string;
    shortDescription?: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [sku, setSku] = useState("");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
      >
        <Plus className="h-3.5 w-3.5" /> Nuovo prodotto
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-md border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Crea prodotto WooCommerce
          </div>
          <SmallField label="Nome" value={name} onChange={setName} />
          <div className="grid grid-cols-2 gap-2">
            <SmallField label="Prezzo" value={price} onChange={setPrice} />
            <SmallField label="Valuta" value={currency} onChange={setCurrency} maxLength={3} />
          </div>
          <SmallField label="SKU (opz.)" value={sku} onChange={setSku} />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
              onClick={() => setOpen(false)}
            >
              Annulla
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              disabled={!name || !price}
              onClick={() => {
                onCreate({ name, price, currency: currency.toUpperCase(), sku });
                setOpen(false);
                setName("");
                setPrice("");
                setCurrency("EUR");
                setSku("");
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Salva
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** ============================== UI PRIMITIVES ============================== */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <input
        type={type}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SmallField({
  label,
  value,
  onChange,
  type = "text",
  step,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: React.HTMLInputTypeAttribute;
  step?: string;
  maxLength?: number;
}) {
  return (
    <label className="block text-xs">
      <div className="mb-1 font-medium text-slate-600">{label}</div>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <textarea
        rows={rows}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
