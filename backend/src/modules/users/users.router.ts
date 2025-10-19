import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../../middlewares/auth.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import {
  createRole,
  createTeam,
  createUser,
  deleteUser,
  getUser,
  listRoles,
  listTeams,
  listUsers,
  resetUserPassword,
  updateUser
} from './users.service.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', requireRoles(['admin']), async (req, res) => {
  const result = await listUsers(req.query);
  res.json(result);
});

usersRouter.post('/', requireRoles(['admin']), async (req, res) => {
  const schema = z.object({
    code11: z.string().length(11),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'seller', 'reseller', 'customer']),
    status: z.enum(['active', 'invited', 'suspended', 'deleted']).optional(),
    fullName: z.string().optional(),
    teamId: z.string().uuid().nullable().optional(),
    resellerTeamId: z.string().uuid().nullable().optional()
  });
  const payload = schema.parse(req.body);
  const user = await createUser(payload, req.user!.id);
  res.status(201).json(user);
});

usersRouter.get('/roles/list', requireRoles(['admin']), async (_req, res) => {
  const roles = await listRoles();
  res.json(roles);
});

usersRouter.post('/roles', requireRoles(['admin']), async (req, res) => {
  const schema = z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    permissions: z.record(z.any()).optional()
  });
  const payload = schema.parse(req.body);
  const role = await createRole(payload.name, payload.description, payload.permissions ?? {});
  res.status(201).json(role);
});

usersRouter.get('/teams/list', async (req, res) => {
  const type = req.query.type as string | undefined;
  const teams = await listTeams(type);
  res.json(teams);
});

usersRouter.post('/teams', requireRoles(['admin']), async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    type: z.enum(['seller', 'reseller']),
    parentTeamId: z.string().uuid().nullable().optional()
  });
  const payload = schema.parse(req.body);
  const team = await createTeam(payload.name, payload.type, payload.parentTeamId ?? null);
  res.status(201).json(team);
});

usersRouter.get('/:id', async (req, res) => {
  const user = await getUser(req.params.id);
  res.json(user);
});

usersRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    email: z.string().email().optional(),
    role: z.enum(['admin', 'seller', 'reseller', 'customer']).optional(),
    status: z.enum(['active', 'invited', 'suspended', 'deleted']).optional(),
    fullName: z.string().nullable().optional(),
    teamId: z.string().uuid().nullable().optional(),
    resellerTeamId: z.string().uuid().nullable().optional()
  });
  const payload = schema.parse(req.body);
  const updated = await updateUser(req.params.id, payload, req.user!.id);
  res.json(updated);
});

usersRouter.delete('/:id', requireRoles(['admin']), async (req, res) => {
  await deleteUser(req.params.id, req.user!.id);
  res.status(204).send();
});

usersRouter.post('/:id/reset-password', requireRoles(['admin']), async (req, res) => {
  const result = await resetUserPassword(req.params.id, req.user!.id);
  res.json(result);
});

usersRouter.use((_req, _res, next) => {
  next(new HttpError(404, 'USERS_ROUTE_NOT_FOUND', 'Route not found'));
});
