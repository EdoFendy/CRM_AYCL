import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

export const filesRouter = Router();

filesRouter.use(requireAuth);

filesRouter.get('/', async (req, res) => {
  const entityFilters = ['company_id', 'contact_id', 'opportunity_id', 'contract_id'];
  const conditions: string[] = [];
  const params: unknown[] = [];
  entityFilters.forEach((key) => {
    const value = req.query[key];
    if (typeof value === 'string') {
      params.push(value);
      conditions.push(`${key} = $${params.length}`);
    }
  });
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT id, name, mime, size, storage_url, tags, created_by, created_at FROM files ${where} ORDER BY created_at DESC`, params);
  res.json(rows);
});

filesRouter.post('/', async (req, res) => {
  const schema = z.object({
    name: z.string(),
    mime: z.string(),
    size: z.number().int(),
    storage_url: z.string().url(),
    tags: z.array(z.string()).optional(),
    company_id: z.string().uuid().nullable().optional(),
    contact_id: z.string().uuid().nullable().optional(),
    opportunity_id: z.string().uuid().nullable().optional(),
    contract_id: z.string().uuid().nullable().optional()
  });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO files (name, mime, size, storage_url, tags, company_id, contact_id, opportunity_id, contract_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, name, mime, size, storage_url, tags, created_at`,
    [
      payload.name,
      payload.mime,
      payload.size,
      payload.storage_url,
      payload.tags ?? [],
      payload.company_id ?? null,
      payload.contact_id ?? null,
      payload.opportunity_id ?? null,
      payload.contract_id ?? null,
      req.user!.id
    ]
  );
  const file = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'file.create', entity: 'file', entityId: file.id, afterState: file });
  res.status(201).json(file);
});

filesRouter.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM files WHERE id = $1', [req.params.id]);
  await recordAuditLog({ actorId: req.user!.id, action: 'file.delete', entity: 'file', entityId: req.params.id });
  res.status(204).send();
});
