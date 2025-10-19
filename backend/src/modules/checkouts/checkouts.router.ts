import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const checkoutsRouter = Router();

checkoutsRouter.use(requireAuth);

checkoutsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM checkouts ORDER BY created_at DESC LIMIT 100');
  res.json(rows);
});

checkoutsRouter.post('/', async (req, res) => {
  const schema = z.object({
    session: z.string().min(5),
    referral_id: z.string().uuid().nullable().optional(),
    opportunity_id: z.string().uuid().nullable().optional(),
    status: z.string().default('pending')
  });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO checkouts (session, referral_id, opportunity_id, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [payload.session, payload.referral_id ?? null, payload.opportunity_id ?? null, payload.status]
  );
  res.status(201).json(rows[0]);
});

checkoutsRouter.patch('/:id', async (req, res) => {
  const schema = z.object({ status: z.string(), referral_id: z.string().uuid().nullable().optional(), opportunity_id: z.string().uuid().nullable().optional() });
  const payload = schema.parse(req.body);
  const fields: string[] = [];
  const params: unknown[] = [];
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      params.push(value);
      fields.push(`${key} = $${params.length}`);
    }
  });
  if (!fields.length) {
    throw new HttpError(400, 'NO_UPDATE', 'No update fields provided');
  }
  params.push(req.params.id);
  const { rows } = await pool.query(`UPDATE checkouts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`, params);
  res.json(rows[0]);
});
