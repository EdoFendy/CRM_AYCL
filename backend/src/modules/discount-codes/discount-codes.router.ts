import { Router } from 'express';
import { z } from 'zod';
import * as discountCodesService from './discount-codes.service.js';

export const discountCodesRouter = Router();

// GET /discount-codes - List all discount codes
discountCodesRouter.get('/', async (req, res) => {
  try {
    const result = await discountCodesService.listDiscountCodes(req.query);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /discount-codes/:id - Get single discount code
discountCodesRouter.get('/:id', async (req, res) => {
  try {
    const discountCode = await discountCodesService.getDiscountCode(req.params.id);
    if (!discountCode) {
      return res.status(404).json({ error: 'Discount code not found' });
    }
    res.json(discountCode);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /discount-codes/validate - Validate a discount code
discountCodesRouter.post('/validate', async (req, res) => {
  try {
    const schema = z.object({
      code: z.string().min(1),
      purchase_amount: z.number().optional()
    });

    const data = schema.parse(req.body);
    const result = await discountCodesService.validateDiscountCode(
      data.code,
      data.purchase_amount
    );

    if (!result.valid) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /discount-codes - Create new discount code
discountCodesRouter.post('/', async (req, res) => {
  try {
    const schema = z.object({
      code: z.string().min(3).max(50),
      discount_type: z.enum(['percentage', 'fixed']),
      discount_value: z.number().positive(),
      currency: z.string().default('EUR'),
      expires_at: z.string().datetime().optional(),
      max_uses: z.number().int().positive().optional(),
      applicable_products: z.array(z.string()).optional(),
      applicable_to: z.enum(['all', 'specific']).default('all'),
      min_purchase_amount: z.number().positive().optional()
    });

    const data = schema.parse(req.body);
    
    // Check if code already exists
    const existing = await discountCodesService.getDiscountCodeByCode(data.code);
    if (existing) {
      return res.status(409).json({ error: 'Codice sconto già esistente' });
    }

    const discountCode = await discountCodesService.createDiscountCode(
      data,
      req.user!.id
    );

    res.status(201).json(discountCode);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /discount-codes/:id - Update discount code
discountCodesRouter.patch('/:id', async (req, res) => {
  try {
    const schema = z.object({
      discount_value: z.number().positive().optional(),
      expires_at: z.string().datetime().optional(),
      max_uses: z.number().int().positive().optional(),
      is_active: z.boolean().optional()
    });

    const data = schema.parse(req.body);
    const discountCode = await discountCodesService.updateDiscountCode(
      req.params.id,
      data,
      req.user!.id
    );

    res.json(discountCode);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error.message === 'Discount code not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /discount-codes/:id - Delete discount code
discountCodesRouter.delete('/:id', async (req, res) => {
  try {
    await discountCodesService.deleteDiscountCode(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Discount code not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

