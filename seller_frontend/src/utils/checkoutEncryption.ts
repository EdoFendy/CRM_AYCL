// Checkout Encryption Utility
// Note: Encryption is done server-side via API, this file provides helper functions

import type { DriveTestOrder } from './driveTestPricing';

const orderSchema = {
  package: 'string',
  currency: 'string',
  unitPrice: 'number',
  quantity: 'number',
  total: 'number',
  priceRange: {
    min: 'number',
    max: 'number',
  },
  selections: {
    revenueBand: {
      id: 'string',
      label: 'string',
    },
    geography: {
      id: 'string',
      label: 'string',
    },
    sector: {
      id: 'string',
      label: 'string',
    },
    riskProfile: 'number',
  },
  metadata: {
    locale: 'string',
    generatedAt: 'string',
    productName: 'string?',
    basePrice: 'string?',
    discountFromPrice: 'string?',
    macroSectorId: 'string?',
    macroSectorLabel: 'string?',
    sectorLevel: 'string?',
  },
};

/**
 * Encrypt checkout order via backend API
 * The encryption is done server-side for security
 */
export async function encryptCheckoutOrder(order: DriveTestOrder, token?: string): Promise<string> {
  try {
    // Call backend API to encrypt the order
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/checkout/encrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify({ order })
    });

    if (!response.ok) {
      throw new Error('Failed to encrypt checkout order');
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error encrypting checkout order:', error);
    throw new Error('Unable to encrypt checkout order. Please check your backend configuration.');
  }
}

/**
 * Decrypt checkout order (mostly for validation/testing)
 * Note: This is typically done server-side
 */
export function decryptCheckoutOrder(token: string): DriveTestOrder | null {
  // Decryption is done server-side
  // This is a placeholder function for type safety
  console.warn('Decryption should be done server-side');
  return null;
}

export function resolveCheckoutBaseUrl() {
  const rawBase =
    import.meta.env.VITE_CHECKOUT_BASE_URL ||
    import.meta.env.VITE_APP_URL ||
    "https://allyoucanleads.com";

  const trimmed = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
  if (!trimmed.startsWith("http")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
