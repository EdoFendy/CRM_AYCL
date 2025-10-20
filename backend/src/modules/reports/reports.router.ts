import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, scope, status, file_url, created_at, created_by FROM reports ORDER BY created_at DESC LIMIT 100'
  );
  res.json({ data: rows });
});

reportsRouter.post('/export', async (req, res) => {
  const schema = z.object({ scope: z.string(), filters: z.record(z.any()).default({}), format: z.enum(['csv', 'xlsx', 'pdf']).default('csv') });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO reports (scope, filters, status, file_url, created_by)
     VALUES ($1, $2::jsonb, 'processing', NULL, $3)
     RETURNING *`,
    [payload.scope, JSON.stringify(payload.filters), req.user!.id]
  );
  await recordAuditLog({ actorId: req.user!.id, action: 'report.export', entity: 'report', entityId: rows[0].id, metadata: { format: payload.format } });
  res.status(202).json({ reportId: rows[0].id, todo: 'Implement async job to generate report file' });
});

reportsRouter.get('/:id/status', async (req, res) => {
  const { rows } = await pool.query('SELECT id, status, file_url FROM reports WHERE id = $1', [req.params.id]);
  res.json(rows[0] ?? null);
});

reportsRouter.get('/:id/download', async (req, res) => {
  const { rows } = await pool.query('SELECT file_url FROM reports WHERE id = $1', [req.params.id]);
  const report = rows[0];
  if (!report || !report.file_url) {
    res.status(404).json({ code: 'REPORT_NOT_READY', message: 'Report not ready yet', correlationId: req.correlationId });
    return;
  }
  res.json({ fileUrl: report.file_url });
});
