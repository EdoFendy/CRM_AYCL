import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

export const webhooksRouter = Router();

webhooksRouter.use(requireAuth);

webhooksRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM webhooks ORDER BY created_at DESC');
  res.json({ data: rows });
});

webhooksRouter.post('/', async (req, res) => {
  const schema = z.object({ name: z.string(), url: z.string().url(), event: z.string(), secret: z.string().optional() });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO webhooks (name, url, event, secret, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [payload.name, payload.url, payload.event, payload.secret ?? null, req.user!.id]
  );
  await recordAuditLog({ actorId: req.user!.id, action: 'webhook.create', entity: 'webhook', entityId: rows[0].id, afterState: rows[0] });
  res.status(201).json(rows[0]);
});

webhooksRouter.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM webhooks WHERE id = $1', [req.params.id]);
  await recordAuditLog({ actorId: req.user!.id, action: 'webhook.delete', entity: 'webhook', entityId: req.params.id });
  res.status(204).send();
});
