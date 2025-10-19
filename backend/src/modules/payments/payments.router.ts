import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { logger } from '../../utils/logger.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const paymentsRouter = Router();

paymentsRouter.post('/checkout', requireAuth, async (req, res) => {
  const schema = z.object({ invoice_id: z.string().uuid().optional(), contract_id: z.string().uuid().optional(), amount: z.number(), currency: z.string().length(3).optional(), provider: z.string().optional() });
  const payload = schema.parse(req.body);
  const sessionId = `sess_${crypto.randomUUID()}`;
  await pool.query(
    `INSERT INTO checkouts (session, referral_id, opportunity_id, status)
     VALUES ($1, NULL, NULL, 'pending')`,
    [sessionId]
  );
  await recordAuditLog({ actorId: req.user!.id, action: 'payments.checkout.create', entity: 'checkout', entityId: sessionId, metadata: payload });
  res.status(201).json({ sessionId, paymentUrl: `https://payments.example.com/checkout/${sessionId}`, todo: 'Integrate provider session creation' });
});

paymentsRouter.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
  if (!rows[0]) {
    throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
  }
  res.json(rows[0]);
});

const webhookSchema = z.object({ provider: z.string(), event: z.string(), data: z.record(z.any()) });

paymentsRouter.post('/webhook', async (req, res) => {
  const payload = webhookSchema.parse(req.body);
  await pool.query(
    `INSERT INTO webhook_inbound_logs (provider, event, payload)
     VALUES ($1, $2, $3::jsonb)`,
    [payload.provider, payload.event, JSON.stringify(payload.data)]
  );
  logger.info({ provider: payload.provider, event: payload.event }, 'Payment webhook received');
  res.json({ received: true, todo: 'Implement reconciliation logic' });
});
