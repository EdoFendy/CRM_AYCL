import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const docTemplatesRouter = Router();

docTemplatesRouter.use(requireAuth);

docTemplatesRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, name, type, description, metadata, created_by, created_at, updated_at FROM doc_templates ORDER BY created_at DESC');
  res.json(rows);
});

docTemplatesRouter.post('/', async (req, res) => {
  const schema = z.object({
    name: z.string().min(3),
    type: z.string().min(2),
    description: z.string().optional(),
    body: z.string().min(10),
    metadata: z.record(z.any()).optional()
  });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO doc_templates (name, type, description, body, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING id, name, type, description, metadata, created_by, created_at, updated_at`,
    [payload.name, payload.type, payload.description ?? null, payload.body, JSON.stringify(payload.metadata ?? {}), req.user!.id]
  );
  const template = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'docTemplate.create', entity: 'doc_template', entityId: template.id, afterState: template });
  res.status(201).json(template);
});

docTemplatesRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    name: z.string().min(3).optional(),
    type: z.string().min(2).optional(),
    description: z.string().nullable().optional(),
    body: z.string().min(10).optional(),
    metadata: z.record(z.any()).nullable().optional()
  });
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
  const { rows } = await pool.query(
    `UPDATE doc_templates SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING id, name, type, description, metadata, created_by, created_at, updated_at`,
    params
  );
  const template = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'docTemplate.update', entity: 'doc_template', entityId: template.id, afterState: template });
  res.json(template);
});

docTemplatesRouter.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM doc_templates WHERE id = $1', [req.params.id]);
  await recordAuditLog({ actorId: req.user!.id, action: 'docTemplate.delete', entity: 'doc_template', entityId: req.params.id });
  res.status(204).send();
});
