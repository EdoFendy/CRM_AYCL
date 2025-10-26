import { Router } from 'express';
import { z } from 'zod';
import { createCipheriv, randomBytes, createHash } from 'crypto';

export const checkoutEncryptionRouter = Router();

const orderSchema = z.object({
  package: z.string(),
  currency: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  total: z.number(),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  selections: z.object({
    revenueBand: z.object({
      id: z.string(),
      label: z.string(),
    }),
    geography: z.object({
      id: z.string(),
      label: z.string(),
    }),
    sector: z.object({
      id: z.string(),
      label: z.string(),
    }),
    riskProfile: z.number(),
  }),
  metadata: z.object({
    locale: z.string(),
    generatedAt: z.string(),
    productName: z.string().optional(),
    basePrice: z.string().optional(),
    discountFromPrice: z.string().optional(),
    macroSectorId: z.string().optional(),
    macroSectorLabel: z.string().optional(),
    sectorLevel: z.enum(['macro', 'granular']).optional(),
    wooProductId: z.number().optional(),
    adminPaymentId: z.number().optional(),
  }),
});

function getEncryptionSecret() {
  const secret = process.env.CHECKOUT_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
  if (secret.length < 16) {
    throw new Error('CHECKOUT_ENCRYPTION_KEY must be at least 16 characters');
  }
  return secret;
}

function getKey() {
  const secret = getEncryptionSecret();
  return createHash('sha256').update(secret).digest();
}

function encryptOrder(order: any): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(order), 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, ciphertext]);
  
  return combined.toString('base64url');
}

// POST /checkout/encrypt - Encrypt checkout order
checkoutEncryptionRouter.post('/encrypt', async (req, res) => {
  try {
    const { order } = req.body;
    
    if (!order) {
      return res.status(400).json({ error: 'Order data is required' });
    }

    // Validate order schema
    const validatedOrder = orderSchema.parse(order);
    
    // Encrypt the order
    const token = encryptOrder(validatedOrder);
    
    res.json({ 
      success: true, 
      token,
      checkoutUrl: `${process.env.CHECKOUT_BASE_URL || 'https://allyoucanleads.com'}/checkout?order=${token}`
    });
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid order data', 
        details: error.errors 
      });
    }
    
    console.error('Checkout encryption error:', error);
    res.status(500).json({ 
      error: 'Failed to encrypt checkout order',
      message: error.message 
    });
  }
});
