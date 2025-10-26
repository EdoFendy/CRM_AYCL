import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import * as service from './bundles.service.js';

export const bundlesRouter = Router();

bundlesRouter.use(requireAuth);

const bundleProductSchema = z.object({
  woo_product_id: z.number().optional(),
  product_name: z.string().min(1),
  product_sku: z.string().optional(),
  product_description: z.string().optional(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  product_discount_type: z.enum(['percentage', 'fixed', 'none']).optional(),
  product_discount_value: z.number().optional()
});

const createBundleSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  company_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  seller_user_id: z.string().uuid().optional(),
  discount_type: z.enum(['percentage', 'fixed', 'none']),
  discount_value: z.number().default(0),
  currency: z.string().default('EUR'),
  includes_upsell: z.boolean().default(false),
  upsell_name: z.string().optional(),
  upsell_description: z.string().optional(),
  upsell_price: z.number().optional(),
  valid_until: z.string().optional(),
  products: z.array(bundleProductSchema).min(1)
});

const updateBundleSchema = createBundleSchema.partial();

// GET /bundles - Lista bundles
bundlesRouter.get('/', async (req, res) => {
  try {
    const filters = {
      seller_user_id: req.query.seller_user_id as string,
      company_id: req.query.company_id as string,
      contact_id: req.query.contact_id as string,
      status: req.query.status as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };
    
    const bundles = await service.listBundles(filters);
    res.json({ data: bundles });
  } catch (error: any) {
    console.error('Errore lista bundles:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /bundles - Crea bundle
bundlesRouter.post('/', async (req, res) => {
  try {
    const data = createBundleSchema.parse(req.body);
    
    // Se è un seller, forza seller_user_id
    if (req.user?.role === 'seller') {
      data.seller_user_id = req.user.id;
    }
    
    const bundle = await service.createBundle(data, req.user!.id);
    res.status(201).json(bundle);
  } catch (error: any) {
    console.error('Errore creazione bundle:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Dati non validi', details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// GET /bundles/:id - Dettaglio bundle
bundlesRouter.get('/:id', async (req, res) => {
  try {
    const bundle = await service.getBundle(req.params.id);
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle non trovato' });
    }
    
    res.json(bundle);
  } catch (error: any) {
    console.error('Errore dettaglio bundle:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /bundles/token/:token - Ottieni bundle da checkout token
bundlesRouter.get('/token/:token', async (req, res) => {
  try {
    const bundle = await service.getBundleByToken(req.params.token);
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle non trovato' });
    }
    
    res.json(bundle);
  } catch (error: any) {
    console.error('Errore bundle by token:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /bundles/:id - Aggiorna bundle
bundlesRouter.put('/:id', async (req, res) => {
  try {
    const data = updateBundleSchema.parse(req.body);
    const bundle = await service.updateBundle(req.params.id, data, req.user!.id);
    res.json(bundle);
  } catch (error: any) {
    console.error('Errore aggiornamento bundle:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Dati non validi', details: error.errors });
    } else if (error.message === 'Bundle not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// DELETE /bundles/:id - Elimina bundle
bundlesRouter.delete('/:id', async (req, res) => {
  try {
    await service.deleteBundle(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Errore eliminazione bundle:', error);
    if (error.message === 'Bundle not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// POST /bundles/:id/checkout-url - Genera checkout URL
bundlesRouter.post('/:id/checkout-url', async (req, res) => {
  try {
    const baseUrl = req.body.base_url || 'https://allyoucanleads.com';
    const checkoutUrl = await service.generateBundleCheckoutUrl(req.params.id, baseUrl);
    res.json({ checkout_url: checkoutUrl });
  } catch (error: any) {
    console.error('Errore generazione checkout URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /bundles/:id/woo-product - Crea prodotto WooCommerce
bundlesRouter.post('/:id/woo-product', async (req, res) => {
  try {
    const wooProduct = await service.createBundleWooProduct(req.params.id);
    res.json({ woo_product: wooProduct });
  } catch (error: any) {
    console.error('Errore creazione prodotto WooCommerce:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /bundles/:id/status - Aggiorna status
bundlesRouter.patch('/:id/status', async (req, res) => {
  try {
    const schema = z.object({
      status: z.enum(['draft', 'active', 'sent', 'accepted', 'expired', 'cancelled'])
    });
    
    const { status } = schema.parse(req.body);
    const bundle = await service.updateBundleStatus(req.params.id, status, req.user!.id);
    res.json(bundle);
  } catch (error: any) {
    console.error('Errore aggiornamento status:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Status non valido', details: error.errors });
    } else if (error.message === 'Bundle not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});
