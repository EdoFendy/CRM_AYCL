import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import {
  createOpportunity,
  deleteOpportunity,
  getOpportunity,
  listOpportunities,
  moveOpportunityStage,
  opportunityMetrics,
  updateOpportunity
} from './opportunities.service.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const opportunitiesRouter = Router();

opportunitiesRouter.use(requireAuth);

opportunitiesRouter.get('/', async (req, res) => {
  const opportunities = await listOpportunities(req.query);
  res.json(opportunities);
});

opportunitiesRouter.post('/', async (req, res) => {
  const schema = z.object({
    company_id: z.string().uuid(),
    title: z.string().min(3),
    value: z.number(),
    currency: z.string().length(3).optional(),
    stage: z.string().min(2),
    probability: z.number().min(0).max(100).optional(),
    owner_id: z.string().uuid().optional(),
    expected_close_date: z.string().optional(),
    source: z.string().optional(),
    referral_id: z.string().uuid().optional()
  });
  const payload = schema.parse(req.body);
  const opportunity = await createOpportunity(payload, req.user!.id);
  res.status(201).json(opportunity);
});

opportunitiesRouter.get('/metrics', async (req, res) => {
  const metrics = await opportunityMetrics(req.query);
  res.json(metrics);
});

opportunitiesRouter.get('/:id', async (req, res) => {
  const opportunity = await getOpportunity(req.params.id);
  res.json(opportunity);
});

opportunitiesRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    title: z.string().min(3).optional(),
    value: z.number().optional(),
    currency: z.string().length(3).optional(),
    stage: z.string().optional(),
    probability: z.number().min(0).max(100).optional(),
    owner_id: z.string().uuid().nullable().optional(),
    expected_close_date: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    referral_id: z.string().uuid().nullable().optional()
  });
  const payload = schema.parse(req.body);
  const opportunity = await updateOpportunity(req.params.id, payload, req.user!.id);
  res.json(opportunity);
});

opportunitiesRouter.delete('/:id', async (req, res) => {
  await deleteOpportunity(req.params.id, req.user!.id);
  res.status(204).send();
});

opportunitiesRouter.patch('/:id/move-stage', async (req, res) => {
  const schema = z.object({ stage: z.string().min(2), next_step: z.string().min(3) });
  const payload = schema.parse(req.body);
  const opportunity = await moveOpportunityStage(req.params.id, payload.stage, req.user!.id, payload.next_step);
  res.json(opportunity);
});

opportunitiesRouter.use((_req, _res, next) => {
  next(new HttpError(404, 'OPPORTUNITY_ROUTE_NOT_FOUND', 'Route not found'));
});
