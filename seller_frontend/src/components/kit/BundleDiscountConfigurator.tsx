import { useState } from 'react';
import type { BundleProduct, BundleDiscount } from '@types/bundle';

interface BundleDiscountConfiguratorProps {
  products: BundleProduct[];
  onDiscountChange: (discount: BundleDiscount) => void;
}

export function BundleDiscountConfigurator({ products, onDiscountChange }: BundleDiscountConfiguratorProps) {
  const [cartDiscountType, setCartDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [cartDiscountValue, setCartDiscountValue] = useState<number>(0);
  const [productDiscounts, setProductDiscounts] = useState<Array<{
    productId: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  }>>([]);

  const subtotal = products.reduce((sum, product) => sum + product.total, 0);

  // Calculate cart discount amount
  const cartDiscountAmount = cartDiscountType === 'percentage' 
    ? (subtotal * cartDiscountValue) / 100
    : cartDiscountValue;

  // Calculate product discounts
  const productDiscountAmount = productDiscounts.reduce((sum, discount) => {
    const product = products.find(p => p.product_id === discount.productId);
    if (!product) return sum;
    
    const discountAmount = discount.discountType === 'percentage'
      ? (product.total * discount.discountValue) / 100
      : discount.discountValue;
    
    return sum + Math.min(discountAmount, product.total);
  }, 0);

  const totalDiscount = cartDiscountAmount + productDiscountAmount;
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  const handleCartDiscountChange = () => {
    onDiscountChange({
      cartDiscount: {
        type: cartDiscountType,
        value: cartDiscountValue
      },
      productDiscounts
    });
  };

  const handleProductDiscountChange = (productId: string, discountType: 'percentage' | 'fixed', discountValue: number) => {
    const updatedDiscounts = productDiscounts.filter(d => d.productId !== productId);
    if (discountValue > 0) {
      updatedDiscounts.push({ productId, discountType, discountValue });
    }
    setProductDiscounts(updatedDiscounts);
    
    onDiscountChange({
      cartDiscount: {
        type: cartDiscountType,
        value: cartDiscountValue
      },
      productDiscounts: updatedDiscounts
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Configurazione Sconti</h3>
      
      {/* Cart-level Discount */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h4 className="font-medium text-slate-900 mb-3">Sconto Globale Carrello</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo Sconto
            </label>
            <select
              value={cartDiscountType}
              onChange={(e) => {
                setCartDiscountType(e.target.value as 'percentage' | 'fixed');
                handleCartDiscountChange();
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="percentage">Percentuale</option>
              <option value="fixed">Importo Fisso</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {cartDiscountType === 'percentage' ? 'Percentuale (%)' : 'Importo (€)'}
            </label>
            <input
              type="number"
              min="0"
              max={cartDiscountType === 'percentage' ? 100 : subtotal}
              step={cartDiscountType === 'percentage' ? 1 : 0.01}
              value={cartDiscountValue}
              onChange={(e) => {
                setCartDiscountValue(parseFloat(e.target.value) || 0);
                handleCartDiscountChange();
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        
        {cartDiscountValue > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Sconto carrello:</strong> €{cartDiscountAmount.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Product-level Discounts */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h4 className="font-medium text-slate-900 mb-3">Sconti per Prodotto</h4>
        
        {products.length === 0 ? (
          <p className="text-slate-500 text-sm">Aggiungi prodotti per configurare sconti specifici</p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const productDiscount = productDiscounts.find(d => d.productId === product.product_id);
              
              return (
                <div key={product.product_id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="font-medium text-slate-900">{product.name}</h5>
                      <p className="text-sm text-slate-600">
                        Prezzo base: €{product.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Tipo
                      </label>
                      <select
                        value={productDiscount?.discountType || 'percentage'}
                        onChange={(e) => {
                          const discountType = e.target.value as 'percentage' | 'fixed';
                          const discountValue = productDiscount?.discountValue || 0;
                          handleProductDiscountChange(product.product_id!, discountType, discountValue);
                        }}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">€</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Valore
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={productDiscount?.discountType === 'percentage' ? 100 : product.total}
                        step={productDiscount?.discountType === 'percentage' ? 1 : 0.01}
                        value={productDiscount?.discountValue || 0}
                        onChange={(e) => {
                          const discountValue = parseFloat(e.target.value) || 0;
                          handleProductDiscountChange(
                            product.product_id!,
                            productDiscount?.discountType || 'percentage',
                            discountValue
                          );
                        }}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Sconto
                      </label>
                      <div className="text-xs font-semibold text-slate-900">
                        {productDiscount ? (
                          productDiscount.discountType === 'percentage'
                            ? `${productDiscount.discountValue}%`
                            : `€${productDiscount.discountValue.toFixed(2)}`
                        ) : (
                          'Nessuno'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="font-medium text-slate-900 mb-3">Riepilogo Prezzi</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotale prodotti:</span>
            <span className="font-medium">€{subtotal.toFixed(2)}</span>
          </div>
          
          {cartDiscountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Sconto carrello:</span>
              <span>-€{cartDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          
          {productDiscountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Sconti prodotti:</span>
              <span>-€{productDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="border-t border-slate-300 pt-2">
            <div className="flex justify-between text-lg font-semibold">
              <span>Totale finale:</span>
              <span className="text-green-600">€{finalTotal.toFixed(2)}</span>
            </div>
          </div>
          
          {totalDiscount > 0 && (
            <div className="text-xs text-slate-500">
              Risparmio totale: €{totalDiscount.toFixed(2)} 
              ({((totalDiscount / subtotal) * 100).toFixed(1)}%)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

