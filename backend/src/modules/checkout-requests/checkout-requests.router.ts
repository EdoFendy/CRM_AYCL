import { Router } from 'express';
import { z } from 'zod';
import * as checkoutRequestsService from './checkout-requests.service.js';

export const checkoutRequestsRouter = Router();

// GET /checkout-requests - List checkout requests
checkoutRequestsRouter.get('/', async (req, res) => {
  try {
    const result = await checkoutRequestsService.listCheckoutRequests(req.query);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /checkout-requests/:id - Get single checkout request
checkoutRequestsRouter.get('/:id', async (req, res) => {
  try {
    const request = await checkoutRequestsService.getCheckoutRequest(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Checkout request not found' });
    }
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /checkout-requests - Create new checkout request (public endpoint)
checkoutRequestsRouter.post('/', async (req, res) => {
  try {
    const schema = z.object({
      referral_code: z.string().min(1),
      customer_name: z.string().min(1),
      customer_email: z.string().email(),
      customer_phone: z.string().optional(),
      company_name: z.string().optional(),
      request_type: z.enum(['drive_test', 'custom', 'bundle']),
      product_data: z.record(z.any()),
      pricing_data: z.record(z.any()),
      expires_at: z.string().datetime().optional(),
      notes: z.string().optional()
    });

    const data = schema.parse(req.body);
    const request = await checkoutRequestsService.createCheckoutRequest(data);

    res.status(201).json(request);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /checkout-requests/:id - Update checkout request
checkoutRequestsRouter.patch('/:id', async (req, res) => {
  try {
    const schema = z.object({
      status: z.enum(['pending', 'accepted', 'rejected', 'expired']).optional(),
      seller_id: z.string().uuid().optional(),
      notes: z.string().optional()
    });

    const data = schema.parse(req.body);
    const request = await checkoutRequestsService.updateCheckoutRequest(
      req.params.id,
      data,
      req.user!.id
    );

    res.json(request);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error.message === 'Checkout request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /checkout-requests/:id - Delete checkout request
checkoutRequestsRouter.delete('/:id', async (req, res) => {
  try {
    await checkoutRequestsService.deleteCheckoutRequest(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Checkout request not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /checkout-requests/seller/:sellerId - Get requests for specific seller
checkoutRequestsRouter.get('/seller/:sellerId', async (req, res) => {
  try {
    const requests = await checkoutRequestsService.getRequestsForSeller(req.params.sellerId);
    res.json({ data: requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /checkout-requests/referral/:referralCode/pending - Get pending requests for referral
checkoutRequestsRouter.get('/referral/:referralCode/pending', async (req, res) => {
  try {
    const requests = await checkoutRequestsService.getPendingRequestsForReferral(req.params.referralCode);
    res.json({ data: requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
