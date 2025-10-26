import { useMemo, useState } from "react";
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import {
  BASE_ITALIA,
  COEFF_GEO,
  SECTOR_GROUPS,
  HIGH_REVENUE_IDS,
  MIN_QTY,
  MAX_QTY,
  DEFAULT_QTY,
  round5,
  calculatePriceRange,
  calculateUnitPrice,
  type DriveTestOrder,
  type Band,
  type Coeff,
  type SectorOption,
  type SectorGroup
} from '@utils/driveTestPricing';
import { encryptCheckoutOrder, resolveCheckoutBaseUrl } from '@utils/checkoutEncryption';

interface DriveTestCalculatorProps {
  onCheckoutGenerated?: (checkoutUrl: string) => void;
}

export function DriveTestCalculator({ onCheckoutGenerated }: DriveTestCalculatorProps) {
  const { token, user } = useAuth();
  const { selectedClient } = useSelectedClient();
  
  const [band, setBand] = useState<string>(BASE_ITALIA[0].id);
  const [geo, setGeo] = useState<string>(COEFF_GEO[0].id);
  const [sectorGroup, setSectorGroup] = useState<string>("");
  const [sectorOption, setSectorOption] = useState<string>("");
  const [qty, setQty] = useState<number>(DEFAULT_QTY);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get referral data
  const referralQuery = useQuery({
    queryKey: ['referral'],
    queryFn: () => apiClient<{ referral_code: string; checkout_url: string }>('referral/me', { token }),
    enabled: Boolean(token)
  });

  const selectedBand = useMemo(() => {
    return BASE_ITALIA.find(x => x.id === band) ?? BASE_ITALIA[0]
  }, [band])

  const selectedGeo = useMemo(() => {
    return COEFF_GEO.find(x => x.id === geo) ?? COEFF_GEO[0]
  }, [geo])

  const selectedSectorGroup = useMemo(
    () => SECTOR_GROUPS.find(x => x.id === sectorGroup),
    [sectorGroup]
  )

  const selectedSectorOption = useMemo(() => {
    if (!selectedSectorGroup) {
      return undefined
    }

    if (!sectorOption) {
      return selectedSectorGroup.options[0]
    }

    return (
      selectedSectorGroup.options.find(x => x.id === sectorOption) ??
      selectedSectorGroup.options[0]
    )
  }, [selectedSectorGroup, sectorOption])

  // Calculate pricing
  const priceRange = useMemo(() => {
    if (!selectedSectorOption) return { min: 0, max: 0 };
    return calculatePriceRange(selectedBand, selectedGeo, selectedSectorOption);
  }, [selectedBand, selectedGeo, selectedSectorOption]);

  const calculatedUnitPrice = useMemo(() => {
    if (!selectedSectorOption) return 0;
    return calculateUnitPrice(selectedBand, selectedGeo, selectedSectorOption);
  }, [selectedBand, selectedGeo, selectedSectorOption]);

  const unitPrice = customPrice !== null ? customPrice : calculatedUnitPrice;
  const total = useMemo(() => unitPrice * qty, [unitPrice, qty]);
  const isHighRevenue = HIGH_REVENUE_IDS.has(band);

  // Validate custom price
  const isCustomPriceValid = customPrice === null || 
    (customPrice >= priceRange.min && customPrice <= priceRange.max);

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSectorOption || !referralQuery.data) {
        throw new Error('Configurazione incompleta');
      }

      const order: DriveTestOrder = {
        package: "Drive Test",
        currency: "EUR",
        unitPrice,
        quantity: qty,
        total,
        priceRange,
        selections: {
          revenueBand: { id: selectedBand.id, label: selectedBand.label },
          geography: { id: selectedGeo.id, label: selectedGeo.label },
          sector: { id: selectedSectorOption.id, label: selectedSectorOption.label },
          riskProfile: 50,
        },
        metadata: {
          locale: "it-IT",
          generatedAt: new Date().toISOString(),
          productName: "Drive Test",
          macroSectorId: selectedSectorGroup?.id,
          macroSectorLabel: selectedSectorGroup?.label,
          sectorLevel: selectedSectorOption.level,
        },
      };

      // Encrypt the order via API (server-side encryption)
      const encryptedToken = await encryptCheckoutOrder(order, token || undefined);
      
      // Build checkout URL
      const baseUrl = resolveCheckoutBaseUrl();
      const checkoutUrl = `${baseUrl}/checkout?order=${encryptedToken}&ref=${referralQuery.data.referral_code}`;
      
      return { checkoutUrl, order };
    },
    onSuccess: (data) => {
      toast.success('Link checkout generato con successo!');
      onCheckoutGenerated?.(data.checkoutUrl);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella generazione del checkout');
    }
  });

  const handleGenerateCheckout = () => {
    if (!isCustomPriceValid) {
      toast.error('Prezzo personalizzato fuori dal range consentito');
      return;
    }
    createCheckoutMutation.mutate();
  };

  const handleCustomPriceChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setCustomPrice(null);
    } else {
      setCustomPrice(numValue);
    }
  };

  const resetCustomPrice = () => {
    setCustomPrice(null);
  };

  if (!selectedClient) {
    return (
      <div className="text-center py-12">
        <div className="text-lg font-semibold text-slate-900 mb-2">⚠️ Nessun cliente selezionato</div>
        <div className="text-sm text-slate-500">
          Seleziona un cliente per configurare il Drive Test
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Drive Test Calculator</h2>
        <p className="text-slate-600">
          Configura un Drive Test personalizzato per <strong>{selectedClient.data.name}</strong>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Configurazione</h3>
            
            <div className="space-y-4">
              {/* Geography */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Area Geografica
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={geo}
                  onChange={(e) => setGeo(e.target.value)}
                >
                  {COEFF_GEO.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector Group */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Macro Settore
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={sectorGroup}
                  onChange={(e) => {
                    const nextGroup = e.target.value;
                    setSectorGroup(nextGroup);
                    if (!nextGroup) {
                      setSectorOption("");
                      return;
                    }
                    const group = SECTOR_GROUPS.find(x => x.id === nextGroup);
                    setSectorOption(group?.options[0]?.id ?? "");
                  }}
                >
                  <option value="">Seleziona una macro area</option>
                  {SECTOR_GROUPS.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector Option */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Settore Specifico
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={sectorOption}
                  onChange={(e) => setSectorOption(e.target.value)}
                  disabled={!selectedSectorGroup}
                >
                  {!selectedSectorGroup ? (
                    <option value="">Seleziona una macro area</option>
                  ) : null}
                  {selectedSectorGroup?.options.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.level === "macro" ? `${option.label} (Macro)` : option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Revenue Band */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fatturato Azienda
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={band}
                  onChange={(e) => setBand(e.target.value)}
                >
                  {BASE_ITALIA.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quantità Lead ({qty})
                </label>
                <input
                  type="range"
                  min={MIN_QTY}
                  max={MAX_QTY}
                  value={qty}
                  onChange={(event) => setQty(parseInt(event.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{MIN_QTY}</span>
                  <span>{MAX_QTY}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Prezzi e Totali</h3>
            
            {selectedSectorOption && (
              <div className="space-y-4">
                {/* Price Range Display */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-2">Range Prezzo Unitario</div>
                  <div className="text-lg font-semibold text-slate-900">
                    €{priceRange.min.toLocaleString()} - €{priceRange.max.toLocaleString()}
                  </div>
                </div>

                {/* Custom Price Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prezzo Personalizzato (opzionale)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customPrice || ''}
                      onChange={(e) => handleCustomPriceChange(e.target.value)}
                      placeholder={`€${calculatedUnitPrice}`}
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      min={priceRange.min}
                      max={priceRange.max}
                    />
                    {customPrice !== null && (
                      <button
                        type="button"
                        onClick={resetCustomPrice}
                        className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {customPrice !== null && !isCustomPriceValid && (
                    <p className="text-xs text-red-600 mt-1">
                      Prezzo deve essere tra €{priceRange.min} e €{priceRange.max}
                    </p>
                  )}
                </div>

                {/* Current Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 mb-1">Prezzo Unitario</div>
                    <div className="text-2xl font-bold text-blue-900">
                      €{unitPrice.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 mb-1">Totale</div>
                    <div className="text-2xl font-bold text-green-900">
                      €{total.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* High Revenue Warning */}
                {isHighRevenue ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-sm text-orange-800">
                      <strong>Nota:</strong> Le aziende con fatturato superiore a €10M 
                      vengono seguite con una configurazione dedicata.
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateCheckout}
                    disabled={!isCustomPriceValid || createCheckoutMutation.isPending}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createCheckoutMutation.isPending ? 'Generazione...' : 'Genera Link Checkout'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Checkout URL Display */}
          {createCheckoutMutation.data && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-medium text-green-800 mb-2">Link Checkout Generato</div>
              <div className="bg-white rounded border p-2 text-sm font-mono text-slate-600 break-all">
                {createCheckoutMutation.data.checkoutUrl}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createCheckoutMutation.data.checkoutUrl);
                  toast.success('Link copiato negli appunti!');
                }}
                className="mt-2 text-sm text-green-600 hover:text-green-800"
              >
                Copia Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
