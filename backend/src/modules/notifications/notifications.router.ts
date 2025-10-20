import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user!.id]);
  res.json({ data: rows });
});

notificationsRouter.patch('/', async (req, res) => {
  const schema = z.object({ ids: z.array(z.string().uuid()), read: z.boolean().default(true) });
  const payload = schema.parse(req.body);
  const { rowCount } = await pool.query(
    'UPDATE notifications SET read_at = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE user_id = $1 AND id = ANY($3::uuid[])',
    [req.user!.id, payload.read, payload.ids]
  );
  res.json({ updated: rowCount });
});
