import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

const baseSchema = z.object({
  requester_id: z.string().uuid().optional(),
  subject: z.string().min(3),
  body: z.string().optional(),
  status: z.string().default('open'),
  priority: z.string().default('normal'),
  assignee_id: z.string().uuid().nullable().optional()
});

ticketsRouter.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 100');
  res.json(rows);
});

ticketsRouter.post('/', async (req, res) => {
  const payload = baseSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO tickets (requester_id, subject, body, status, priority, assignee_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [payload.requester_id ?? req.user!.id, payload.subject, payload.body ?? null, payload.status, payload.priority, payload.assignee_id ?? null]
  );
  const ticket = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'ticket.create', entity: 'ticket', entityId: ticket.id, afterState: ticket });
  res.status(201).json(ticket);
});

ticketsRouter.patch('/:id', async (req, res) => {
  const schema = baseSchema.partial();
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
    throw new HttpError(400, 'NO_UPDATE', 'No fields provided');
  }
  params.push(req.params.id);
  const { rows } = await pool.query(`UPDATE tickets SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`, params);
  res.json(rows[0]);
});

ticketsRouter.post('/:id/reply', async (req, res) => {
  const schema = z.object({ body: z.string().min(1) });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO ticket_messages (ticket_id, sender_id, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [req.params.id, req.user!.id, payload.body]
  );
  res.status(201).json(rows[0]);
});

ticketsRouter.patch('/:id/close', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE tickets SET status = 'closed', closed_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  res.json(rows[0]);
});
