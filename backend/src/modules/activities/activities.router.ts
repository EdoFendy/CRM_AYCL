import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { createActivity, deleteActivity, listActivities, updateActivity, getActivity } from './activities.service.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const activitiesRouter = Router();

activitiesRouter.use(requireAuth);

const baseSchema = z.object({
  type: z.enum(['email', 'call', 'meeting', 'note', 'system']),
  company_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  opportunity_id: z.string().uuid().nullable().optional(),
  content: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  occurred_at: z.string().nullable().optional()
});

activitiesRouter.get('/', async (req, res) => {
  const activities = await listActivities(req.query);
  res.json(activities);
});

activitiesRouter.post('/', async (req, res) => {
  const payload = baseSchema.parse(req.body);
  const activity = await createActivity(payload, req.user!.id);
  res.status(201).json(activity);
});

activitiesRouter.get('/:id', async (req, res) => {
  const activity = await getActivity(req.params.id);
  res.json(activity);
});

activitiesRouter.patch('/:id', async (req, res) => {
  const payload = baseSchema.partial().parse(req.body);
  const activity = await updateActivity(req.params.id, payload, req.user!.id);
  res.json(activity);
});

activitiesRouter.delete('/:id', async (req, res) => {
  await deleteActivity(req.params.id, req.user!.id);
  res.status(204).send();
});

activitiesRouter.use((_req, _res, next) => {
  next(new HttpError(404, 'ACTIVITY_ROUTE_NOT_FOUND', 'Route not found'));
});
