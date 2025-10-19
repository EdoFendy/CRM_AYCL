import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { recordAuditLog } from '../../services/auditService.js';

export const docsRouter = Router();

docsRouter.use(requireAuth);

docsRouter.post('/render', async (req, res) => {
  const schema = z.object({ template_id: z.string().uuid(), data: z.record(z.any()) });
  const payload = schema.parse(req.body);
  await recordAuditLog({ actorId: req.user!.id, action: 'docs.render', entity: 'doc_template', entityId: payload.template_id, metadata: payload.data });
  res.json({
    pdfUrl: null,
    todo: 'Integrate HTML->PDF rendering provider',
    templateId: payload.template_id
  });
});
