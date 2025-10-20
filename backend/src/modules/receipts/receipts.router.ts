import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

export const receiptsRouter = Router();

receiptsRouter.use(requireAuth);

receiptsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM receipts ORDER BY created_at DESC LIMIT 100');
  res.json({ data: rows });
});

receiptsRouter.post('/', async (req, res) => {
  const schema = z.object({
    invoice_id: z.string().uuid().optional(),
    status: z.string(),
    provider: z.string().optional(),
    amount: z.number(),
    currency: z.string().length(3).optional(),
    issued_at: z.string().optional(),
    pdf_url: z.string().url().optional()
  });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO receipts (invoice_id, status, provider, amount, currency, issued_at, pdf_url)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7)
     RETURNING *`,
    [payload.invoice_id ?? null, payload.status, payload.provider ?? null, payload.amount, payload.currency ?? 'EUR', payload.issued_at ?? null, payload.pdf_url ?? null]
  );
  const receipt = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'receipt.create', entity: 'receipt', entityId: receipt.id, afterState: receipt });
  res.status(201).json(receipt);
});
