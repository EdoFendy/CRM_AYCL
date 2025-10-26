// Bundle Types and Interfaces

export interface BundleProduct {
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface BundleDiscount {
  // Sconto globale carrello
  cartDiscount: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  // Sconti per singolo prodotto
  productDiscounts: Array<{
    productId: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  }>;
}

export interface Bundle {
  id: string;
  name: string;
  description?: string;
  products: BundleProduct[];
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency: string;
  valid_from?: string;
  valid_until?: string;
  includes_upsell: boolean;
  upsell_details?: {
    name: string;
    description: string;
    price: number;
  };
  company_id?: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface BundleFormData {
  name: string;
  description?: string;
  products: BundleProduct[];
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency: string;
  valid_from?: string;
  valid_until?: string;
  includes_upsell: boolean;
  upsell_details?: {
    name: string;
    description: string;
    price: number;
  };
  company_id?: string;
}

export interface WooProduct {
  id: number;
  name: string;
  price: string;
  regular_price?: string;
  sku?: string;
  description?: string;
}

export interface BundleCheckoutOrder {
  type: 'bundle';
  bundle_id: string;
  bundle_name: string;
  products: BundleProduct[];
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  currency: string;
  metadata: {
    locale: string;
    generatedAt: string;
    seller_referral_code: string;
  };
}

