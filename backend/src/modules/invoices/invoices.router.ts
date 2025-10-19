import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

invoicesRouter.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100');
  res.json(rows);
});

invoicesRouter.post('/', async (req, res) => {
  const schema = z.object({
    contract_id: z.string().uuid().optional(),
    number: z.string().optional(),
    status: z.string().default('draft'),
    provider: z.string().optional(),
    amount: z.number(),
    currency: z.string().length(3).optional(),
    issued_at: z.string().optional(),
    due_date: z.string().optional(),
    metadata: z.record(z.any()).optional()
  });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO invoices (contract_id, number, status, provider, amount, currency, issued_at, due_date, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9::jsonb)
     RETURNING *`,
    [
      payload.contract_id ?? null,
      payload.number ?? null,
      payload.status,
      payload.provider ?? null,
      payload.amount,
      payload.currency ?? 'EUR',
      payload.issued_at ?? null,
      payload.due_date ?? null,
      JSON.stringify(payload.metadata ?? {})
    ]
  );
  const invoice = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'invoice.create', entity: 'invoice', entityId: invoice.id, afterState: invoice });
  res.status(201).json(invoice);
});

invoicesRouter.patch('/:id', async (req, res) => {
  const schema = z.object({ status: z.string().optional(), provider: z.string().nullable().optional(), pdf_url: z.string().url().nullable().optional(), metadata: z.record(z.any()).nullable().optional() });
  const payload = schema.parse(req.body);
  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      params.push(key === 'metadata' ? JSON.stringify(value) : value);
      fields.push(`${key} = $${params.length}${key === 'metadata' ? '::jsonb' : ''}`);
    }
  }
  if (fields.length === 0) {
    throw new HttpError(400, 'NO_UPDATE', 'No fields to update');
  }
  params.push(req.params.id);
  const { rows } = await pool.query(`UPDATE invoices SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`, params);
  const invoice = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'invoice.update', entity: 'invoice', entityId: invoice.id, afterState: invoice });
  res.json(invoice);
});
