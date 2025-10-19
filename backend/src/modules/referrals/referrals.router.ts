import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

export const referralsRouter = Router();

referralsRouter.use(requireAuth);

referralsRouter.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM referrals ORDER BY created_at DESC');
  res.json(rows);
});

referralsRouter.post('/', async (req, res) => {
  const schema = z.object({ code: z.string().min(4), owner_user_id: z.string().uuid().optional() });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO referrals (code, owner_user_id)
     VALUES ($1, $2)
     RETURNING *`,
    [payload.code, payload.owner_user_id ?? req.user!.id]
  );
  const referral = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'referral.create', entity: 'referral', entityId: referral.id, afterState: referral });
  res.status(201).json(referral);
});

referralsRouter.get('/stats', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT owner_user_id, COUNT(*) as codes
     FROM referrals
     GROUP BY owner_user_id`
  );
  res.json(rows);
});
