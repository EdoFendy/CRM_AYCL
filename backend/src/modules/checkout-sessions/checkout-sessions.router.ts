import { Router } from 'express';
import { z } from 'zod';
import * as checkoutSessionsService from './checkout-sessions.service.js';

export const checkoutSessionsRouter = Router();

// POST /checkout-sessions - Create new checkout session
checkoutSessionsRouter.post('/', async (req, res) => {
  try {
    const schema = z.object({
      request_id: z.string().uuid(),
      checkout_url: z.string().url(),
      woo_product_id: z.number().int().positive().optional(),
      woo_payment_url: z.string().url().optional(),
      expires_at: z.string().datetime()
    });

    const data = schema.parse(req.body);
    const session = await checkoutSessionsService.createCheckoutSession(data);

    res.status(201).json(session);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /checkout-sessions/:sessionToken - Get checkout session
checkoutSessionsRouter.get('/:sessionToken', async (req, res) => {
  try {
    const session = await checkoutSessionsService.getCheckoutSession(req.params.sessionToken);
    if (!session) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /checkout-sessions/:sessionToken - Update checkout session
checkoutSessionsRouter.patch('/:sessionToken', async (req, res) => {
  try {
    const schema = z.object({
      status: z.enum(['active', 'completed', 'expired', 'cancelled']).optional(),
      woo_payment_url: z.string().url().optional()
    });

    const data = schema.parse(req.body);
    const session = await checkoutSessionsService.updateCheckoutSession(
      req.params.sessionToken,
      data,
      req.user!.id
    );

    res.json(session);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error.message === 'Checkout session not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /checkout-sessions/:sessionToken/expire - Expire session
checkoutSessionsRouter.post('/:sessionToken/expire', async (req, res) => {
  try {
    await checkoutSessionsService.expireSession(req.params.sessionToken, req.user!.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Checkout session not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /checkout-sessions/:sessionToken/complete - Complete session
checkoutSessionsRouter.post('/:sessionToken/complete', async (req, res) => {
  try {
    await checkoutSessionsService.completeSession(req.params.sessionToken, req.user!.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Checkout session not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /checkout-sessions/seller/:sellerId - Get active sessions for seller
checkoutSessionsRouter.get('/seller/:sellerId', async (req, res) => {
  try {
    const sessions = await checkoutSessionsService.getActiveSessionsForSeller(req.params.sellerId);
    res.json({ data: sessions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
