import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { logger } from '../../utils/logger.js';

export const signaturesRouter = Router();

const callbackSchema = z.object({
  contract_id: z.string().uuid(),
  signer_email: z.string().email(),
  status: z.enum(['pending', 'signed', 'declined']),
  signed_at: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional()
});

signaturesRouter.post('/callback', async (req, res) => {
  const payload = callbackSchema.parse(req.body);
  await pool.query(
    `UPDATE signatures SET status = $1, signed_at = COALESCE($2::timestamptz, signed_at), updated_at = NOW()
     WHERE contract_id = $3 AND signer_email = $4`,
    [payload.status, payload.signed_at ?? null, payload.contract_id, payload.signer_email]
  );
  await recordAuditLog({
    action: 'signature.callback',
    entity: 'contract',
    entityId: payload.contract_id,
    metadata: payload.metadata ?? {},
    afterState: { status: payload.status, signerEmail: payload.signer_email }
  });
  if (payload.status === 'signed') {
    await pool.query('UPDATE contracts SET status = $1, signed_at = NOW() WHERE id = $2', ['Signed', payload.contract_id]);
  }
  logger.info({ contractId: payload.contract_id, status: payload.status }, 'Signature callback processed');
  res.json({ received: true });
});

export const signaturesRouterPublic = signaturesRouter;
