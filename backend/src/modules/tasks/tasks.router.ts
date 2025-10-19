import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { completeTask, createTask, deleteTask, getTask, listTasks, updateTask } from './tasks.service.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get('/', async (req, res) => {
  const tasks = await listTasks(req.query);
  res.json(tasks);
});

tasksRouter.post('/', async (req, res) => {
  const schema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    due_date: z.string().optional(),
    owner_id: z.string().uuid().optional(),
    company_id: z.string().uuid().optional(),
    contact_id: z.string().uuid().optional(),
    opportunity_id: z.string().uuid().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    metadata: z.record(z.any()).optional()
  });
  const payload = schema.parse(req.body);
  const task = await createTask(payload, req.user!.id);
  res.status(201).json(task);
});

tasksRouter.get('/:id', async (req, res) => {
  const task = await getTask(req.params.id);
  res.json(task);
});

tasksRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    owner_id: z.string().uuid().nullable().optional(),
    company_id: z.string().uuid().nullable().optional(),
    contact_id: z.string().uuid().nullable().optional(),
    opportunity_id: z.string().uuid().nullable().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    metadata: z.record(z.any()).nullable().optional()
  });
  const payload = schema.parse(req.body);
  const task = await updateTask(req.params.id, payload, req.user!.id);
  res.json(task);
});

tasksRouter.patch('/:id/complete', async (req, res) => {
  const task = await completeTask(req.params.id, req.user!.id);
  res.json(task);
});

tasksRouter.delete('/:id', async (req, res) => {
  await deleteTask(req.params.id, req.user!.id);
  res.status(204).send();
});

tasksRouter.use((_req, _res, next) => {
  next(new HttpError(404, 'TASK_ROUTE_NOT_FOUND', 'Route not found'));
});
