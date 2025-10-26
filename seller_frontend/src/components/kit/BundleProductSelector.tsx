import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import type { WooProduct, BundleProduct } from '@types/bundle';

interface BundleProductSelectorProps {
  selectedProducts: BundleProduct[];
  onProductsChange: (products: BundleProduct[]) => void;
}

export function BundleProductSelector({ selectedProducts, onProductsChange }: BundleProductSelectorProps) {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

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

  const products = productsQuery.data ?? [];
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addProduct = (product: WooProduct) => {
    const existingProduct = selectedProducts.find(p => p.product_id === product.id.toString());
    if (existingProduct) {
      // Update quantity
      const updatedProducts = selectedProducts.map(p =>
        p.product_id === product.id.toString()
          ? { ...p, quantity: p.quantity + 1, total: (p.quantity + 1) * p.unit_price }
          : p
      );
      onProductsChange(updatedProducts);
    } else {
      // Add new product
      const newProduct: BundleProduct = {
        product_id: product.id.toString(),
        name: product.name,
        quantity: 1,
        unit_price: parseFloat(product.price) || 0,
        total: parseFloat(product.price) || 0
      };
      onProductsChange([...selectedProducts, newProduct]);
    }
  };

  const removeProduct = (productId: string) => {
    onProductsChange(selectedProducts.filter(p => p.product_id !== productId));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }
    
    const updatedProducts = selectedProducts.map(p =>
      p.product_id === productId
        ? { ...p, quantity, total: quantity * p.unit_price }
        : p
    );
    onProductsChange(updatedProducts);
  };

  const updateProductPrice = (productId: string, unitPrice: number) => {
    const updatedProducts = selectedProducts.map(p =>
      p.product_id === productId
        ? { ...p, unit_price: unitPrice, total: p.quantity * unitPrice }
        : p
    );
    onProductsChange(updatedProducts);
  };

  const subtotal = selectedProducts.reduce((sum, product) => sum + product.total, 0);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Cerca Prodotti
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per nome o SKU..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Available Products */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Prodotti Disponibili ({filteredProducts.length})
          </h3>
          
          {productsQuery.isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Caricamento prodotti...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Nessun prodotto trovato</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{product.name}</h4>
                      {product.sku && (
                        <p className="text-sm text-slate-500">SKU: {product.sku}</p>
                      )}
                      <p className="text-sm font-semibold text-blue-600">
                        €{parseFloat(product.price).toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Aggiungi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Products */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Prodotti Selezionati ({selectedProducts.length})
          </h3>
          
          {selectedProducts.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
              <p className="text-slate-500">Nessun prodotto selezionato</p>
              <p className="text-sm text-slate-400 mt-1">
                Seleziona prodotti dal catalogo per creare il bundle
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedProducts.map((product) => (
                <div key={product.product_id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{product.name}</h4>
                      <p className="text-sm text-slate-500">
                        SKU: {product.product_id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(product.product_id!)}
                      className="ml-4 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Quantità
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(e) => updateProductQuantity(product.product_id!, parseInt(e.target.value))}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Prezzo Unitario (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.unit_price}
                        onChange={(e) => updateProductPrice(product.product_id!, parseFloat(e.target.value))}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Totale:</span>
                      <span className="font-semibold text-slate-900">
                        €{product.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedProducts.length > 0 && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between text-lg font-semibold">
                <span>Subtotale:</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

