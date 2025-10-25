import { Router } from 'express';
import { z } from 'zod';
import * as bundlesService from './bundles.service.js';

export const bundlesRouter = Router();

const bundleProductSchema = z.object({
  product_id: z.string().uuid().optional(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  total: z.number().positive()
});

// GET /bundles - List all bundles
bundlesRouter.get('/', async (req, res) => {
  try {
    const result = await bundlesService.listBundles(req.query);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /bundles/:id - Get single bundle
bundlesRouter.get('/:id', async (req, res) => {
  try {
    const bundle = await bundlesService.getBundle(req.params.id);
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    res.json(bundle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bundles - Create new bundle
bundlesRouter.post('/', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(3),
      description: z.string().optional(),
      products: z.array(bundleProductSchema).min(1),
      discount_type: z.enum(['percentage', 'fixed']),
      discount_value: z.number().positive(),
      currency: z.string().default('EUR'),
      valid_from: z.string().datetime().optional(),
      valid_until: z.string().datetime().optional(),
      includes_upsell: z.boolean().default(false),
      upsell_details: z.object({
        name: z.string(),
        description: z.string(),
        price: z.number().positive()
      }).optional(),
      company_id: z.string().uuid().optional()
    });

    const data = schema.parse(req.body);
    const bundle = await bundlesService.createBundle(data, req.user!.id);

    res.status(201).json(bundle);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /bundles/:id - Update bundle
bundlesRouter.patch('/:id', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(3).optional(),
      description: z.string().optional(),
      products: z.array(bundleProductSchema).min(1).optional(),
      discount_value: z.number().positive().optional(),
      valid_until: z.string().datetime().optional(),
      status: z.enum(['active', 'inactive', 'expired']).optional()
    });

    const data = schema.parse(req.body);
    const bundle = await bundlesService.updateBundle(
      req.params.id,
      data,
      req.user!.id
    );

    res.json(bundle);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error.message === 'Bundle not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /bundles/:id - Delete bundle
bundlesRouter.delete('/:id', async (req, res) => {
  try {
    await bundlesService.deleteBundle(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Bundle not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /bundles/:id/generate-pdf - Generate bundle PDF
bundlesRouter.post('/:id/generate-pdf', async (req, res) => {
  try {
    const result = await bundlesService.generateBundlePDF(req.params.id);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Bundle not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

