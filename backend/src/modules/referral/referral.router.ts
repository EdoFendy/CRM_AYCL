import { Router } from 'express';
import { z } from 'zod';
import * as referralService from './referral.service.js';

export const referralRouter = Router();

// GET /referral/me - Get current user's referral link
referralRouter.get('/me', async (req, res) => {
  try {
    const referralLink = await referralService.getUserReferralLink(req.user!.id);
    if (!referralLink) {
      return res.status(404).json({ error: 'Referral link not found' });
    }
    res.json(referralLink);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /referral/create - Create referral link for current user
referralRouter.post('/create', async (req, res) => {
  try {
    const schema = z.object({
      base_url: z.string().url().optional()
    });

    const data = schema.parse(req.body);
    const referralLink = await referralService.createReferralLink(
      req.user!.id,
      data.base_url
    );

    res.status(201).json(referralLink);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /referral/deactivate - Deactivate current user's referral link
referralRouter.delete('/deactivate', async (req, res) => {
  try {
    await referralService.deactivateReferralLink(req.user!.id, req.user!.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Referral link not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /referral/stats - Get referral statistics
referralRouter.get('/stats', async (req, res) => {
  try {
    const stats = await referralService.getReferralStats(req.user!.id);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /referral/validate/:code - Validate referral code (public endpoint)
referralRouter.get('/validate/:code', async (req, res) => {
  try {
    const referral = await referralService.getReferralByCode(req.params.code);
    if (!referral) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }
    
    res.json({
      valid: true,
      seller_name: referral.full_name,
      checkout_url: referral.checkout_url
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
